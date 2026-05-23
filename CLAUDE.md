# CLAUDE.md

Краткое руководство для Claude Code по работе с этим репозиторием. Подробная техническая документация — [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## TL;DR

**JollyKite** — платформа мониторинга ветра для кайтсёрфинга в Pak Nam Pran (Таиланд, 12.346596°N, 99.998179°E). PWA + iOS + виджеты. UI на русском. Рабочее окно сбора данных — **6:00–19:00 Bangkok time**.

| Часть | Стек | Каталог |
|---|---|---|
| Backend API | Node.js 20, Express, PostgreSQL (`pg`), SSE | `backend/` |
| PWA | Vanilla JS ES6, Leaflet, Tailwind | `frontend/` |
| iOS app | SwiftUI, iOS 17+, `@Observable` | `apple/JollyKite/` |
| iOS widgets | WidgetKit, AppIntents | `apple/JollyKiteWidgets/` |
| macOS app | SwiftUI, sandbox | `apple/JollyKiteMacApp/` |
| macOS widgets | WidgetKit | `apple/JollyKiteMacWidgets/` |
| Shared Swift | Swift Package | `apple/JollyKiteShared/` |
| Деплой | Docker, k3s, ArgoCD, nginx | `k8s/`, `Dockerfile*` |

**Продакшен:** `https://pnp.miko.ru` · API: `https://pnp.miko.ru/api`

Полный список менеджеров, эндпоинтов, схем БД, крон-расписания, секретов и нюансов деплоя — в [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## Команды разработки

```bash
# Backend (порт 3000, раздаёт и PWA из ../frontend)
cd backend && npm install && npm run dev

# PWA автономно (без API)
cd frontend && python3 -m http.server 8000

# iOS — после любого добавления/удаления Swift-файлов
cd apple && xcodegen generate && open JollyKite.xcodeproj
xcodebuild build -scheme JollyKite -destination 'platform=iOS Simulator,name=iPhone 16 Pro'

# Docker
docker compose up
docker compose -f docker-compose.prod.yml up
```

Требования: `brew install xcodegen`. HTTPS или localhost — для Service Worker.

**Деплой:** push в `main` → GitHub Actions собирает образы → ArgoCD синкает `k8s/argocd/`.

---

## Версионирование PWA (обязательно перед каждым коммитом UI)

Поднять версию **в двух местах синхронно**:

1. `frontend/version.json` → `{ "version": "X.Y.Z" }`
2. `frontend/sw.js` строка 3 → `const APP_VERSION = 'X.Y.Z';`

Версия пробрасывается в `/api/version`, UI-футер и имя кэша SW (`jollykite-v{VERSION}`).

---

## Критичные правила

- **Безопасность направления ветра зашита под Pak Nam Pran.** Offshore 225°–315° (опасно), onshore 45°–135° (безопасно), остальное — sideshore. Логика дублирована в `frontend/js/utils/WindUtils.js` и `apple/JollyKiteShared/.../WindSafetyService.swift` — изменения вносить в обоих местах.
- **Ambient Weather заблокирован в РФ.** Все запросы идут через прокси `AMBIENT_PROXY_URL` (по умолчанию `http://172.205.184.88:3128`). Без него бэкенд не получит данные при работе из России.
- **Конверсия единиц.** Ambient отдаёт MPH, Open-Meteo — км/ч; во всех слоях работаем в **узлах**.
- **Идемпотентность вставок.** `wind_data` имеет уникальный индекс `(station_id, timestamp)`. Любой импорт/коллектор использует `ON CONFLICT DO NOTHING`.
- **Не добавляй в git без явного запроса** (см. `~/.claude/CLAUDE.md`).
- **APNs опционален.** Без `.p8` `APNsProvider` тихо отключается — это нормально.
- **PWA без бандлера.** Только ES-модули, никакого webpack/vite.

---

## Типовые задачи

- **Новый backend-эндпоинт** → маршрут в `backend/src/ApiRouter.js` + логика в соответствующем менеджере.
- **Новая iOS-вьюшка** → файл в `apple/JollyKite/Views/...` → `xcodegen generate` → подключить в `ContentView.swift`.
- **Пороги безопасности** → `frontend/js/config.js` (PWA) + `WindSafetyService.swift` (iOS) + `NotificationManager.checkWindStability()` (push).
- **Обновление SW** → поднять `APP_VERSION` в обоих местах, обновить `CORE_ASSETS` при необходимости, в DevTools: Service Workers → Unregister → hard refresh.

---

## Отладка

- Backend: `GET /health`, `GET /api/debug/db-stats`, `GET /api/notifications/check-conditions`. Маркеры в логах: `✓` / `⚠` / `✗` / `❌`.
- PWA: DevTools → Application (Manifest, SW, Cache, LocalStorage).
- iOS: Xcode Console для SSE; пуши — `PushNotificationService`; виджет — App Group через `SharedDataStore`.

---

## Соглашения

| Контекст | Стиль | Пример |
|---|---|---|
| JS-классы | PascalCase | `WindDataManager` |
| JS-методы | camelCase | `fetchCurrentWindData` |
| Swift-типы и файлы | PascalCase | `DashboardViewModel` |
| API-эндпоинты | kebab-case | `/api/wind/current` |

- JS: ES6-модули, классы, `async/await`, конфиг — только в `frontend/js/config.js`.
- Swift: SwiftUI + `@Observable`; общие модели — в пакете `JollyKiteShared`.
- Ошибки: try/catch + русские сообщения в UI.

---

## Тесты

PWA и backend — ручная проверка в браузере (без автотестов). Swift-пакет:

```bash
cd apple/JollyKiteShared && swift test
```

---

## Ресурсы

- 📘 **Полная техническая документация:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- README: [`README.md`](./README.md)
- История изменений: `git log` (отдельный CHANGELOG не ведём)
- Контакт: Telegram @gypsy_mermaid
