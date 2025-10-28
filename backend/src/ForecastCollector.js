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
  async fetchWindForecast() {
    const [lat, lon] = this.spotLocation;
    const timezone = 'Asia/Bangkok';
    const daysToShow = 3;

    try {
      // Fetch wind forecast
      const windUrl = `${this.forecastApiUrl}?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=${timezone}&forecast_days=${daysToShow}`;

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
    const hourInterval = 2;
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
}
