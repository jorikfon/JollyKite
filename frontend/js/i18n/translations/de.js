/**
 * Deutsche Übersetzungen für JollyKite
 */
export default {
  // Allgemein
  app: {
    title: 'Pak Nam Pran Kitesurfen - Windvorhersage 🏄‍♂️',
    description: 'Windvorhersage und Kitesurfing-Bedingungen für Pak Nam Pran, Thailand. Live-Winddaten, Sicherheitsinfos und Wetter für Kitesurfer.',
    subtitle: 'Winddaten in Echtzeit',
    loading: 'Lädt...',
    error: 'Fehler',
    retry: 'Wiederholen',
    footer: '© 2025 Pak Nam Pran. Mit ❤️ für Kitesurfer gemacht',
  },

  // Einstellungsmenü
  menu: {
    title: 'Einstellungen',
    language: 'Sprache',
    units: 'Windgeschwindigkeit Einheiten',
    notifications: 'Benachrichtigungen',
    riderPreferences: 'Fahrer-Einstellungen',
    boardType: 'Board-Typ',
    twintip: 'Twintip',
    hydrofoil: 'Hydrofoil',
    riderWeight: 'Fahrergewicht (kg)',
    weightHint: 'Wird zur Berechnung der optimalen Kitegröße verwendet',
    close: 'Schließen',
  },

  // Einheiten
  units: {
    knots: 'Knoten',
    metersPerSecond: 'Meter pro Sekunde',
    knotsShort: 'kn',
    msShort: 'm/s',
  },

  // Windrichtungen
  wind: {
    directions: {
      N: 'N',
      NE: 'NO',
      E: 'O',
      SE: 'SO',
      S: 'S',
      SW: 'SW',
      W: 'W',
      NW: 'NW',
    },
    categories: {
      calm: {
        title: 'Windstille',
        subtitle: 'Kein Wind',
      },
      light: {
        title: 'Leichter Wind',
        subtitle: 'Gut für Anfänger',
      },
      moderate: {
        title: 'Mäßiger Wind',
        subtitle: 'Perfekte Bedingungen!',
      },
      strong: {
        title: 'Starker Wind',
        subtitle: 'Für erfahrene Fahrer',
      },
      extreme: {
        title: 'Extremer Wind',
        subtitle: 'Gefährlich!',
      },
    },
    safety: {
      veryWeak: 'Sehr schwacher Wind',
      weak: 'Schwacher Wind',
      moderate: 'Mäßig',
      good: 'Gute Bedingungen',
      excellent: 'Perfekte Bedingungen!',
      dangerous: 'Gefährlich!',
    },
  },

  // Trends
  trends: {
    loading: 'Lädt...',
    noData: 'Keine Daten',
    stable: 'Stabil',
    increasing: 'Zunehmend',
    decreasing: 'Abnehmend',
    veryStable: 'Sehr stabil',
    slightlyIncreasing: 'Leicht zunehmend',
    slightlyDecreasing: 'Leicht abnehmend',
    for30min: 'über 30 Min',
    accumulatingData: 'Daten sammeln...',
    strengthening: 'Verstärkend',
    weakening: 'Schwächend',
    directionStable: 'Richtung stabil',
    directionVariable: 'Richtung wechselnd',
    directionChanging: 'Richtung ändert sich',
  },

  // Benachrichtigungen
  notifications: {
    subscribe: 'Windwarnungen abonnieren',
    unsubscribe: 'Warnungen abbestellen',
    notSupported: 'Benachrichtigungen nicht unterstützt',
    blocked: 'Benachrichtigungen blockiert',
    subscribed: 'Sie sind abonniert',
    notSubscribed: 'Nicht abonniert',
    enable: 'Benachrichtigungen aktivieren',
    disable: 'Benachrichtigungen deaktivieren',
    description: 'Erhalten Sie eine Benachrichtigung, wenn der Wind konstant über 10 Knoten bleibt (maximal einmal pro Tag)',
  },

  // Vorhersage
  forecast: {
    title: '3-Tage-Windvorhersage',
    today: 'Heute',
    tomorrow: 'Morgen',
    dayAfterTomorrow: 'Übermorgen',
    hours: 'Stunden',
    wind: 'Wind',
    waves: 'Wellen',
    rain: 'Regen',
    maxWind: 'Max. Wind',
    avgWind: 'Durchschn. Wind',
    noData: 'Keine Vorhersagedaten',
  },

  // Verlauf
  history: {
    todayTimeline: 'Heutiger Windverlauf',
    weekHistory: '7-Tage-Windverlauf',
    noData: 'Keine historischen Daten',
    average: 'Durchschnitt',
    maximum: 'Maximum',
    minimum: 'Minimum',
    actual: 'Tatsächlich',
    forecast: 'Vorhersage',
    loadingError: 'Ladefehler',
  },

  // Kite-Empfehlungen
  kite: {
    recommendation: 'Kite-Größen-Empfehlung',
    recommendationHint: '💡 Zahlen zeigen das empfohlene Fahrergewicht für aktuelle Bedingungen',
    size: 'Größe',
    rider: 'Fahrer',
    optimal: 'Perfekt!',
    good: 'Gut',
    acceptable: 'Akzeptabel',
    tooSmall: 'Zu klein',
    tooLarge: 'Zu groß',
    tooLight: 'Leichter Wind',
    tooStrong: 'Starker Wind',
    tooWeak: 'Zu schwacher Wind',
    none: 'Nicht geeignet',
    kg: 'kg',
    optimalChoice: 'Optimal',
    // Windbasierte Empfehlungen
    veryWeak: '🏖️ Zu schwacher Wind zum Kitesurfen',
    lightWind: '💨 Leichter Wind - großer Kite nötig (14-17m)',
    goodConditions: '✨ Gute Bedingungen - mittlerer Kite (11-14m)',
    excellentConditions: '🔥 Ausgezeichnete Bedingungen - kleiner Kite (9-12m)',
    strongWind: '💪 Starker Wind - kleiner Kite (8-9m)',
    veryStrong: '⚠️ Sehr starker Wind - für Erfahrene!',
  },

  // Windinformationen
  info: {
    currentWind: 'Aktueller Wind',
    speed: 'Geschwindigkeit',
    direction: 'Richtung',
    gust: 'Böen',
    maxGust: 'Max heute',
    trend: 'Trend',
    lastUpdate: 'Letztes Update',
    live: 'Live',
    ago: 'vor',
    secondsAgo: 's her',
    minutesAgo: 'm her',
    at: 'um',
    stationOffline: 'Station Offline',
    offlineNoticeText: 'Winddaten werden nur von <strong>6:00 bis 19:00</strong> (thailändische Zeit) gesammelt.<br>Bitte kommen Sie während der Arbeitszeiten zurück.',
    offshore: 'Ablandig',
    onshore: 'Auflandig',
    sideshore: 'Seitlich',
    dangerOffshore: '⚠️ GEFAHR • Ablandig',
  },

  // Wochentage
  days: {
    monday: 'Montag',
    tuesday: 'Dienstag',
    wednesday: 'Mittwoch',
    thursday: 'Donnerstag',
    friday: 'Freitag',
    saturday: 'Samstag',
    sunday: 'Sonntag',
    mon: 'Mo',
    tue: 'Di',
    wed: 'Mi',
    thu: 'Do',
    fri: 'Fr',
    sat: 'Sa',
    sun: 'So',
  },

  // Monate
  months: {
    january: 'Januar',
    february: 'Februar',
    march: 'März',
    april: 'April',
    may: 'Mai',
    june: 'Juni',
    july: 'Juli',
    august: 'August',
    september: 'September',
    october: 'Oktober',
    november: 'November',
    december: 'Dezember',
  },

  // Öffnungszeiten
  workingHours: {
    title: 'Öffnungszeiten',
    open: 'Geöffnet',
    closed: 'Geschlossen',
    opensAt: 'Öffnet um',
    closesAt: 'Schließt um',
  },
};
