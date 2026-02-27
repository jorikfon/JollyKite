/**
 * ForecastCollector - fetches wind forecast from Open-Meteo API
 */
export class ForecastCollector {
  constructor(config) {
    this.config = config;
    this.forecastApiUrl = config.openMeteoApi;
    this.marineApiUrl = 'https://marine-api.open-meteo.com/v1/marine';
    this.spotLocation = [12.346596280786017, 99.99817902532192];
  }

  /**
   * Convert km/h to knots
   */
  kmhToKnots(kmh) {
    return kmh * 0.539957;
  }

  /**
   * Fetch wind forecast from Open-Meteo
   */
  async fetchWindForecast(baseUrl = null) {
    const [lat, lon] = this.spotLocation;
    const timezone = 'Asia/Bangkok';
    const daysToShow = 3;
    const apiBase = baseUrl || this.forecastApiUrl;

    try {
      // Fetch wind forecast with precipitation probability
      const windUrl = `${apiBase}?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability&timezone=${timezone}&forecast_days=${daysToShow}`;

      console.log(`📡 Fetching wind forecast from Open-Meteo...`);
      const windController = new AbortController();
      const windTimeout = setTimeout(() => windController.abort(), 30000); // 30 second timeout

      const windResponse = await fetch(windUrl, {
        signal: windController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://jollykite.com/'
        }
      });
      clearTimeout(windTimeout);

      if (!windResponse.ok) {
        throw new Error(`Wind forecast API returned ${windResponse.status}`);
      }

      const windData = await windResponse.json();

      // Fetch marine forecast (waves)
      const marineUrl = `${this.marineApiUrl}?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_direction,wave_period&timezone=${timezone}&forecast_days=${daysToShow}`;

      console.log(`🌊 Fetching marine forecast...`);
      const marineController = new AbortController();
      const marineTimeout = setTimeout(() => marineController.abort(), 30000); // 30 second timeout

      const marineResponse = await fetch(marineUrl, {
        signal: marineController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://jollykite.com/'
        }
      });
      clearTimeout(marineTimeout);

      let marineData = null;
      if (marineResponse.ok) {
        marineData = await marineResponse.json();
      } else {
        console.warn(`Marine forecast API returned ${marineResponse.status}`);
      }

      if (windData && windData.hourly) {
        const processedData = this.processForecastData(windData, marineData);
        console.log(`✓ Processed ${processedData.length} forecast hours`);
        return processedData;
      }

      throw new Error('Invalid forecast data received');
    } catch (error) {
      console.error('Error fetching wind forecast:', error.message);
      throw error;
    }
  }

  /**
   * Process forecast data into the format expected by frontend
   */
  processForecastData(windData, marineData = null) {
    const hourly = windData.hourly;
    const marineHourly = marineData && marineData.hourly ? marineData.hourly : null;
    const hoursToShow = [];
    const startHour = 6;
    const endHour = 19;
    const hourInterval = 1;
    const daysToShow = 3;

    for (let day = 0; day < daysToShow; day++) {
      for (let hour = startHour; hour <= endHour; hour += hourInterval) {
        const hourIndex = day * 24 + hour;
        if (hourIndex < hourly.time.length) {
          const datetime = new Date(hourly.time[hourIndex]);
          const windSpeed = this.kmhToKnots(hourly.wind_speed_10m[hourIndex]);
          const windDir = hourly.wind_direction_10m[hourIndex];
          const windGust = this.kmhToKnots(hourly.wind_gusts_10m[hourIndex]);

          const hourData = {
            date: datetime.toISOString(),
            time: hour,
            speed: parseFloat(windSpeed.toFixed(1)),
            direction: Math.round(windDir),
            gust: parseFloat(windGust.toFixed(1))
          };

          // Add precipitation probability if available
          if (hourly.precipitation_probability && hourIndex < hourly.precipitation_probability.length) {
            hourData.precipitationProbability = hourly.precipitation_probability[hourIndex];
          }

          // Add wave data if available
          if (marineHourly && hourIndex < marineHourly.time.length) {
            hourData.waveHeight = marineHourly.wave_height[hourIndex];
            hourData.waveDirection = marineHourly.wave_direction[hourIndex];
            hourData.wavePeriod = marineHourly.wave_period[hourIndex];
          }

          hoursToShow.push(hourData);
        }
      }
    }

    console.log(`✓ Processed ${hoursToShow.length} forecast hours`);
    return hoursToShow;
  }

  /**
   * Calculate wind safety for forecast data
   */
  getWindSafety(direction, speed) {
    const dir = parseInt(direction);
    const knots = parseFloat(speed) || 0;

    const offshore = { min: 225, max: 315 };
    const onshore = { min: 45, max: 135 };

    const isOffshore = (dir >= offshore.min && dir <= offshore.max);
    const isOnshore = (dir >= onshore.min && dir <= onshore.max);

    let level = 'medium';
    let text = 'Умеренно';
    let color = '#FFA500';

    if (knots < 5) {
      level = 'low';
      text = 'Слабый ветер';
      color = '#87CEEB';
    } else if (isOffshore || knots > 30) {
      level = 'danger';
      text = 'Опасно!';
      color = '#FF4500';
    } else if (isOnshore && knots >= 12 && knots <= 25) {
      level = 'high';
      text = 'Отличные условия!';
      color = '#00FF00';
    } else if (knots >= 8 && knots <= 15) {
      level = 'good';
      text = 'Хорошие условия';
      color = '#FFD700';
    }

    return {
      level,
      text,
      color,
      isOffshore,
      isOnshore
    };
  }

  /**
   * Calculate correction factor by comparing actual data with forecast
   * @param {Array} actualData - Actual wind measurements from history
   * @param {Array} forecastData - Forecast data for the same period
   * @returns {number} Correction factor (actual/forecast ratio)
   */
  calculateCorrectionFactor(actualData, forecastData) {
    if (!actualData || !forecastData || actualData.length === 0 || forecastData.length === 0) {
      console.log('⚠️ Insufficient data for correction factor calculation');
      return 1.0; // No correction if not enough data
    }

    const comparisons = [];

    // Compare actual data with forecast for matching hours
    actualData.forEach(actual => {
      // Extract hour from actual data timestamp
      const actualDate = new Date(actual.time);
      const actualHour = actualDate.getHours();

      // Find corresponding forecast entry
      const forecast = forecastData.find(f => {
        const forecastDate = new Date(f.date);
        return forecastDate.getHours() === actualHour &&
               forecastDate.toDateString() === actualDate.toDateString();
      });

      if (forecast && forecast.speed > 0) {
        const ratio = actual.avg_speed / forecast.speed;
        // Only use reasonable ratios (0.5 to 2.0) to avoid outliers
        if (ratio >= 0.5 && ratio <= 2.0) {
          comparisons.push(ratio);
        }
      }
    });

    if (comparisons.length === 0) {
      console.log('⚠️ No matching data points for correction factor');
      return 1.0;
    }

    // Calculate average correction factor
    const avgFactor = comparisons.reduce((sum, val) => sum + val, 0) / comparisons.length;

    console.log(`✓ Correction factor: ${avgFactor.toFixed(2)} (based on ${comparisons.length} data points)`);

    return avgFactor;
  }

  /**
   * Get extrapolated forecast with correction factor applied
   * @param {Array} forecastData - Raw forecast data
   * @param {number} correctionFactor - Correction factor to apply
   * @returns {Array} Corrected forecast data
   */
  applyCorrection(forecastData, correctionFactor) {
    if (!forecastData || forecastData.length === 0) {
      return [];
    }

    return forecastData.map(item => ({
      ...item,
      speed: parseFloat((item.speed * correctionFactor).toFixed(1)),
      gust: parseFloat((item.gust * correctionFactor).toFixed(1)),
      corrected: true,
      correctionFactor: parseFloat(correctionFactor.toFixed(2))
    }));
  }
}
