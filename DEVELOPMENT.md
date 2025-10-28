# JollyKite Development Guide

## Выбор инструмента разработки

### 🎯 Быстрый выбор

| Сценарий | Используйте | Команда |
|----------|-------------|---------|
| Локальная разработка | Docker Compose | `docker-compose up -d` (без tunnel) |
| Тестирование на телефоне | Docker Compose + Tunnel | Настройте .env и `docker-compose up -d` |
| Демо для клиента | Docker Compose + Tunnel | Настройте .env и `docker-compose up -d` |
| Отладка backend | Docker Compose | `docker-compose logs -f backend` |
| Быстрый просмотр изменений | Docker Compose | Измените файлы, обновите браузер |

---

## Docker Compose (основной инструмент)

### ✅ Преимущества
- 🚀 **Быстрый старт** - одна команда
- 🔒 **Изолированная среда** - не мешает другим проектам
- 🔄 **Hot reload** - изменения применяются автоматически
- 📦 **Все зависимости включены** - не нужно устанавливать Node.js, Python и т.д.
- 🌐 **Работает офлайн** - не требует интернета (tunnel опционально)
- 🛡️ **Nginx проксирование** - production-like конфигурация
- 🌍 **Встроенный LocalXpose** - публичный доступ одной командой

### Основные команды

```bash
# Запуск
docker-compose up -d

# Логи
docker-compose logs -f              # Все сервисы
docker-compose logs -f backend      # Только backend
docker-compose logs -f nginx        # Только nginx

# Остановка
docker-compose down                 # Остановить и удалить контейнеры
docker-compose stop                 # Только остановить

# Перезапуск после изменений
docker-compose restart backend      # Перезапустить backend
docker-compose restart              # Перезапустить всё

# Пересборка (после изменения package.json)
docker-compose build                # Пересобрать образы
docker-compose up -d --build        # Пересобрать и запустить

# Очистка
docker-compose down -v              # Удалить контейнеры и volumes
docker system prune -a              # Очистить всё Docker
```

### Структура сервисов

```yaml
services:
  backend:    # Node.js backend на порту 3000
  nginx:      # Reverse proxy на порту 80
  tunnel:     # LocalXpose tunnel (требует LX_ACCESS_TOKEN)
```

### Доступ

**Локальный:**
- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **Backend напрямую**: http://localhost:3000 (для отладки)

**Публичный (если настроен .env):**
- **HTTPS URL**: Смотрите в логах tunnel: `docker-compose logs tunnel`
- **Tunnel dashboard**: http://localhost:54538

---

## LocalXpose (встроенный tunnel сервис)

### ✅ Когда использовать

1. **Тестирование PWA на реальном телефоне**
   - Service Workers требуют HTTPS
   - Push-уведомления требуют HTTPS
   - LocalXpose предоставляет HTTPS автоматически

2. **Демонстрация клиентам**
   - Клиент не может подключиться к вашему localhost
   - Нужен публичный URL на несколько минут/часов

3. **Webhook-и от внешних сервисов**
   - Telegram Bot API
   - Payment providers (Stripe, PayPal)
   - OAuth callbacks

### ❌ НЕ используйте для

- Обычной локальной разработки
- Написания и тестирования кода
- Отладки в DevTools
- CI/CD процессов

### Быстрая настройка (через Docker)

```bash
# 1. Получите токен на https://localxpose.io/

# 2. Создайте .env файл
cp .env.example .env

# 3. Добавьте токен в .env
# Откройте .env и добавьте: LX_ACCESS_TOKEN=ваш_токен

# 4. Запустите весь стек с туннелем
docker-compose up -d

# 5. Получите публичный URL
docker-compose logs tunnel | grep "https://"
```

Tunnel сервис уже включен в docker-compose.yml и запустится автоматически, если настроен LX_ACCESS_TOKEN.

---

## Когда включать tunnel сервис

| Сценарий | Tunnel | Команда |
|----------|--------|---------|
| **Локальная разработка** | ❌ Выключен | Не настраивайте .env |
| **Тестирование на телефоне** | ✅ Включен | Настройте LX_ACCESS_TOKEN в .env |
| **Демо для клиента** | ✅ Включен | Настройте LX_ACCESS_TOKEN в .env |
| **Production** | ❌ Выключен | Используйте реальный хостинг |

### Преимущества Docker-интеграции

| Параметр | Локальная разработка | С Tunnel |
|----------|---------------------|----------|
| **Скорость** | ⚡ Мгновенная | 🐢 Зависит от интернета |
| **Стабильность** | 💪 100% | 📡 Зависит от соединения |
| **Интернет** | ❌ Не нужен | ✅ Обязателен |
| **HTTPS** | ❌ Нет (localhost) | ✅ Автоматически |
| **Публичный URL** | ❌ Нет | ✅ Да |
| **Настройка** | 🚀 Сразу работает | ⚙️ Нужен токен |
| **Управление** | `docker-compose up -d` | `docker-compose up -d` |

---

## Типичные рабочие процессы

### 1. Ежедневная разработка

```bash
# Утро
docker-compose up -d

# Работа
# - Редактируете код
# - Обновляете браузер
# - Смотрите логи: docker-compose logs -f

# Вечер
docker-compose down
```

### 2. Тестирование на телефоне

```bash
# Настройте .env с вашим LX_ACCESS_TOKEN
cp .env.example .env
nano .env  # Добавьте токен

# Запустите Docker с туннелем
docker-compose up -d

# Получите публичный URL
docker-compose logs tunnel | grep "https://"

# Откройте URL на телефоне
# Тестируйте PWA

# После тестирования можно остановить всё
docker-compose down
```

### 3. Демо для клиента

```bash
# Убедитесь что .env настроен с LX_ACCESS_TOKEN

# За 5 минут до звонка
docker-compose up -d

# Получите публичный URL
docker-compose logs tunnel | grep "https://"

# Во время звонка
# Отправьте URL клиенту: https://xyz789.loclx.io
# Клиент тестирует в своём браузере

# После звонка
docker-compose down
```

### 4. Отладка проблемы

```bash
# Запустите с логами
docker-compose up

# Или смотрите логи отдельно
docker-compose logs -f backend

# Найдите проблему
# Исправьте код
# Docker автоматически перезапустит (если watch включен)

# Или перезапустите вручную
docker-compose restart backend
```

---

## Best Practices

### ✅ Делайте

- Используйте Docker Compose для всей разработки
- Настраивайте LX_ACCESS_TOKEN только когда нужен публичный доступ
- Для обычной разработки НЕ создавайте .env (tunnel не запустится)
- Проверяйте логи через `docker-compose logs`
- Смотрите tunnel URL: `docker-compose logs tunnel | grep https`
- Регулярно обновляйте Docker образы: `docker-compose pull && docker-compose up -d --build`

### ❌ Не делайте

- Не держите tunnel включенным постоянно (только для демо/тестирования)
- Не коммитьте .env файл в git (уже в .gitignore)
- Не публикуйте публичные URL в открытом доступе
- Не забывайте останавливать Docker: `docker-compose down`

---

## Troubleshooting

### Docker Compose

**Проблема**: Порт 80 занят
```bash
# Найдите процесс
lsof -i :80

# Остановите или измените порт в docker-compose.yml
ports:
  - "8080:80"  # Теперь доступ через http://localhost:8080
```

**Проблема**: Изменения не применяются
```bash
# Жёсткий перезапуск
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Проблема**: Backend не запускается
```bash
# Смотрите логи
docker-compose logs backend

# Проверьте .env файлы
cat backend/.env
```

### LocalXpose Tunnel

**Проблема**: Tunnel контейнер не запускается
```bash
# Проверьте что .env настроен
cat .env | grep LX_ACCESS_TOKEN

# Если пусто - добавьте токен
cp .env.example .env
nano .env

# Перезапустите
docker-compose restart tunnel
```

**Проблема**: Не вижу публичный URL
```bash
# Смотрите логи tunnel
docker-compose logs tunnel

# Или только URL
docker-compose logs tunnel | grep "https://"
```

**Проблема**: Tunnel контейнер в состоянии restarting
```bash
# Скорее всего неверный токен
docker-compose logs tunnel

# Проверьте токен в .env
# Получите новый на https://localxpose.io/
```

**Проблема**: Медленная работа через туннель
```bash
# Это нормально - трафик идёт через интернет
# Для разработки не включайте tunnel (не создавайте .env)
```

---

## Заключение

**Золотое правило**:

> 95% времени: `docker-compose up -d` (без .env - tunnel отключен)
> 5% времени: Настройте .env → `docker-compose up -d` (с tunnel для публичного доступа)

**Преимущества Docker-интеграции**:
- ✅ Единая команда для запуска всего стека
- ✅ Tunnel автоматически подключается к nginx
- ✅ Не нужно запускать loclx вручную
- ✅ Tunnel управляется через docker-compose (logs, restart, down)
- ✅ Персистентность сертификатов в lx-data/

Счастливого кодирования! 🚀
