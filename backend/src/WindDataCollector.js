/**
 * WindDataCollector - collects wind data from multiple weather stations
 * and archives hourly aggregated data per station
 */
export class WindDataCollector {
  constructor(config, dbManager, archiveManager) {
    this.config = config;
    this.dbManager = dbManager;
    this.archiveManager = archiveManager;
    this.stations = config.stations || [];
    this.primaryStationId = this.stations.find(s => s.isPrimary)?.id || 'pak_nam_pran';
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
   * Fetch wind data from Weathercloud station
   */
  async fetchFromWeathercloud(station) {
    try {
      const response = await fetch(station.url, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        console.warn(`Station ${station.id} returned ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (!data.wspd && data.wspd !== 0) return null;

      const msToKnots = 1.94384;
      return {
        timestamp: new Date(data.epoch * 1000).toISOString(),
        windSpeedKnots: data.wspd * msToKnots,
        windGustKnots: data.wspdhi ? data.wspdhi * msToKnots : null,
        maxGustKnots: data.wspdhi ? data.wspdhi * msToKnots : null,
        windDir: data.wdir || 0,
        windDirAvg: data.wdiravg || null,
        temperature: null,
        humidity: null,
        pressure: data.bar || null
      };
    } catch (error) {
      console.warn(`Station ${station.id} error:`, error.message);
      return null;
    }
  }

  /**
   * Collect and store wind data from all stations
   * Returns primary station data for backward compatibility (SSE, notifications)
   */
  async collectWindData() {
    console.log(`📡 Fetching data from ${this.stations.length} station(s)...`);

    const results = await Promise.allSettled(
      this.stations.map(station =>
        station.type === 'weathercloud'
          ? this.fetchFromWeathercloud(station)
          : this.fetchFromStation(station.url)
      )
    );

    let primaryData = null;
    let successCount = 0;

    for (let i = 0; i < results.length; i++) {
      const station = this.stations[i];
      if (results[i].status === 'fulfilled' && results[i].value) {
        const data = results[i].value;
        await this.dbManager.insertWindData(data, station.id);
        successCount++;
        if (station.isPrimary) primaryData = data;
      } else {
        const reason = results[i].status === 'rejected' ? results[i].reason?.message : 'no data';
        console.warn(`  ⚠ ${station.id}: ${reason}`);
      }
    }

    console.log(`✓ Got data from ${successCount}/${this.stations.length} station(s)`);

    if (successCount === 0) {
      throw new Error('No data from any weather station');
    }

    return primaryData;
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
   * Aggregate raw measurement rows into hourly summary
   */
  _aggregateHourlyData(hourlyData) {
    const speeds = hourlyData.map(d => d.wind_speed_knots);
    const gusts = hourlyData.map(d => d.wind_gust_knots).filter(g => g !== null);
    const directions = hourlyData.map(d => d.wind_direction);
    const temperatures = hourlyData.map(d => d.temperature).filter(t => t !== null);
    const humidities = hourlyData.map(d => d.humidity).filter(h => h !== null);
    const pressures = hourlyData.map(d => d.pressure).filter(p => p !== null);

    return {
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
  }

  /**
   * Archive hourly aggregated data for all stations
   */
  async archiveHourlyData() {
    try {
      // Get hour timestamp (start of the hour)
      const lastHour = new Date();
      lastHour.setHours(lastHour.getHours() - 1);
      lastHour.setMinutes(0, 0, 0);
      const hourTimestamp = lastHour.toISOString();

      let archivedCount = 0;

      for (const station of this.stations) {
        const hourlyData = await this.dbManager.getDataForArchiving(station.id);

        if (hourlyData.length === 0) {
          continue;
        }

        const aggregatedData = this._aggregateHourlyData(hourlyData);
        await this.archiveManager.archiveHourlyData(hourTimestamp, aggregatedData, station.id);
        archivedCount++;

        console.log(`  ✓ ${station.id}: ${aggregatedData.avgWindSpeed.toFixed(1)} kn avg, ${aggregatedData.measurementCount} measurements`);
      }

      if (archivedCount === 0) {
        console.log('No data to archive for the last hour');
        return null;
      }

      console.log(`✓ Archived data for ${archivedCount} station(s), hour: ${hourTimestamp}`);
      return { archivedStations: archivedCount, hourTimestamp };
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
