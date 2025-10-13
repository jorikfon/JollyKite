// JollyKite Service Worker
const CACHE_NAME = 'jollykite-v1.1.8';
const API_CACHE_NAME = 'jollykite-api-v1.1.8';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах

// Ресурсы для кэширования при установке
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
  'https://cdn.tailwindcss.com/',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Dancing+Script:wght@700&family=Pacifico&display=swap'
];

// API endpoints для кэширования
const API_ENDPOINTS = [
  'https://lightning.ambientweather.net/devices?public.slug=e63ff0d2119b8c024b5aad24cc59a504',
  'https://api.open-meteo.com/v1/forecast'
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

// Проверка, является ли запрос API
function isApiRequest(url) {
  return url.hostname.includes('lightning.ambientweather.net') ||
         url.hostname.includes('api.open-meteo.com');
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

// Функция фонового обновления данных о погоде
async function updateWeatherData() {
  console.log('[SW] Background sync: updating weather data');
  try {
    const responses = await Promise.all([
      fetch('https://lightning.ambientweather.net/devices?public.slug=e63ff0d2119b8c024b5aad24cc59a504'),
      fetch('https://api.open-meteo.com/v1/forecast?latitude=12.346596280786017&longitude=99.99817902532192&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=Asia/Bangkok&forecast_days=3')
    ]);
    
    console.log('[SW] Background weather data updated successfully');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notifications (для будущих обновлений)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: data.url,
      actions: [
        {
          action: 'view',
          title: 'Посмотреть',
          icon: '/icons/icon-96x96.png'
        },
        {
          action: 'close',
          title: 'Закрыть',
          icon: '/icons/icon-96x96.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
});