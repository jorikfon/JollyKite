# 🪁 JollyKite - Кайтсерфинг в Пак Нам Пран

PWA приложение для мониторинга ветра и условий для кайтсерфинга в Пак Нам Пране, Таиланд.

## 🚀 Быстрый старт

### Разработка (Docker)

```bash
# Запустить все сервисы
docker-compose up -d

# Приложение: http://localhost
# Backend API: http://localhost:3000
```

### Production (Rancher/Kubernetes)

Используйте готовый Docker образ из GitHub Container Registry:

```yaml
image: ghcr.io/jorikfon/jollykite:latest
```

Или соберите свой образ:

```bash
docker build -t jollykite-backend .
```

## 📁 Структура проекта

```
JollyKite/
├── frontend/           # PWA приложение (HTML, CSS, JS, icons, images)
├── backend/            # Node.js backend (Express, SQLite, SSE)
├── config/             # Конфигурация (nginx.conf)
├── tmp/                # Временные файлы (lx-data, и т.д.)
├── docker-compose.yml  # Development
├── docker-compose.prod.yml  # Production
└── Dockerfile          # Backend image
```

## 🌟 Основные возможности

### Real-time данные
- SSE (Server-Sent Events) для обновлений каждые 5 секунд
- Данные с реальной метеостанции (Ambient Weather Network)
- Прогноз погоды на 3 дня (Open-Meteo)
- История ветра с градиентной визуализацией

### Безопасность
- 🔴 **Offshore (225°-315°)** - опасно, ветер от берега
- 🟢 **Onshore (45°-135°)** - безопасно, ветер к берегу
- 🟡 **Sideshore** - умеренный риск, боковой ветер

### Скорость ветра
- < 8 узлов: слишком слабо
- 8-15 узлов: отлично для обучения
- 15-25 узлов: идеальные условия
- 25+ узлов: сильный ветер для опытных

### PWA функции
- Установка как нативное приложение
- Offline режим с Service Worker
- Push-уведомления о ветре
- Интерактивная карта Leaflet.js

## 🏗️ Технологии

### Frontend
- Vanilla JavaScript (ES6+ modules)
- Tailwind CSS
- Leaflet.js для карт
- Service Worker для offline

### Backend
- Node.js 20 Alpine
- Express.js
- SQLite3 для хранения данных
- SSE для real-time обновлений
- node-cron для периодических задач

### DevOps
- Docker & Docker Compose
- GitHub Actions (автоматическая сборка образов)
- Nginx (reverse proxy)
- GitHub Container Registry

## 🔌 API Endpoints

```bash
# Current wind data
GET /api/wind/current

# Real-time SSE stream (updates every 5 sec)
GET /api/wind/stream

# Wind trend (last 30 min)
GET /api/wind/trend

# Forecast (3 days)
GET /api/wind/forecast

# History
GET /api/wind/history?hours=24

# Push notifications
POST /api/notifications/subscribe
POST /api/notifications/unsubscribe
GET /api/notifications/status

# Health check
GET /health
```

## ⚙️ Конфигурация

### Backend Environment

Настройте в `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - TZ=Asia/Bangkok
  - DATA_COLLECTION_INTERVAL=300000  # 5 минут
  - ARCHIVE_INTERVAL=3600000         # 1 час
```

### Frontend Config

Настройки в `frontend/js/config.js`:

```javascript
const config = {
  api: {
    backend: '/api'  # Для production через nginx
  },
  locations: {
    spot: [12.346596280786017, 99.99817902532192]  # Пак Нам Пран
  },
  windSafety: {
    offshore: { min: 225, max: 315 },  # Опасная зона
    onshore: { min: 45, max: 135 }     # Безопасная зона
  }
};
```

## 🐳 Docker

### Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down

# Rebuild after changes
docker-compose build --no-cache
docker-compose up -d
```

### Production

```bash
# Use pre-built image from GitHub Container Registry
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 🌐 LocalXpose Tunnel (Публичный доступ)

LocalXpose туннель уже встроен в docker-compose и позволяет получить публичный HTTPS URL для:
- Тестирования PWA на реальных устройствах
- Демонстрации клиентам
- Webhook endpoints

**Активация туннеля:**

```bash
# 1. Зарегистрируйтесь на https://localxpose.io и получите токен

# 2. Создайте .env файл
cp .env.example .env

# 3. Добавьте токен в .env файл
echo "LX_ACCESS_TOKEN=your_token_here" >> .env

# 4. Запустите docker-compose (туннель стартует автоматически)
docker-compose up -d

# 5. Получите публичный URL
docker-compose logs tunnel | grep "https://"
# Или откройте dashboard: http://localhost:54538
```

**Примечания:**
- Туннель работает только если указан `LX_ACCESS_TOKEN` в `.env`
- Зарезервированный домен: `pnp.ap.loclx.io`
- Туннель проксирует на `nginx:80` (весь стек доступен через туннель)
- Dashboard туннеля: http://localhost:54538

**Отключение туннеля:**

```bash
# Остановить только туннель
docker-compose stop tunnel

# Или запустить без туннеля (закомментируйте LX_ACCESS_TOKEN в .env)
```

## 🔧 Полезные команды

```bash
# Test backend API
curl http://localhost:3000/api/wind/current | json_pp

# Test SSE stream
curl -N http://localhost:3000/api/wind/stream

# Check health
curl http://localhost:3000/health

# Monitor containers
docker stats

# Check database size
ls -lh backend/data/*.db
```

## 🐛 Troubleshooting

### Нет данных о ветре
```bash
# Check backend logs
docker-compose logs backend

# Test external API
curl "https://lightning.ambientweather.net/devices?public.slug=YOUR_SLUG"
```

### Service Worker не обновляется
```javascript
// В консоли браузера:
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(reg => reg.unregister()))

// Затем обновите версию кэша в frontend/sw.js:
const CACHE_NAME = 'jollykite-v1.7.4';  // Увеличьте версию
```

### Backend не запускается
```bash
# Recreate containers
docker-compose down
docker-compose up -d --force-recreate

# Check database permissions
docker-compose exec backend ls -la /app/data/
```

## 📍 Локация

**Пак Нам Пран (Pak Nam Pran), Прачуап Кхири Кхан, Таиланд**
- Координаты: 12.3466°N, 99.9982°E
- Сезон: ноябрь - апрель
- Лучшее время: декабрь - март, 10:00-14:00
- Тип спота: плоская вода, отмель, все уровни

## 🎯 GitHub Container Registry

Образы автоматически собираются через GitHub Actions:

- `ghcr.io/jorikfon/jollykite:latest` - последняя стабильная версия
- `ghcr.io/jorikfon/jollykite:main` - из main ветки
- `ghcr.io/jorikfon/jollykite:docker-containerization` - из dev ветки
- `ghcr.io/jorikfon/jollykite:v1.0.0` - версионные теги

## 💬 Контакты

- **Локация**: Пак Нам Пран, Таиланд
- **GitHub**: [Issues](https://github.com/jorikfon/JollyKite/issues)

## 📄 Лицензия

MIT License - Copyright (c) 2025

---

**Сделано с ❤️ для кайтеров Пак Нам Прана** 🏄‍♂️
