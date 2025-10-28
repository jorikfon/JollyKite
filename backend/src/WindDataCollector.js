/**
 * WindDataCollector - collects wind data from Ambient Weather API
 * and archives hourly aggregated data
 */
export class WindDataCollector {
  constructor(config, dbManager, archiveManager) {
    this.config = config;
    this.dbManager = dbManager;
    this.archiveManager = archiveManager;
  }

  /**
   * Convert MPH to knots
   */
  mphToKnots(mph) {
    return mph * 0.868976;
  }

  /**
   * Fetch wind data from a single station
   */
  async fetchFromStation(apiUrl) {
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://jollykite.com/'
        }
      });

      if (!response.ok) {
        console.warn(`Station ${apiUrl} returned ${response.status}`);
        return null;
      }

      const result = await response.json();

      if (result.data && result.data.length > 0) {
        const device = result.data[0];
        const lastData = device.lastData;

        return {
          timestamp: new Date(lastData.dateutc).toISOString(),
          windSpeedKnots: this.mphToKnots(lastData.windspeedmph || 0),
          windGustKnots: this.mphToKnots(lastData.windgustmph || 0),
          maxGustKnots: this.mphToKnots(lastData.maxdailygust || 0),
          windDir: lastData.winddir || 0,
          windDirAvg: lastData.winddir_avg10m || 0,
          temperature: lastData.tempf || 0,
          humidity: lastData.humidity || 0,
          pressure: lastData.baromrelin || 0
        };
      }

      return null;
    } catch (error) {
      console.warn(`Station ${apiUrl} error:`, error.message);
      return null;
    }
  }

  /**
   * Average wind data from multiple stations
   */
  averageStationData(dataArray) {
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

    // Use most recent timestamp
    const latestTimestamp = dataArray.reduce((latest, data) => {
      return new Date(data.timestamp) > new Date(latest) ? data.timestamp : latest;
    }, dataArray[0].timestamp);

    return {
      timestamp: latestTimestamp,
      windSpeedKnots: avg(dataArray.map(d => d.windSpeedKnots)),
      windGustKnots: Math.max(...dataArray.map(d => d.windGustKnots)),
      maxGustKnots: Math.max(...dataArray.map(d => d.maxGustKnots)),
      windDir: this.calculateDominantDirection(dataArray.map(d => d.windDir)),
      windDirAvg: this.calculateDominantDirection(dataArray.map(d => d.windDirAvg)),
      temperature: avg(dataArray.map(d => d.temperature || 0)),
      humidity: avg(dataArray.map(d => d.humidity || 0)),
      pressure: avg(dataArray.map(d => d.pressure || 0))
    };
  }

  /**
   * Fetch current wind data from Ambient Weather API
   * Supports multiple stations (comma-separated URLs in config)
   */
  async fetchWindData() {
    try {
      // Parse station URLs from config (comma-separated)
      const stationUrls = this.config.ambientWeatherApi.split(',').map(url => url.trim());

      console.log(`📡 Fetching data from ${stationUrls.length} station(s)...`);

      // Fetch from all stations in parallel
      const results = await Promise.all(
        stationUrls.map(url => this.fetchFromStation(url))
      );

      // Filter out failed stations
      const validResults = results.filter(r => r !== null);

      if (validResults.length === 0) {
        throw new Error('No data from any weather station');
      }

      console.log(`✓ Got data from ${validResults.length}/${stationUrls.length} station(s)`);

      // If only one station, return its data
      if (validResults.length === 1) {
        return validResults[0];
      }

      // Average data from multiple stations
      return this.averageStationData(validResults);
    } catch (error) {
      console.error('Error fetching wind data:', error.message);
      throw error;
    }
  }

  /**
   * Collect and store wind data
   */
  async collectWindData() {
    try {
      const windData = await this.fetchWindData();
      this.dbManager.insertWindData(windData);
      return windData;
    } catch (error) {
      console.error('Error collecting wind data:', error.message);
      throw error;
    }
  }

  /**
   * Calculate dominant wind direction from array of directions
   */
  calculateDominantDirection(directions) {
    if (!directions || directions.length === 0) return null;

    // Convert directions to unit vectors and average
    let sumX = 0;
    let sumY = 0;

    directions.forEach(dir => {
      const rad = (dir * Math.PI) / 180;
      sumX += Math.cos(rad);
      sumY += Math.sin(rad);
    });

    const avgX = sumX / directions.length;
    const avgY = sumY / directions.length;

    // Convert back to degrees
    let avgDir = (Math.atan2(avgY, avgX) * 180) / Math.PI;
    if (avgDir < 0) avgDir += 360;

    return Math.round(avgDir);
  }

  /**
   * Archive hourly aggregated data
   */
  async archiveHourlyData() {
    try {
      const hourlyData = this.dbManager.getDataForArchiving();

      if (hourlyData.length === 0) {
        console.log('No data to archive for the last hour');
        return null;
      }

      // Calculate aggregates
      const speeds = hourlyData.map(d => d.wind_speed_knots);
      const gusts = hourlyData.map(d => d.wind_gust_knots).filter(g => g !== null);
      const directions = hourlyData.map(d => d.wind_direction);
      const temperatures = hourlyData.map(d => d.temperature).filter(t => t !== null);
      const humidities = hourlyData.map(d => d.humidity).filter(h => h !== null);
      const pressures = hourlyData.map(d => d.pressure).filter(p => p !== null);

      const aggregatedData = {
        avgWindSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
        minWindSpeed: Math.min(...speeds),
        maxWindSpeed: Math.max(...speeds),
        avgWindGust: gusts.length > 0 ? gusts.reduce((a, b) => a + b, 0) / gusts.length : null,
        maxWindGust: gusts.length > 0 ? Math.max(...gusts) : null,
        avgWindDirection: directions.reduce((a, b) => a + b, 0) / directions.length,
        dominantWindDirection: this.calculateDominantDirection(directions),
        avgTemperature: temperatures.length > 0 ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length : null,
        avgHumidity: humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : null,
        avgPressure: pressures.length > 0 ? pressures.reduce((a, b) => a + b, 0) / pressures.length : null,
        measurementCount: hourlyData.length
      };

      // Get hour timestamp (start of the hour)
      const lastHour = new Date();
      lastHour.setHours(lastHour.getHours() - 1);
      lastHour.setMinutes(0, 0, 0);
      const hourTimestamp = lastHour.toISOString();

      // Archive the data
      this.archiveManager.archiveHourlyData(hourTimestamp, aggregatedData);

      console.log(`✓ Archived data for hour: ${hourTimestamp}`);
      console.log(`  Average wind: ${aggregatedData.avgWindSpeed.toFixed(1)} knots`);
      console.log(`  Measurements: ${aggregatedData.measurementCount}`);

      return aggregatedData;
    } catch (error) {
      console.error('Error archiving hourly data:', error.message);
      throw error;
    }
  }

  /**
   * Calculate wind safety based on direction and speed
   * @param {number} direction - Wind direction in degrees
   * @param {number} speed - Wind speed in knots
   * @returns {Object} Safety information
   */
  getWindSafety(direction, speed) {
    const dir = parseInt(direction);
    const knots = parseFloat(speed) || 0;

    // Wind direction ranges (degrees)
    const offshore = { min: 225, max: 315 }; // SW-NW dangerous (blowing from land to sea)
    const onshore = { min: 45, max: 135 };   // NE-SE safe (blowing from sea to land)

    // Wind speed thresholds (knots)
    const speeds = {
      veryLow: 5,
      low: 8,
      moderate: 12,
      good: 15,
      strong: 20,
      veryStrong: 25,
      extreme: 30
    };

    // Safety levels
    const levels = {
      low: { level: 'low', text: 'Слабый ветер', color: '#87CEEB' },
      danger: { level: 'danger', text: 'Опасно!', color: '#FF4500' },
      high: { level: 'high', text: 'Отличные условия!', color: '#00FF00' },
      good: { level: 'good', text: 'Хорошие условия', color: '#FFD700' },
      medium: { level: 'medium', text: 'Умеренно', color: '#FFA500' }
    };

    // Determine wind type relative to shore
    const isOffshore = (dir >= offshore.min && dir <= offshore.max);
    const isOnshore = (dir >= onshore.min && dir <= onshore.max);

    let safety = { ...levels.medium }; // Default to medium

    // Evaluate safety based on speed and direction
    if (knots < speeds.veryLow) {
      safety = { ...levels.low };
    } else if (isOffshore || knots > speeds.extreme) {
      safety = { ...levels.danger };
    } else if (isOnshore && knots >= speeds.moderate && knots <= speeds.veryStrong) {
      safety = { ...levels.high };
    } else if (isOnshore && knots >= speeds.veryLow && knots < speeds.moderate) {
      safety = { ...levels.good };
      safety.text = 'Безопасно';
    } else if (knots >= speeds.low && knots <= speeds.good) {
      safety = { ...levels.good };
    }

    // Add wind type information
    let windType = 'sideshore';
    let windTypeRu = 'Боковой';

    if (isOffshore) {
      windType = 'offshore';
      windTypeRu = 'Отжим';
    } else if (isOnshore) {
      windType = 'onshore';
      windTypeRu = 'Прижим';
    }

    return {
      ...safety,
      isOffshore,
      isOnshore,
      windSpeed: knots,
      windDirection: dir,
      windType,
      windTypeRu
    };
  }
}
