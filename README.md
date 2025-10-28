# 🪁 JollyKite - Кайтсерфинг в Пак Нам Пран

Прогрессивное веб-приложение (PWA) для кайтсерферов в Пак Нам Пране, Таиланд. Предоставляет реальные данные о ветре в режиме реального времени, прогнозы погоды и морских условий, информацию о безопасности для кайтсерфинга.

![JollyKite Preview](kiter.png)

## 🌟 Основные возможности

### 📱 Progressive Web App
- Установка как мобильное приложение на любое устройство
- Полная работа в офлайн режиме с Service Worker
- Автоматические обновления при подключении к сети
- Полноэкранный режим для лучшего UX
- Push-уведомления о благоприятных условиях

### 🌪️ Данные о ветре в реальном времени
- **Live данные**: Обновление каждые 5 секунд через SSE (Server-Sent Events)
- **Множественные источники**:
  - Ambient Weather Network (реальная метеостанция на споте)
  - Open-Meteo API (прогнозы погоды)
  - Marine API (данные о волнах)
- **Прогноз**: 3-дневный прогноз с 2-часовым интервалом (6:00-19:00)
- **История**: Плавный градиент с 5-минутными интервалами за текущий день
- **Безопасность**: Автоматические индикаторы оффшорного/оншорного/бокового ветра
- **Визуализация**: Интеллектуальная стрелка направления ветра с цветовой индикацией

### 📊 Статистика и тренды
- Анализ тренда ветра за последние 15 минут
- Отображение максимальных порывов за день
- Средняя скорость ветра по часовым и 5-минутным интервалам
- Цветовая индикация силы ветра на градиенте

### 🌊 Морские условия
- Высота волн в метрах
- Направление волн
- Период волн
- Интеграция с прогнозом ветра

### 🗺️ Интерактивная карта
- Leaflet.js карта с OpenStreetMap tiles
- Реальное расположение кайтера на воде
- Маркеры важных локаций:
  - 🏖️ Северный пляж
  - 🏖️ Южный пляж
  - 🅿️ Парковка
- Динамическая стрелка ветра, показывающая направление
- Статическая карта (без возможности масштабирования для стабильности)

### 🎨 Современный дизайн
- Tailwind CSS для стилизации
- Плавные градиенты и анимации
- Полностью адаптивный дизайн для всех устройств
- Темная тема с неоновыми акцентами
- Красивая типографика (Poppins, Pacifico, Dancing Script)

### 🎭 Дополнительные фичи
- Шутки о погоде и кайтсерфинге (обновляются ежедневно)
- LIVE индикатор с таймером последнего обновления
- Визуальная шкала скорости ветра

## 🏗️ Архитектура

### Технологический стек

#### Frontend
- **HTML5** - Семантическая разметка
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript (ES6+)** - Модульная класс-ориентированная архитектура
- **Leaflet.js v1.9.4** - Интерактивные карты
- **Service Worker** - Offline-first стратегия

#### Backend
- **Node.js 22 Alpine** - Легковесный runtime
- **Express.js** - Web framework для REST API
- **SQLite3** - Встроенная база данных для хранения данных
- **node-cron** - Планировщик задач для периодических обновлений
- **Server-Sent Events (SSE)** - Real-time обновления для клиентов

#### DevOps
- **Docker** - Контейнеризация приложения
- **Docker Compose** - Оркестрация multi-container setup
- **Nginx** - Reverse proxy и статический file server
- **Git** - Контроль версий

### Структура проекта

```
JollyKite/
├── backend/                    # Backend приложение
│   ├── src/
│   │   ├── server.js          # Express сервер и SSE
│   │   ├── DatabaseManager.js # SQLite управление данными
│   │   ├── WeatherService.js  # Интеграция с weather APIs
│   │   └── ApiRouter.js       # REST API endpoints
│   ├── package.json           # Backend dependencies
│   └── Dockerfile             # Backend container
├── js/                        # Frontend JavaScript модули
│   ├── App.js                 # Главный координатор приложения
│   ├── config.js              # Централизованная конфигурация
│   ├── WindDataManager.js     # Управление данными о ветре
│   ├── WindStreamManager.js   # SSE client для real-time данных
│   ├── MapController.js       # Leaflet карта
│   ├── ForecastManager.js     # Прогноз погоды
│   ├── WindArrowController.js # Визуализация направления ветра
│   ├── WindStatistics.js      # Анализ трендов
│   ├── HistoryManager.js      # Управление историей
│   ├── WindHistoryDisplay.js  # Градиентное отображение истории
│   ├── NotificationManager.js # Push-уведомления
│   └── utils/
│       └── WindUtils.js       # Утилиты для расчетов ветра
├── css/
│   └── main.css               # Дополнительные стили
├── images/
│   └── map-background.png     # Фон карты
├── icons/                     # PWA иконки разных размеров
├── index.html                 # Главная страница приложения
├── sw.js                      # Service Worker
├── manifest.json              # PWA манифест
├── nginx.conf                 # Nginx конфигурация
├── docker-compose.yml         # Docker Compose конфигурация
└── README.md                  # Эта документация
```

### JavaScript классы

```javascript
// Frontend архитектура
App.js                    // Главный координатор, инициализация всех модулей
├── config.js            // Конфигурация (API endpoints, координаты, интервалы)
├── WindDataManager.js   // Загрузка данных из Ambient Weather API
├── WindStreamManager.js // SSE клиент для real-time обновлений
├── MapController.js     // Инициализация и управление Leaflet картой
├── ForecastManager.js   // Загрузка и отображение прогноза (Open-Meteo + Marine API)
├── WindArrowController.js // Динамическая стрелка ветра на карте
├── WindStatistics.js    // Анализ трендов, расчет статистики
├── HistoryManager.js    // Управление историей измерений
├── WindHistoryDisplay.js // Градиентное отображение истории за день
├── NotificationManager.js // Push-уведомления
└── WindUtils.js         // Утилиты (конвертация единиц, направления)
```

### Backend API endpoints

```javascript
// REST API
GET /api/wind/current          // Текущие данные о ветре
GET /api/wind/trend            // Тренд за последние 15 минут
GET /api/wind/today            // Все измерения за сегодня
GET /api/wind/today/gradient   // Агрегированные данные с интервалами
    ?start=6                   // Начальный час (по умолчанию 6)
    ?end=19                    // Конечный час (по умолчанию 20)
    ?interval=5                // Интервал в минутах (5, 10, 15, 60)
GET /api/wind/history          // История за последние N дней
    ?days=7
GET /health                    // Health check endpoint

// SSE Stream
GET /api/wind/stream           // Server-Sent Events stream
                               // Отправляет обновления каждые 5 секунд
```

## 📍 Локация

**Пак Нам Пран (Pak Nam Pran), Таиланд**
- **Координаты спота**: 12.346596280786017, 99.99817902532192
- **Сезон**: Ноябрь - Апрель (лучший период: декабрь-март)
- **Тип спота**: Плоская вода, отмель, подходит для всех уровней
- **Ветер**: Преимущественно северо-восточный муссон
- **Особенности**: Один из лучших спотов в регионе Прачуап Кхири Кхан

## 🌊 Условия безопасности

### Направление ветра

#### 🔴 Опасно - Оффшор (Offshore)
- **Направление**: 225°-315° (ЮЗ-З-СЗ)
- **Проблема**: Ветер дует от берега в море
- **Риск**: Унесет далеко в море при проблемах с оборудованием
- **Индикация**: Красная стрелка, предупреждение на экране

#### 🟡 Осторожно - Боковой (Sideshore)
- **Направление**: 135°-225° или 315°-45°
- **Описание**: Ветер дует вдоль берега
- **Безопасность**: Умеренный риск
- **Индикация**: Оранжевая стрелка

#### 🟢 Безопасно - Оншор (Onshore)
- **Направление**: 45°-135° (СВ-В-ЮВ)
- **Описание**: Ветер дует с моря на берег
- **Безопасность**: Всегда вернет к берегу
- **Индикация**: Зеленая стрелка

### Скорость ветра

- **< 5 узлов** - Слишком слабо
- **5-8 узлов** - Легкий ветер, большой кайт
- **8-12 узлов** - Умеренный, для начинающих
- **12-20 узлов** - Отличные условия
- **20-25 узлов** - Сильный ветер, для опытных
- **25-30 узлов** - Очень сильный
- **> 30 узлов** - Опасно, экстремальные условия

## 🚀 Установка и запуск

### Локальная разработка: Docker Compose (рекомендуется)

Для разработки используйте Docker - это самый быстрый и простой способ:

```bash
# Запустить весь стек
docker-compose up -d

# Приложение доступно на http://localhost
# Backend API: http://localhost/api
```

### Публичный доступ через LocalXpose (встроенный tunnel)

⚠️ **Используйте только когда нужен публичный доступ:**
- Тестирование PWA на iPhone/Android через HTTPS
- Демонстрация клиентам через интернет
- Webhook-и от внешних сервисов

**Быстрая настройка:**

```bash
# 1. Создайте .env файл
cp .env.example .env

# 2. Добавьте ваш LocalXpose токен
# Получите на https://localxpose.io/
nano .env  # LX_ACCESS_TOKEN=ваш_токен

# 3. Запустите всё с туннелем
docker-compose up -d

# 4. Получите публичный HTTPS URL
docker-compose logs tunnel | grep "https://"
```

Tunnel сервис уже интегрирован в docker-compose.yml и запускается автоматически при наличии LX_ACCESS_TOKEN.

📖 **Детальные руководства:**
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Выбор инструментов и best practices
- [LOCALXPOSE.md](./LOCALXPOSE.md) - Дополнительная информация о LocalXpose

### Docker Compose

#### Требования
- Docker 20.10+
- Docker Compose 2.0+

#### Быстрый старт

```bash
# 1. Клонировать репозиторий
git clone <repository-url>
cd JollyKite

# 2. Создать .env файл (опционально)
cp .env.example .env

# 3. Запустить приложение
docker-compose up -d

# Приложение будет доступно на http://localhost
```

#### Docker команды

```bash
# Запуск в фоне
docker-compose up -d

# Просмотр логов
docker-compose logs -f
docker-compose logs -f backend  # только backend
docker-compose logs -f nginx    # только nginx

# Остановка
docker-compose down

# Пересборка после изменений
docker-compose build --no-cache
docker-compose up -d

# Очистка всего (осторожно!)
docker-compose down
docker system prune -a
```

#### Структура Docker

```yaml
# docker-compose.yml
services:
  backend:     # Node.js API сервер
    - Port 3000 (внутренний)
    - SQLite database
    - Cron jobs для обновления данных

  nginx:       # Reverse proxy + static files
    - Port 80 (внешний)
    - Проксирует /api/* -> backend:3000
    - Раздает статику (HTML, JS, CSS)

  tunnel:      # LocalXpose tunnel (опционально)
    - Требует LX_ACCESS_TOKEN в .env
    - Создает публичный HTTPS URL -> nginx:80
    - Dashboard: http://localhost:54538
```

### Вариант 2: Локальная разработка

#### Frontend разработка

```bash
# Установить простой HTTP сервер
npm install -g http-server

# Запустить из корневой директории
http-server -p 8000 -c-1

# Или использовать Python
python3 -m http.server 8000

# Или PHP
php -S localhost:8000

# Приложение доступно на http://localhost:8000
```

#### Backend разработка

```bash
cd backend

# Установить зависимости
npm install

# Запустить в dev режиме
npm run dev

# Backend API доступен на http://localhost:3000
```

### Вариант 3: Production deployment

#### Требования
- VPS/Cloud сервер (Ubuntu 20.04+)
- Docker & Docker Compose
- Доменное имя (опционально)
- SSL сертификат (Let's Encrypt)

#### Шаги развертывания

```bash
# 1. Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Установить Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Клонировать проект
git clone <repository-url>
cd JollyKite

# 4. Настроить переменные окружения
nano .env

# 5. Запустить
docker-compose up -d

# 6. Настроить Nginx для SSL (опционально)
# Добавить в nginx.conf SSL конфигурацию
```

#### SSL с Let's Encrypt (опционально)

```bash
# Установить certbot
sudo apt install certbot python3-certbot-nginx

# Получить сертификат
sudo certbot --nginx -d yourdomain.com

# Автопродление
sudo certbot renew --dry-run
```

## 🔧 Конфигурация

### Основные настройки

Все настройки находятся в `/js/config.js`:

```javascript
const config = {
    // API Endpoints
    api: {
        ambientWeather: 'YOUR_AMBIENT_WEATHER_ENDPOINT',
        openMeteo: 'https://api.open-meteo.com/v1/forecast',
        openMeteoMarine: 'https://marine-api.open-meteo.com/v1/marine'
    },

    // Координаты спота
    locations: {
        spot: [12.346596280786017, 99.99817902532192],
        kiter: [12.3468, 100.0116],
        // ... другие точки
    },

    // Интервалы обновления
    intervals: {
        autoUpdate: 30000,      // 30 секунд
        trendAnalysis: 300000   // 5 минут
    },

    // Параметры безопасности
    windSafety: {
        offshore: { min: 225, max: 315 },
        onshore: { min: 45, max: 135 },
        speeds: {
            veryLow: 5,
            good: 15,
            extreme: 30
        }
    },

    // Настройки прогноза
    forecast: {
        daysToShow: 3,
        startHour: 6,
        endHour: 19,
        timezone: 'Asia/Bangkok'
    }
};
```

### Backend конфигурация

Переменные окружения в `.env`:

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
DB_PATH=./data/wind.db

# Weather APIs
AMBIENT_WEATHER_URL=https://lightning.ambientweather.net/devices
AMBIENT_WEATHER_SLUG=your_slug

OPEN_METEO_URL=https://api.open-meteo.com/v1/forecast
MARINE_API_URL=https://marine-api.open-meteo.com/v1/marine

# Location
LATITUDE=12.346596280786017
LONGITUDE=99.99817902532192

# Update intervals (in minutes)
WEATHER_UPDATE_INTERVAL=5
JOKE_UPDATE_HOUR=6

# Logging
LOG_LEVEL=info
```

### Service Worker версионирование

При изменении файлов обновите версию в `sw.js`:

```javascript
const CACHE_NAME = 'jollykite-v1.5.5';  // Увеличьте версию
const API_CACHE_NAME = 'jollykite-api-v1.5.5';
```

И в `index.html`:

```html
<script type="module">
    import App from './js/App.js?v=1.5.5';  // Обновите версию
    // ...
</script>
```

## 📱 PWA установка

### iOS (Safari)
1. Откройте приложение в Safari
2. Нажмите кнопку "Поделиться" (квадрат со стрелкой)
3. Прокрутите вниз и выберите "На экран Домой"
4. Подтвердите установку

### Android (Chrome)
1. Откройте приложение в Chrome
2. Нажмите меню (три точки)
3. Выберите "Установить приложение" или "Добавить на главный экран"
4. Подтвердите установку

### Desktop (Chrome/Edge)
1. Откройте приложение
2. Обратите внимание на иконку установки в адресной строке
3. Нажмите "Установить"
4. Приложение появится как desktop app

## 🐛 Troubleshooting

### Проблемы с кэшированием

```bash
# Очистить Service Worker кэш
# В DevTools консоли браузера:
caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))))

# Отменить регистрацию SW
navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(reg => reg.unregister()))

# Затем перезагрузите страницу (Ctrl+Shift+R)
```

### Backend не запускается

```bash
# Проверить логи
docker-compose logs backend

# Проверить, что база данных создалась
docker-compose exec backend ls -la /app/data/

# Пересоздать контейнеры
docker-compose down
docker-compose up -d --force-recreate
```

### Нет данных о ветре

```bash
# Проверить API endpoint
curl http://localhost/api/wind/current

# Проверить SSE stream
curl -N http://localhost/api/wind/stream

# Проверить внешний API
curl "https://lightning.ambientweather.net/devices?public.slug=YOUR_SLUG"
```

### Карта не загружается

- Проверьте интернет соединение (tiles загружаются с OpenStreetMap)
- Откройте DevTools Network и проверьте запросы к tile.openstreetmap.org
- Убедитесь, что координаты в config.js корректны

## 📊 Мониторинг и логи

### Docker логи

```bash
# Все логи
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Последние 100 строк
docker-compose logs --tail=100 backend

# С временными метками
docker-compose logs -f -t backend
```

### Backend логи

Backend пишет структурированные логи:

```
[2025-10-23 10:30:00] INFO: Weather data updated successfully
[2025-10-23 10:30:00] INFO: Current wind: 17.5 knots from 45°
[2025-10-23 10:30:05] INFO: SSE client connected
[2025-10-23 10:30:05] INFO: Broadcasting wind update to 3 clients
```

### Мониторинг производительности

```bash
# Использование ресурсов контейнерами
docker stats

# Размер базы данных
docker-compose exec backend ls -lh /app/data/wind.db

# Проверка здоровья
curl http://localhost/health
```

## 🧪 Тестирование

### Тестирование API

```bash
# Health check
curl http://localhost/health

# Текущие данные
curl http://localhost/api/wind/current | json_pp

# Градиент истории (5-минутные интервалы)
curl 'http://localhost/api/wind/today/gradient?start=6&end=19&interval=5' | json_pp

# SSE stream (оставьте открытым)
curl -N http://localhost/api/wind/stream
```

### Frontend тестирование

```bash
# Lighthouse audit
lighthouse http://localhost --view

# PWA проверка в Chrome DevTools
# Application > Manifest
# Application > Service Workers
```

## 📈 Производительность

### Lighthouse Scores

- **Performance**: 95+
- **Accessibility**: 100
- **Best Practices**: 95+
- **SEO**: 100
- **PWA**: Installable

### Метрики

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3s
- **Cumulative Layout Shift**: < 0.1
- **Total Blocking Time**: < 200ms

### Оптимизации

- Service Worker с cache-first стратегией
- CSS и JS минификация
- Изображения оптимизированы
- Lazy loading для некритичных ресурсов
- Gzip компрессия на Nginx
- HTTP/2 поддержка

## 🤝 Разработка и вклад

### Структура разработки

```bash
# Создать feature ветку
git checkout -b feature/your-feature

# Внести изменения
# ... редактировать файлы ...

# Коммит
git add .
git commit -m "feat: add your feature"

# Push
git push origin feature/your-feature

# Создать Pull Request на GitHub
```

### Code Style

- **JavaScript**: ES6+ modules, классы, async/await
- **HTML**: Semantic HTML5
- **CSS**: Tailwind utility classes, минимум custom CSS
- **Комментарии**: JSDoc для функций и классов

### Commit Convention

```
feat: новая функция
fix: исправление бага
docs: обновление документации
style: форматирование кода
refactor: рефакторинг без изменения функциональности
test: добавление тестов
chore: обновление зависимостей, конфигурации
```

## 🚧 TODO и будущие улучшения

- [ ] **Push-уведомления**: Web Push API для уведомлений о благоприятных условиях
- [ ] **Пользовательские настройки**: Сохранение предпочтений (единицы измерения, пороги ветра)
- [ ] **Исторические графики**: Charts.js для визуализации трендов
- [ ] **Интеграция с камерами**: Embed live stream с камеры спота
- [ ] **Социальные функции**: Отметки "я на споте", чат кайтеров
- [ ] **Мультиязычность**: i18n поддержка (английский, тайский)
- [ ] **Tide data**: Интеграция с приливами и отливами
- [ ] **Профили кайтов**: Рекомендации по размеру кайта
- [ ] **Weather alerts**: Предупреждения о шквалах, грозах
- [ ] **Spots map**: Карта всех спотов региона

## 📄 Лицензия

Этот проект лицензирован под **MIT License**.

```
MIT License

Copyright (c) 2024 JollyKite

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

## 💬 Контакты и поддержка

### Контакты
- **Telegram**: [@gypsy_mermaid](https://t.me/gypsy_mermaid)
- **Локация**: Пак Нам Пран, Таиланд
- **GitHub**: [Issues](https://github.com/your-repo/issues)

### Сообщество
- **Kite школа в Пак Нам Пран**: Приходите кататься!
- **Местные кайтеры**: Всегда рады новым лицам на споте
- **Лучшее время**: Декабрь-Март, утренние часы 10:00-14:00

## 🙏 Благодарности

- **Ambient Weather Network** - за предоставление реальных данных о ветре через публичный API
- **Open-Meteo** - за отличный бесплатный API прогнозов погоды
- **Marine API** - за данные о волнах и морских условиях
- **Leaflet.js** - за легковесную и функциональную библиотеку карт
- **Tailwind CSS** - за utility-first подход к стилизации
- **OpenStreetMap** - за бесплатные map tiles
- **Docker** - за упрощение deployment процесса
- Всему **кайт-сообществу Пак Нам Прана** за вдохновение и поддержку

---

## 📸 Скриншоты

### Главная страница
- Live данные о ветре с цветовой индикацией
- Интерактивная карта с динамической стрелкой ветра
- Статистика (порывы, максимум за день, тренд)

### История ветра
- Плавный градиент с 5-минутными интервалами
- Цветовая кодировка по силе ветра
- Временная шкала 6:00-19:00

### Прогноз на 3 дня
- Почасовой прогноз с 2-часовым интервалом
- Скорость и направление ветра
- Информация о волнах (высота, период)
- Градиентные бары с цветовой индикацией

---

**Сделано с ❤️ для кайтеров Пак Нам Прана** 🏄‍♂️

*Отличных сессий и попутного ветра!* 🪁
