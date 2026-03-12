/**
 * Русские переводы для JollyKite
 */
export default {
  // Общее
  app: {
    title: 'Пак Нам Пран Кайтсерфинг - Прогноз ветра 🏄‍♂️',
    description: 'Прогноз ветра и условия для кайтсерфинга в Пак Нам Пран, Таиланд. Живые данные о ветре, безопасности и погоде для кайтеров.',
    subtitle: 'Данные о ветре в реальном времени',
    loading: 'Загрузка...',
    error: 'Ошибка',
    retry: 'Повторить',
    footer: '© 2025 Пак Нам Пран. Создано с ❤️ для кайтсерферов',
  },

  // Меню настроек
  menu: {
    title: 'Настройки',
    language: 'Язык',
    units: 'Единицы скорости ветра',
    notifications: 'Уведомления',
    riderPreferences: 'Настройки райдера',
    boardType: 'Тип доски',
    twintip: 'Твинтип',
    hydrofoil: 'Кайт Фойл',
    wingfoil: 'Винг Фойл',
    riderWeight: 'Вес райдера (кг)',
    weightHint: 'Используется для расчета оптимального размера кайта',
    close: 'Закрыть',
  },

  // Единицы измерения
  units: {
    knots: 'Узлы',
    metersPerSecond: 'Метры в секунду',
    knotsShort: 'уз',
    msShort: 'м/с',
  },

  // Направления ветра
  wind: {
    directions: {
      N: 'С',
      NE: 'СВ',
      E: 'В',
      SE: 'ЮВ',
      S: 'Ю',
      SW: 'ЮЗ',
      W: 'З',
      NW: 'СЗ',
    },
    categories: {
      calm: {
        title: 'Штиль',
        subtitle: 'Нет ветра',
      },
      light: {
        title: 'Легкий ветер',
        subtitle: 'Подходит для новичков',
      },
      moderate: {
        title: 'Умеренный ветер',
        subtitle: 'Идеальные условия!',
      },
      strong: {
        title: 'Сильный ветер',
        subtitle: 'Для опытных райдеров',
      },
      extreme: {
        title: 'Экстремальный ветер',
        subtitle: 'Опасно!',
      },
    },
    safety: {
      veryWeak: 'Очень слабый ветер',
      weak: 'Слабый ветер',
      moderate: 'Умеренный',
      good: 'Хорошие условия',
      excellent: 'Отличные условия!',
      dangerous: 'Опасно!',
    },
  },

  // Тренды
  trends: {
    loading: 'Загрузка...',
    noData: 'Нет данных',
    stable: 'Стабильный',
    increasing: 'Усиливается',
    decreasing: 'Ослабевает',
    veryStable: 'Очень стабильный',
    slightlyIncreasing: 'Слегка усиливается',
    slightlyDecreasing: 'Слегка ослабевает',
    for30min: 'за 30 мин',
    accumulatingData: 'Накапливаем данные...',
    strengthening: 'Раздувает',
    weakening: 'Затихает',
    directionStable: 'Направление стабильное',
    directionVariable: 'Направление переменное',
    directionChanging: 'Направление меняется',
  },

  // Уведомления
  notifications: {
    subscribe: 'Подписаться на уведомления о ветре',
    unsubscribe: 'Отписаться от уведомлений',
    notSupported: 'Уведомления не поддерживаются',
    blocked: 'Уведомления заблокированы',
    subscribed: 'Вы подписаны на уведомления',
    notSubscribed: 'Не подписаны',
    enable: 'Включить уведомления',
    disable: 'Выключить уведомления',
    description: 'Получайте уведомление когда ветер устойчиво держится выше 10 узлов в течение 20 минут (не чаще 1 раза в день)',
  },

  // Прогноз
  forecast: {
    title: 'Прогноз ветра на 3 дня',
    today: 'Сегодня',
    tomorrow: 'Завтра',
    dayAfterTomorrow: 'Послезавтра',
    hours: 'Часы',
    wind: 'Ветер',
    waves: 'Волны',
    rain: 'Дождь',
    maxWind: 'Макс. ветер',
    avgWind: 'Средний ветер',
    noData: 'Нет данных прогноза',
  },

  // История
  history: {
    todayTimeline: 'График ветра сегодня',
    weekHistory: 'История ветра за 7 дней',
    noData: 'Нет исторических данных',
    average: 'Среднее',
    maximum: 'Максимум',
    minimum: 'Минимум',
    actual: 'Факт',
    forecast: 'Прогноз',
    loadingError: 'Ошибка загрузки',
  },

  // Рекомендации по кайту
  kite: {
    recommendation: 'Рекомендация размера',
    recommendationHint: '💡 Цифры показывают рекомендуемый вес райдера для текущих условий',
    size: 'Размер',
    rider: 'Райдер',
    optimal: 'Отлично!',
    good: 'Хорошо',
    acceptable: 'Подойдёт',
    tooSmall: 'Маловат',
    tooLarge: 'Великоват',
    tooLight: 'Слабый ветер',
    tooStrong: 'Сильный ветер',
    tooWeak: 'Слишком слабый ветер',
    none: 'Не подходит',
    kg: 'кг',
    optimalChoice: 'Оптимально',
    // Рекомендации по ветру
    veryWeak: '🏖️ Слишком слабый ветер для кайтсёрфинга',
    lightWind: '💨 Слабый ветер - нужен большой кайт (14-17м)',
    goodConditions: '✨ Хорошие условия - средний кайт (11-14м)',
    excellentConditions: '🔥 Отличные условия - маленький кайт (9-12м)',
    strongWind: '💪 Сильный ветер - малый кайт (8-9м)',
    veryStrong: '⚠️ Очень сильный ветер - для опытных!',
  },

  // Информация о ветре
  info: {
    currentWind: 'Текущий ветер',
    speed: 'Скорость',
    direction: 'Направление',
    gust: 'Порывы',
    maxGust: 'Макс сегодня',
    trend: 'Тренд',
    lastUpdate: 'Обновлено',
    live: 'Онлайн',
    ago: 'назад',
    secondsAgo: 'с назад',
    minutesAgo: 'м назад',
    at: 'в',
    stationOffline: 'Станция не работает',
    offlineNoticeText: 'Данные о ветре собираются только с <strong>6:00 до 19:00</strong> (время Таиланда).<br>Пожалуйста, вернитесь в рабочее время для получения актуальных данных.',
    offshore: 'Отжим',
    onshore: 'Прижим',
    sideshore: 'Боковой',
    dangerOffshore: '⚠️ ОПАСНО • Отжим',
  },

  // Дни недели
  days: {
    monday: 'Понедельник',
    tuesday: 'Вторник',
    wednesday: 'Среда',
    thursday: 'Четверг',
    friday: 'Пятница',
    saturday: 'Суббота',
    sunday: 'Воскресенье',
    mon: 'Пн',
    tue: 'Вт',
    wed: 'Ср',
    thu: 'Чт',
    fri: 'Пт',
    sat: 'Сб',
    sun: 'Вс',
  },

  // Месяцы
  months: {
    january: 'Январь',
    february: 'Февраль',
    march: 'Март',
    april: 'Апрель',
    may: 'Май',
    june: 'Июнь',
    july: 'Июль',
    august: 'Август',
    september: 'Сентябрь',
    october: 'Октябрь',
    november: 'Ноябрь',
    december: 'Декабрь',
  },

  // Рабочие часы
  workingHours: {
    title: 'Рабочие часы',
    open: 'Открыто',
    closed: 'Закрыто',
    opensAt: 'Откроется в',
    closesAt: 'Закроется в',
  },
};
