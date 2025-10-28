# JollyKite Scripts

Вспомогательные скрипты для разработки и тестирования.

## Доступные скрипты

### start-with-tunnel.sh

Запускает полный стек (frontend + backend) с публичным туннелем через LocalXpose.

**Использование:**
```bash
./scripts/start-with-tunnel.sh
```

**Требования:**
- LocalXpose установлен (`brew install localxpose`)
- Токен настроен в `.env` файле (`LX_ACCESS_TOKEN`)

**Что делает:**
1. Запускает backend на порту 3000
2. Запускает frontend на порту 8080 (Python HTTP server)
3. Создаёт два публичных туннеля
4. Показывает публичные URL

**Остановка:**
Нажмите `Ctrl+C` для остановки всех сервисов.

---

### tunnel-frontend.sh

Создаёт туннель только для фронтенда (если backend не нужен).

**Использование:**
```bash
# Сначала запустите frontend
python3 -m http.server 8080

# В другом терминале создайте туннель
./scripts/tunnel-frontend.sh
```

**Требования:**
- Frontend запущен на порту 8080
- LocalXpose установлен

---

## Настройка токена

### Способ 1: Через .env (рекомендуется)

```bash
# Создайте .env файл
cp .env.example .env

# Добавьте токен
echo "LX_ACCESS_TOKEN=ваш_токен_здесь" >> .env
```

### Способ 2: Через CLI

```bash
loclx account login
# Введите токен при запросе
```

---

## Установка LocalXpose

### macOS
```bash
brew install localxpose
```

### Другие ОС
Скачайте с https://localxpose.io/download

---

## Получение токена

1. Зарегистрируйтесь на https://localxpose.io/
2. Перейдите в Dashboard
3. Скопируйте Access Token
4. Добавьте в `.env` файл

---

## Примеры использования

### Быстрый старт для демо
```bash
# 1. Настройте токен один раз
cp .env.example .env
nano .env  # Добавьте LX_ACCESS_TOKEN

# 2. Запустите
./scripts/start-with-tunnel.sh

# Получите URL и поделитесь с друзьями!
```

### Разработка только фронтенда
```bash
# Терминал 1: Frontend
python3 -m http.server 8080

# Терминал 2: Туннель
./scripts/tunnel-frontend.sh
```

### Разработка с Docker
```bash
# Запустите Docker стек
docker-compose up -d

# Создайте туннель к nginx
loclx tunnel http --to localhost:80
```

---

## Troubleshooting

### "loclx not found"
```bash
# Установите LocalXpose
brew install localxpose
```

### "You need to login"
```bash
# Либо добавьте токен в .env
echo "LX_ACCESS_TOKEN=your_token" >> .env

# Либо войдите через CLI
loclx account login
```

### "Port 8080 already in use"
```bash
# Найдите процесс
lsof -i :8080

# Убейте процесс
kill -9 <PID>

# Или используйте другой порт
python3 -m http.server 8081
# и обновите скрипт
```

---

## Полезные ссылки

- [Документация LocalXpose](../LOCALXPOSE.md)
- [LocalXpose официальный сайт](https://localxpose.io/)
- [Документация LocalXpose CLI](https://localxpose.io/docs)
