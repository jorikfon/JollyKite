/**
 * English translations for JollyKite
 */
export default {
  // General
  app: {
    title: 'Pak Nam Pran Kitesurfing - Wind Forecast 🏄‍♂️',
    description: 'Wind forecast and kitesurfing conditions for Pak Nam Pran, Thailand. Live wind data, safety info and weather for kitesurfers.',
    subtitle: 'Real-time wind data',
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    footer: '© 2025 Pak Nam Pran. Made with ❤️ for kitesurfers',
  },

  // Settings menu
  menu: {
    title: 'Settings',
    language: 'Language',
    units: 'Wind Speed Units',
    notifications: 'Notifications',
    riderPreferences: 'Rider Settings',
    boardType: 'Board Type',
    twintip: 'Twintip',
    hydrofoil: 'Hydrofoil',
    riderWeight: 'Rider Weight (kg)',
    weightHint: 'Used to calculate optimal kite size',
    windDirOffset: 'Direction Calibration (°)',
    windDirOffsetHint: 'Wind direction offset for on-site calibration',
    close: 'Close',
  },

  // Units
  units: {
    knots: 'Knots',
    metersPerSecond: 'Meters per second',
    knotsShort: 'kn',
    msShort: 'm/s',
  },

  // Wind directions
  wind: {
    directions: {
      N: 'N',
      NE: 'NE',
      E: 'E',
      SE: 'SE',
      S: 'S',
      SW: 'SW',
      W: 'W',
      NW: 'NW',
    },
    categories: {
      calm: {
        title: 'Calm',
        subtitle: 'No wind',
      },
      light: {
        title: 'Light wind',
        subtitle: 'Good for beginners',
      },
      moderate: {
        title: 'Moderate wind',
        subtitle: 'Perfect conditions!',
      },
      strong: {
        title: 'Strong wind',
        subtitle: 'For experienced riders',
      },
      extreme: {
        title: 'Extreme wind',
        subtitle: 'Dangerous!',
      },
    },
    safety: {
      veryWeak: 'Very weak wind',
      weak: 'Weak wind',
      moderate: 'Moderate',
      good: 'Good conditions',
      excellent: 'Perfect conditions!',
      dangerous: 'Dangerous!',
    },
  },

  // Trends
  trends: {
    loading: 'Loading...',
    noData: 'No data',
    stable: 'Stable',
    increasing: 'Increasing',
    decreasing: 'Decreasing',
    veryStable: 'Very stable',
    slightlyIncreasing: 'Slightly increasing',
    slightlyDecreasing: 'Slightly decreasing',
    for30min: 'over 30 min',
    accumulatingData: 'Accumulating data...',
    strengthening: 'Strengthening',
    weakening: 'Weakening',
    directionStable: 'Direction stable',
    directionVariable: 'Direction variable',
    directionChanging: 'Direction changing',
  },

  // Notifications
  notifications: {
    subscribe: 'Subscribe to wind alerts',
    unsubscribe: 'Unsubscribe from alerts',
    notSupported: 'Notifications not supported',
    blocked: 'Notifications blocked',
    subscribed: 'You are subscribed',
    notSubscribed: 'Not subscribed',
    enable: 'Enable notifications',
    disable: 'Disable notifications',
    description: 'Get notified when wind is steady above 10 knots for 20 minutes (max once per day)',
  },

  // Forecast
  forecast: {
    title: '3-Day Wind Forecast',
    today: 'Today',
    tomorrow: 'Tomorrow',
    dayAfterTomorrow: 'Day after tomorrow',
    hours: 'Hours',
    wind: 'Wind',
    waves: 'Waves',
    rain: 'Rain',
    maxWind: 'Max wind',
    avgWind: 'Avg wind',
    noData: 'No forecast data',
  },

  // History
  history: {
    todayTimeline: "Today's Wind Timeline",
    weekHistory: '7-Day Wind History',
    noData: 'No historical data',
    average: 'Average',
    maximum: 'Maximum',
    minimum: 'Minimum',
    actual: 'Actual',
    forecast: 'Forecast',
    loadingError: 'Loading error',
  },

  // Kite recommendations
  kite: {
    recommendation: 'Kite Size Recommendation',
    recommendationHint: '💡 Numbers show recommended rider weight for current conditions',
    size: 'Size',
    rider: 'Rider',
    optimal: 'Perfect!',
    good: 'Good',
    acceptable: 'Acceptable',
    tooSmall: 'Too small',
    tooLarge: 'Too large',
    tooLight: 'Light wind',
    tooStrong: 'Strong wind',
    tooWeak: 'Too weak wind',
    none: 'Not suitable',
    kg: 'kg',
    optimalChoice: 'Optimal',
    // Wind-based recommendations
    veryWeak: '🏖️ Too weak wind for kitesurfing',
    lightWind: '💨 Light wind - need large kite (14-17m)',
    goodConditions: '✨ Good conditions - medium kite (11-14m)',
    excellentConditions: '🔥 Excellent conditions - small kite (9-12m)',
    strongWind: '💪 Strong wind - small kite (8-9m)',
    veryStrong: '⚠️ Very strong wind - for experienced riders!',
  },

  // Wind info
  info: {
    currentWind: 'Current Wind',
    speed: 'Speed',
    direction: 'Direction',
    gust: 'Gusts',
    maxGust: 'Max today',
    trend: 'Trend',
    lastUpdate: 'Last update',
    live: 'Live',
    ago: 'ago',
    secondsAgo: 's ago',
    minutesAgo: 'm ago',
    at: 'at',
    stationOffline: 'Station Offline',
    offlineNoticeText: 'Wind data is collected only from <strong>6:00 to 19:00</strong> (Thailand time).<br>Please return during working hours for current data.',
    offshore: 'Offshore',
    onshore: 'Onshore',
    sideshore: 'Sideshore',
    dangerOffshore: '⚠️ DANGER • Offshore',
  },

  // Days of week
  days: {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
  },

  // Months
  months: {
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
  },

  // Working hours
  workingHours: {
    title: 'Working Hours',
    open: 'Open',
    closed: 'Closed',
    opensAt: 'Opens at',
    closesAt: 'Closes at',
  },
};
