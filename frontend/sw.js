// JollyKite Service Worker
const CACHE_NAME = 'jollykite-v2.5.9';
const API_CACHE_NAME = 'jollykite-api-v2.5.9';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах

// Ресурсы для кэширования при установке
// Note: External CDN resources are NOT cached here due to CORS restrictions
// They will be cached on first access via handleStaticAsset
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/kiter.png',
  '/images/map-background.png',
  '/css/main.css',
  '/js/config.js',
  '/js/utils/WindUtils.js',
  '/js/App.js',
  '/js/WindDataManager.js',
  '/js/MapController.js',
  '/js/ForecastManager.js',
  '/js/WindArrowController.js',
  '/js/WindStatistics.js',
  '/js/HistoryManager.js',
  '/js/WindStreamManager.js',
  '/js/NotificationManager.js',
  '/js/KiteSizeRecommendation.js',
  '/js/TodayWindTimeline.js',
  '/js/WeekWindHistory.js',
  '/js/utils/KiteSizeCalculator.js',
  // i18n System
  '/js/i18n/I18nManager.js',
  '/js/i18n/translations/en.js',
  '/js/i18n/translations/ru.js',
  '/js/i18n/translations/de.js',
  '/js/i18n/translations/th.js',
  // Settings System
  '/js/settings/SettingsManager.js',
  '/js/settings/LocalStorageManager.js',
  '/js/settings/MenuController.js',
  // Utils
  '/js/utils/UnitConverter.js'
];

// API endpoints для кэширования (теперь все через backend)
const API_ENDPOINTS = [
  '/api/wind/current',
  '/api/wind/forecast',
  '/api/wind/trend'
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Обработка fetch запросов
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // НЕ кэшировать плитки карт - всегда загружать из сети
  if (isMapTile(url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // НЕ кэшировать SSE stream - всегда загружать из сети для real-time обновлений
  if (isSSERequest(url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Стратегия для API запросов - Network First with Cache Fallback
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Стратегия для статических ресурсов - Cache First
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(event.request));
    return;
  }

  // Стратегия для HTML - Network First with Cache Fallback
  if (isHTMLRequest(event.request)) {
    event.respondWith(handleHTMLRequest(event.request));
    return;
  }

  // По умолчанию - попытка из сети с fallback на кэш
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// Проверка, является ли запрос плиткой карты
function isMapTile(url) {
  return url.hostname.includes('tile.openstreetmap.org') ||
         url.hostname.includes('basemaps.cartocdn.com') ||
         url.pathname.match(/\/\d+\/\d+\/\d+(@2x)?\.(png|jpg)/);
}

// Проверка, является ли запрос SSE stream (Server-Sent Events)
function isSSERequest(url) {
  return url.pathname.includes('/stream');
}

// Проверка, является ли запрос API (теперь локальный backend API)
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

// Проверка, является ли ресурс статическим
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/);
}

// Проверка, является ли запрос HTML
function isHTMLRequest(request) {
  return request.headers.get('accept').includes('text/html');
}

// Обработка API запросов
async function handleApiRequest(request) {
  const url = request.url;
  
  try {
    // Попытка получить данные из сети
    const response = await fetch(request);
    
    if (response.ok) {
      // Кэшируем успешный ответ с временной меткой
      const cache = await caches.open(API_CACHE_NAME);
      const responseClone = response.clone();
      const responseWithTimestamp = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...Object.fromEntries(responseClone.headers.entries()),
          'sw-cached-at': Date.now().toString()
        }
      });
      
      await cache.put(request, responseWithTimestamp);
      console.log('[SW] API response cached:', url);
      return response;
    }
  } catch (error) {
    console.log('[SW] Network failed for API request:', url);
  }
  
  // Fallback на кэшированные данные
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    const cachedAt = cachedResponse.headers.get('sw-cached-at');
    const isExpired = cachedAt && (Date.now() - parseInt(cachedAt)) > CACHE_DURATION;
    
    if (!isExpired) {
      console.log('[SW] Serving cached API response:', url);
      return cachedResponse;
    } else {
      console.log('[SW] Cached API response expired:', url);
      await cache.delete(request);
    }
  }
  
  // Если нет кэша или он устарел, возвращаем офлайн ответ
  return new Response(JSON.stringify({
    offline: true,
    message: 'Данные недоступны офлайн',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Обработка статических ресурсов
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
  }
  
  return new Response('Asset not available offline', { status: 404 });
}

// Обработка HTML запросов
async function handleHTMLRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    console.log('[SW] Network failed for HTML request');
  }
  
  // Fallback на кэшированную версию
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fallback на главную страницу если ничего не найдено
  return caches.match('/');
}

// Обработка фоновых обновлений
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-weather') {
    event.waitUntil(updateWeatherData());
  }
});

// Функция фонового обновления данных о погоде (теперь через backend)
async function updateWeatherData() {
  console.log('[SW] Background sync: updating weather data');
  try {
    const responses = await Promise.all([
      fetch('/api/wind/current'),
      fetch('/api/wind/forecast')
    ]);

    console.log('[SW] Background weather data updated successfully');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Переводы для пуш-уведомлений
const NOTIFICATION_TRANSLATIONS = {
  en: {
    title: 'Pak Nam Pran - Wind is picking up! 🌬️',
    body: 'Great conditions for kitesurfing!',
    view: 'View',
    close: 'Close'
  },
  ru: {
    title: 'Пак Нам Пран - Ветер усиливается! 🌬️',
    body: 'Отличные условия для кайтсерфинга!',
    view: 'Посмотреть',
    close: 'Закрыть'
  },
  de: {
    title: 'Pak Nam Pran - Wind nimmt zu! 🌬️',
    body: 'Perfekte Bedingungen zum Kitesurfen!',
    view: 'Ansehen',
    close: 'Schließen'
  },
  th: {
    title: 'ปากน้ำปราณ - ลมกำลังแรงขึ้น! 🌬️',
    body: 'สภาพที่ยอดเยี่ยมสำหรับไคท์เซิร์ฟ!',
    view: 'ดู',
    close: 'ปิด'
  }
};

// Получить текущий язык из LocalStorage
async function getCurrentLocale() {
  try {
    // Пытаемся получить из IndexedDB или fallback на 'en'
    const cache = await caches.open('jollykite-settings');
    const response = await cache.match('/locale');
    if (response) {
      const locale = await response.text();
      return locale || 'en';
    }
  } catch (e) {
    console.log('[SW] Could not get locale, using default');
  }
  return 'en';
}

// Push notifications for wind conditions
self.addEventListener('push', async event => {
  console.log('[SW] Push notification received');

  if (event.data) {
    const data = event.data.json();
    const locale = await getCurrentLocale();
    const translations = NOTIFICATION_TRANSLATIONS[locale] || NOTIFICATION_TRANSLATIONS.en;

    const title = data.title || translations.title;
    const options = {
      body: data.body || data.message || translations.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'wind-alert',
      requireInteraction: true,
      data: {
        url: data.url || '/',
        windSpeed: data.windSpeed,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view',
          title: translations.view,
          icon: '/icons/icon-96x96.png'
        },
        {
          action: 'close',
          title: translations.close,
          icon: '/icons/icon-96x96.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', event => {
  event.notification.close();

  // Get URL from notification data
  const notificationData = event.notification.data || {};
  const url = notificationData.url || '/';

  if (event.action === 'view' || event.action === '' || !event.action) {
    // Handle both 'view' action and direct click on notification
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          // Check if there's already an open window
          for (const client of windowClients) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window if no existing window found
          return clients.openWindow(url);
        })
    );
  }
});

// Обработка сообщений от клиента (для перезагрузки при смене языка)
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING_AND_RELOAD') {
    console.log('[SW] Force reload requested, clearing caches...');

    // Очистка всех кешей для полной перезагрузки
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('[SW] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('[SW] All caches cleared, reloading clients...');
        // Уведомляем все клиенты о необходимости перезагрузки
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'RELOAD' });
          });
        });
      })
    );
  }
});