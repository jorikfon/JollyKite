# 🪁 JollyKite

Платформа мониторинга ветра для кайтсёрфинга в **Пак Нам Пран** (Таиланд).
PWA, нативное iOS-приложение с виджетами, macOS-приложение с виджетами и общий бэкенд на Node.js — единая шарп-точка данных для всего комьюнити.

**Продакшен:** [https://pnp.miko.ru](https://pnp.miko.ru)

---

## Что это даёт

- 📡 **Реальный ветер** с 4 публичных станций Ambient Weather, обновление каждые 5 минут, стрим по SSE.
- 🌬️ **Прогноз на 3 дня** из 5 моделей Open-Meteo (GFS Seamless, ECMWF, Météo-France, GFS, GEM) с авто-выбором самой точной по 14-дневной истории попаданий.
- 🚦 **Индикация безопасности** под ориентацию пляжа: offshore (опасно), onshore (безопасно), sideshore (умеренно).
- 🪁 **Подбор размера кайта/доски** под силу ветра, вес райдера и дисциплину (twintip / surfboard / foil / wingfoil).
- 📊 **История на 10 лет**: сегодняшний график, неделя, помесячная статистика «катабельных дней» и подневная разбивка месяца с почасовой раскраской.
- 🔔 **Push-уведомления** (Web Push + APNs) при стабильном ветре ≥8 узлов 15 минут.
- 🗺️ **Карта** с маркерами станций и стрелкой направления.
- 🌍 **Локализация:** RU / EN / DE / TH; единицы — узлы / м/с / км/ч / mph.

---

## Технологии

| Часть | Стек |
|---|---|
| Backend | Node.js 20, Express, PostgreSQL (`pg`), SSE, web-push, APNs HTTP/2 |
| PWA | Vanilla JS ES6 modules, Leaflet, Tailwind, Service Worker |
| iOS | SwiftUI, iOS 17+, `@Observable`, WidgetKit, AppIntents |
| macOS | SwiftUI, sandbox, WidgetKit |
| Shared Swift | Swift Package `JollyKiteShared` |
| Деплой | Docker, k3s, ArgoCD, nginx, GitHub Actions |

---

## Быстрый старт

```bash
# Backend (порт 3000, раздаёт и PWA из ../frontend)
cd backend && npm install && npm run dev

# iOS / macOS — после изменений в Swift-файлах:
cd apple && xcodegen generate && open JollyKite.xcodeproj

# Docker (postgres + backend + nginx)
docker compose up
```

Требуется `brew install xcodegen`. Для Service Worker нужны HTTPS или localhost.

---

## Документация

- **[`CLAUDE.md`](./CLAUDE.md)** — короткое руководство и критичные правила
- **[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)** — полная техническая документация: менеджеры, эндпоинты, схема БД, крон-расписание, импорт истории, деплой

---

## Контакты

- 📍 **Локация:** Пак Нам Пран, Прачуап Кхири Кхан, Таиланд (12.3466°N, 99.9982°E)
- 💬 Telegram: @gypsy_mermaid
- 🐙 GitHub: [issues](https://github.com/jorikfon/JollyKite/issues)

---

**Сделано для кайтеров Пак Нам Прана** 🏄‍♂️
