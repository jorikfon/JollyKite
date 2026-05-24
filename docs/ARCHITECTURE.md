# JollyKite — техническая документация

> Подробное описание функционала, архитектуры backend и frontend, форматов данных и операционных особенностей платформы JollyKite.
> Краткий обзор и навигация — в [CLAUDE.md](../CLAUDE.md).

---

## 1. О приложении

**JollyKite** — это полноценная платформа мониторинга и прогнозирования ветра для кайтсёрфинга на пляже **Pak Nam Pran** (Таиланд, 12.346596°N, 99.998179°E). Платформа покрывает три устройства одновременно — PWA в браузере, нативное iOS-приложение и виджеты для iPhone — и обслуживает преимущественно русскоязычное комьюнити кайтеров.

### 1.1. Что приложение даёт пользователю

- **Текущий ветер в реальном времени.** Усреднённые показания с 4 публичных метеостанций сети Ambient Weather, обновление каждые 5 минут, стриминг по SSE.
- **Индикация безопасности.** Каждое измерение классифицируется по направлению относительно ориентации пляжа: безопасно (onshore) / умеренно (sideshore) / опасно (offshore). Цветовая кодировка одинаковая в PWA и iOS.
- **Прогноз на 3 дня.** Подтягивается из 5 моделей Open-Meteo (GFS Seamless, ECMWF, Météo-France, GFS, GEM); система ежедневно сверяет прогноз с фактом и автоматически выбирает наилучшую модель.
- **История ветра.** Сегодняшний график по часам, недельная история, помесячная статистика «катабельных дней», подневная разбивка месяца с почасовыми мини-графиками. История сохраняется минимум на 10 лет.
- **Подбор кайта/доски.** Калькулятор размера снаряжения по силе ветра, весу райдера и типу дисциплины (twintip, surfboard, foil, wingfoil).
- **Push-уведомления.** Когда ветер стабильно держится выше порога 15 минут — приходит уведомление: на iOS через APNs, в браузер — через Web Push (VAPID).
- **Карта.** Leaflet-карта с маркерами станций и стрелкой направления ветра.
- **Локализация.** UI в основном русский, но есть переводы (EN, DE, TH); единицы измерения — узлы / м/с / км/ч / мили/ч.
- **macOS-приложение и виджеты.** Тот же кодовый пакет `JollyKiteShared`, отдельные таргеты `JollyKiteMacApp` и `JollyKiteMacWidgets`.

### 1.2. Рабочие часы

Сбор данных и весь основной цикл активны **6:00–19:00 по Бангкокскому времени (UTC+7)**. Вне этого окна сервер не опрашивает Ambient Weather (станции отключаются на ночь), что отражено и в крон-расписании, и в логике виджетов.

---

## 2. Backend (Node.js)

### 2.1. Стек и точка входа

- **Node.js 20**, ESM-модули
- **Express** — REST + SSE
- **PostgreSQL** (внешний), пул соединений на `pg`
- **node-cron** — расписание сбора и обслуживания
- **undici.ProxyAgent** — обход блокировки Ambient Weather из России (env `AMBIENT_PROXY_URL`)
- **web-push** — VAPID для PWA
- Встроенные `http2` + `crypto` — APNs (HTTP/2 + JWT, без сторонних SDK)

Точка входа — `backend/server.js` (порт 3000). Сервер также раздаёт статику PWA из `../frontend`.

### 2.2. Менеджеры

Архитектура построена на классах-менеджерах, каждый с одной зоной ответственности; `server.js` собирает их и крон-задачи, а `ApiRouter` — единственная точка маршрутизации.

| Менеджер | Зона ответственности |
|---|---|
| `PostgresPool` | Синглтон пула `pg`. Читает `PG_HOST/PG_PORT/PG_DATABASE/PG_USER/PG_PASSWORD` или `DATABASE_URL`. |
| `DatabaseManager` | Таблица `wind_data` — 5-минутные «сырые» измерения. Уникальный индекс `(station_id, timestamp)` + `ON CONFLICT DO NOTHING` для идемпотентности. Пакетная вставка для импорта истории. Чистка старше N дней (по умолчанию 3650 = 10 лет). |
| `ArchiveManager` | Таблица `hourly_archive` — почасовые агрегаты (avg, max gust, dominant direction). Чистка не настроена — данные хранятся бессрочно. |
| `WindDataCollector` | Опрос 4 публичных станций Ambient Weather (`lightning.ambientweather.net/devices?public.slug=`). Конверсия MPH→knots, усреднение по станциям, запись каждого станционного отсчёта отдельной строкой. Использует прокси, если задан `AMBIENT_PROXY_URL`. |
| `ForecastCollector` | Опрос Open-Meteo (`/v1/forecast`), 3-дневный почасовой прогноз. Поправочные коэффициенты на локальный микроклимат. Конверсия км/ч→knots. |
| `ForecastModelManager` | Оркестрация 5 моделей Open-Meteo. Каждые 3 часа сохраняет снапшоты в `forecast_snapshots`. Раз в сутки оценивает точность каждой модели за последние 14 дней по фактическим архивным данным. Когда накоплено ≥10 точек — автоматически выбирает наиболее точную модель как «лучшую». |
| `AmbientHistoryImporter` | Импорт исторических данных с публичного эндпоинта `lightning.ambientweather.net/device-data?...&dataKey=graphDataRefined`. Постранично (по 2000 точек / ~7 дней), идемпотентно. Поддерживает разовый импорт диапазона и ежедневный «дозбор». После вставки пересчитывает затронутые часы в `hourly_archive`. Сейчас в БД: `pak_nam_pran` с 2024-01-03, `pvf2_thap_tai` с ~2024-01-31, `hua_hin` с ~2023-02-28; известный гэп источника `pak_nam_pran` 2024-07-26..2024-08-06. |
| `ForecastBacktestImporter` | Бэктест 5 моделей прогноза на всю историю архива через публичный `historical-forecast-api.open-meteo.com`. Чанки по 90 дней, конверсия в узлы, идемпотентный `INSERT … ON CONFLICT DO UPDATE`, после загрузки одним `UPDATE … FROM hourly_archive` подтягиваются актуалы и считаются ошибки. Текущий лидер по RMSE — ECMWF IFS; все модели систематически завышают ветер на 1.8–3.6 узлов (локальный bias). |
| `NotificationManager` | Web Push (VAPID) + APNs. Алгоритм стабильности: ветер ≥8 узлов 15 минут (3 подряд 5-минутных измерения), разброс направления ≤45°, гасты не критичны (max−avg ≤8 узлов), тренд не падает резко. Максимум 1 уведомление в сутки на подписку. |
| `APNsProvider` | HTTP/2 + JWT, токен кешируется 50 минут. Читает `.p8` из `APNS_KEY_FILE`. Если ключ не задан — провайдер тихо отключается. |
| `CalibrationManager` | Постоянный JSON-сдвиг направления ветра (±180°) для коррекции показаний станций. |

### 2.3. Крон-расписание (Bangkok time)

| Когда | Что | Менеджер |
|---|---|---|
| Каждые 5 мин, 6:00–19:00 | Сбор ветра с 4 станций | `WindDataCollector` |
| Каждый час в :00 | Часовая агрегация | `ArchiveManager` |
| Каждые 3 часа, 5:00–20:00 | Снапшоты 5 моделей прогноза | `ForecastModelManager` |
| Ежедневно 20:00 | Оценка точности прогноза | `ForecastModelManager` |
| Ежедневно 00:05 | Чистка `wind_data` старше 3650 дней | `DatabaseManager` |
| Еженедельно, воскресенье 01:00 | Чистка снапшотов прогноза >14 дней | `ForecastModelManager` |
| Еженедельно, воскресенье 03:00 | Догон backtest за последние 14 дней | `ForecastBacktestImporter` |

### 2.4. Схема БД

```
wind_data
  id           SERIAL PK
  station_id   TEXT    -- slug станции
  timestamp    TIMESTAMPTZ
  wind_speed   NUMERIC (knots)
  wind_gust    NUMERIC (knots)
  wind_direction NUMERIC (degrees)
  -- + остальные поля Ambient lastData
  UNIQUE (station_id, timestamp)

hourly_archive
  id             SERIAL PK
  station_id     TEXT
  hour_timestamp TIMESTAMPTZ  -- начало часа (Bangkok)
  avg_wind_speed NUMERIC
  max_wind_speed NUMERIC
  max_wind_gust  NUMERIC
  dominant_wind_direction NUMERIC

forecast_snapshots
  id              SERIAL PK
  model           TEXT       -- 'gfs_seamless' | 'ecmwf' | ...
  snapshot_time   TIMESTAMPTZ
  forecast_time   TIMESTAMPTZ
  wind_speed      NUMERIC
  wind_gust       NUMERIC
  wind_direction  NUMERIC
  precipitation_probability NUMERIC

forecast_backtest
  id                  SERIAL PK
  model_id            TEXT
  target_date         DATE
  target_hour         INTEGER  -- 0..23 Bangkok, фильтр 6..19 при вставке
  forecast_speed      DOUBLE PRECISION  -- knots
  forecast_direction  INTEGER
  forecast_gust       DOUBLE PRECISION
  actual_speed        DOUBLE PRECISION  -- из hourly_archive (UPDATE после импорта)
  actual_direction    INTEGER
  speed_error         DOUBLE PRECISION
  direction_error     DOUBLE PRECISION
  UNIQUE (model_id, target_date, target_hour)

-- JSON-файлы (PVC, не БД): подписки Web Push, токены APNs, калибровка, состояние коллектора.
```

### 2.5. API (полный справочник)

База: `https://pnp.miko.ru/api`. Все ответы JSON, ошибки на русском.

#### Ветер
| Метод | Путь | Описание |
|---|---|---|
| GET | `/wind/current` | Последнее усреднённое измерение |
| GET | `/wind/stream` | SSE-поток (event: `wind`) |
| GET | `/wind/history/:hours?` | Последние N часов (по умолчанию 24) |
| GET | `/wind/history/week?days=7` | Недельная история, сгруппированная по дням |
| GET | `/wind/today/gradient?start=6&end=20&interval=5` | Сегодня агрегированно для градиентного бара |
| GET | `/wind/statistics/:hours?` | Min/max/avg/тренд за период |
| GET | `/wind/trend` | Направление тренда (растёт/падает/стабильно) |
| GET | `/wind/forecast?model=&days=` | Прогноз на N дней (1..16, по умолчанию 3), модель — лучшая или указанная |
| GET | `/wind/forecast/models` | Список 5 моделей с метриками точности |
| GET | `/wind/forecast/compare` | Все модели сравнительно |
| POST | `/wind/forecast/snapshot` | Принудительный снапшот всех моделей |
| POST | `/wind/forecast/evaluate` | Принудительная оценка точности |
| POST | `/wind/forecast/backtest` | Бэктест моделей через historical-forecast-api. Body: `{from, to, days?, modelIds?}`. Идемпотентно. |
| GET | `/wind/forecast/backtest/summary` | RMSE/MAE/Bias по моделям + период наблюдений |
| GET | `/wind/forecast/backtest/by-month` | MAE/Bias моделей по календарным месяцам (сезонный дрейф) |
| GET | `/wind/today/full` | История за сегодня + прогноз |
| POST | `/wind/collect` | Принудительный сбор сейчас |
| POST | `/wind/import` | Импорт исторических данных. Body/query: `from`, `to` (ISO), либо `days` (по умолчанию 365); опционально `stationIds`. |
| POST | `/wind/import/daily` | Дозбор последних суток |

#### Архив
| Метод | Путь | Описание |
|---|---|---|
| GET | `/archive/days/:days?` | Архив за N дней (по умолчанию 30) |
| GET | `/archive/day/:date` | Конкретный день (YYYY-MM-DD) |
| GET | `/archive/statistics/:days?` | Статистика по архиву |
| GET | `/archive/patterns/:days?` | Паттерны ветра по часам |
| GET | `/archive/monthly-rideable?sport=&weight=` | Помесячная статистика «катабельных дней» с учётом дисциплины и веса |
| GET | `/archive/month-days?month=YYYY-MM&sport=&weight=` | Подневная разбивка месяца с почасовой колоризацией «катабельности» |
| POST | `/archive/hourly` | Принудительная часовая агрегация |

#### Калибровка / уведомления / прочее
| Метод | Путь | Описание |
|---|---|---|
| GET, POST | `/calibration` | Чтение / запись (`{ offset: number }`, ±180°) |
| POST | `/notifications/subscribe` | Web Push subscribe |
| POST | `/notifications/unsubscribe` | Web Push unsubscribe |
| GET | `/notifications/stats` | Статистика |
| POST | `/notifications/test` | Тестовое уведомление |
| GET | `/notifications/check-conditions` | Отладка условий стабильности |
| POST | `/notifications/apns/register` | Регистрация iOS-токена |
| POST | `/notifications/apns/unregister` | Отписка iOS-токена |
| GET | `/version` | Версия приложения и SW |
| GET | `/debug/db-stats` | Размеры таблиц, последние таймстемпы |
| GET | `/health` | Health-check |

### 2.6. Внешние интеграции

**Ambient Weather Network** — 4 публичных станции вокруг Pak Nam Pran. Без авторизации. Real-time: `https://lightning.ambientweather.net/devices?public.slug=<slug>`, история: `.../device-data?macAddress=...&start=&end=&limit=2000&res=5&dataKey=graphDataRefined`. Скорость — в MPH, конверсия в узлы на нашей стороне. **Важно:** домен заблокирован в России (DPI), поэтому все запросы идут через HTTP-прокси `AMBIENT_PROXY_URL` (по умолчанию `http://172.205.184.88:3128`).

**Open-Meteo Forecast** — 5 моделей, бесплатно, без авторизации. Скорости — в км/ч, конверсия в узлы. Météo-France не отдаёт `precipitation_probability`.

**APNs** — Apple Push Notification service для iOS. JWT-аутентификация через `.p8`-ключ, HTTP/2.

**Web Push** — стандартный VAPID flow для подписок из браузера.

### 2.7. Импорт истории

`AmbientHistoryImporter` строит цепочку постраничных запросов от `toMs` назад во времени:

- `PAGE_LIMIT = 2000` точек
- `PAGE_RES_MINUTES = 5` → один запрос покрывает ~6.94 дня
- `REQUEST_DELAY_MS = 1100` мс между запросами — мягкий рейт-лимитинг
- Идемпотентно: `insertWindDataBatch` использует `ON CONFLICT (station_id, timestamp) DO NOTHING`
- После вставки пересчитывает только затронутые часы в `hourly_archive`

Глубина истории ограничена эндпоинтом Ambient (~1 год). Дальнейшее накопление идёт ежедневным крон-сбором с горизонтом хранения 10 лет.

### 2.8. Логика безопасности и уведомлений

**Безопасность направления** (зависит от ориентации пляжа Pak Nam Pran):

| Направление | Диапазон | Уровень | Что значит |
|---|---|---|---|
| Offshore | 225°–315° | DANGEROUS (красный) | С земли в море. Опасность сдува. |
| Onshore  | 45°–135°  | SAFE (зелёный) | С моря на берег. Безопасный возврат. |
| Sideshore | остальные | MODERATE (жёлто-оранжевый) | Вдоль берега. |

Расчёт продублирован в `frontend/js/utils/WindUtils.js` и `apple/JollyKiteShared/.../WindSafetyService.swift`, чтобы UI работал без обращения к серверу.

**Push-триггер:** ветер ≥8 узлов 15 минут подряд (3 пятиминутки), разброс направления ≤45°, разница max−avg ≤8 узлов, тренд не падает резко. Не более 1 уведомления в сутки на подписку. Проверка — `NotificationManager.checkWindStability()`.

---

## 3. Frontend — PWA (Vanilla JS)

### 3.1. Стек

- **Vanilla JavaScript ES6 modules** — без сборщика, без фреймворков
- **Leaflet.js** — карта
- **Tailwind CSS** — стили (precompiled, без билда)
- **Service Worker** — оффлайн-кэш и push
- **LocalStorage** — настройки и история

### 3.2. Архитектура

Координатор-паттерн: `App.js` создаёт менеджеры и связывает их через события/прямые вызовы. Каждый менеджер — отдельный ES6-класс. Hash-router (`NavController`) переключает три страницы (`home`, `forecast`, `history`) показом/скрытием элементов с атрибутом `data-route`.

```
App.js
├── NavController          — выпадашка справа сверху + hash-роутер + язык
├── WindDataManager        — fetch + 30-сек цикл + SSE-подписка
├── MapController          — Leaflet, маркеры станций
├── ForecastManager        — 3-дневный прогноз на главной + переиспользуется для 10-дневного
├── ForecastLongPage       — оборачивает ForecastManager: 10 дней + название активной модели (страница /#/forecast)
├── ForecastAccuracy       — таблица RMSE/MAE/Bias по моделям из /api/wind/forecast/backtest/summary
├── WindArrowController    — стрелка-роза ветров
├── HistoryManager         — LocalStorage кэш
├── WindStatistics         — расчёт трендов
├── TodayWindTimeline      — сегодняшний график (Canvas)
├── WeekWindHistory        — недельные графики
├── MonthlyRideableStats   — 12-баров «средние катабельные дни по месяцам года» + подробный список с янв 2024 (страница /#/history)
├── NotificationManager    — Web Push подписка
└── settings/
    ├── SettingsManager
    ├── LocalStorageManager
    └── MenuController     — боковая панель настроек (без секции языка — она переехала в nav-dropdown)
```

Утилиты: `WindUtils` (безопасность, конверсии), `UnitConverter` (knots ↔ м/с ↔ км/ч ↔ mph), `KiteSizeCalculator` (подбор кайта).

### 3.3. Конфигурация

Все константы — в `frontend/js/config.js`. Хардкод значений в других файлах запрещён. Локализация — `frontend/js/i18n/translations/{ru,en,de,th}.js`, ключи иерархические (`history.monthly.hoursShort`).

### 3.4. Service Worker

`frontend/sw.js`:

- **Версия кэша** — `jollykite-v{APP_VERSION}`. `APP_VERSION` хардкодится в первой строке SW.
- **Core assets** — cache-first (HTML, JS, CSS, иконки).
- **API** — network-first с фолбэком на кэш до 24 часов (оффлайн-сценарий на пляже).
- **Тайлы карты** — network-only (не кэшируем).
- При смене `APP_VERSION` старый кэш сносится в `activate`.

### 3.5. Версионирование

**Перед каждым деплоем UI обязательно:**
1. `frontend/version.json` → `{ "version": "X.Y.Z" }`
2. `frontend/sw.js` строка 3 → `const APP_VERSION = 'X.Y.Z';`

Числа должны совпадать. Версия пробрасывается в:
- `/api/version` (backend читает `version.json`)
- UI футер
- Имя кэша SW

### 3.6. UX-фичи

**MonthlyRideableStats** — клик по месяцу разворачивает блок с подневными мини-графиками. Каждый день — 13 столбцов (часы 6–18 Bangkok), высота ∝ средняя скорость (cap 30 узлов), цвет = градиент дисциплины если час «катабельный», иначе серый. Тултип — скорость / гасты / направление. Развёрнутые месяцы кэшируются в `_daysCache` по ключу `${month}|${sport}|${weight}`. Самый свежий месяц — сверху.

**Calibration** — пользователь может задать оффсет направления (±180°), он сохраняется на сервере и применяется ко всем последующим выдачам.

### 3.7. SSE

`WindDataManager` устанавливает `EventSource('/api/wind/stream')`. При обрыве — экспоненциальный бэкофф, при возврате на вкладку — принудительный fetch текущего.

---

## 4. Frontend — Apple-приложения (iOS + macOS)

### 4.1. Стек

- **SwiftUI**, iOS 17+
- **`@Observable`** (новый паттерн iOS 17, не `ObservableObject`)
- **XcodeGen** — генерация `.xcodeproj` из `apple/project.yml` (`brew install xcodegen`, затем `xcodegen generate` в `apple/`)
- **WidgetKit** + **AppIntents** — виджеты и интерактивные действия
- **Swift Package** `JollyKiteShared` — общий код приложения и виджетов

### 4.2. Структура

```
apple/
├── project.yml                — XcodeGen-спецификация
├── JollyKite/                 — iOS-приложение
│   ├── JollyKiteApp.swift     — @main + AppDelegate (APNs)
│   ├── ContentView.swift      — TabView из 5 вкладок
│   ├── Config/
│   ├── Services/              — WindSSEService, PushNotificationService, HapticService
│   ├── ViewModels/            — 5 @Observable
│   └── Views/                 — Dashboard/Forecast/Timeline/Map/Settings/Shared
├── JollyKiteWidgets/          — iOS WidgetKit extension (3 семейства виджетов)
├── JollyKiteMacApp/           — macOS-приложение (SwiftUI, sandbox)
├── JollyKiteMacWidgets/       — macOS WidgetKit extension
└── JollyKiteShared/           — Swift Package, общий для всех таргетов
    └── Sources/JollyKiteShared/
        ├── Models/            — WindData, SafetyLevel, WindForecast, KiteSize, WindUnit
        ├── Networking/        — APIClient, SSEClient (actor), AmbientWeatherClient, OpenMeteoClient
        ├── Services/          — WindSafetyService, KiteSizeService, WorkingHoursService
        ├── Utils/             — PreferencesStore, SharedDataStore, UnitConverter, WindDataCache
        └── Extensions/        — Color+Hex, Date+Bangkok, Double+Formatting
```

Все четыре таргета (`JollyKite`, `JollyKiteWidgets`, `JollyKiteMacApp`, `JollyKiteMacWidgets`) зависят от пакета `JollyKiteShared` — модели, сетевой клиент, сервисы безопасности и подбора снаряжения дублируются один раз.

### 4.3. Виджеты

`JollyKiteWidgets.swift` — bundle из 3 семейств: home (small/medium/large), lock (circular/rectangular/inline). `WindTimelineProvider` использует «умный» refresh: 15 минут в рабочие часы, 1 час вне их. Обмен данными с приложением — через App Group `group.com.jollykite.shared` (`SharedDataStore`).

### 4.4. Bundle IDs

- Приложение: `com.jollykite.app`
- Виджеты: `com.jollykite.app.widgets`

### 4.5. Сценарий APNs

1. iOS запрашивает разрешение → получает device token в `AppDelegate.didRegisterForRemoteNotificationsWithDeviceToken`.
2. Token отправляется на бэкенд через `POST /api/notifications/apns/register`.
3. Бэкенд хранит токены в JSON (PVC), отправляет пуш через `APNsProvider` при срабатывании условий стабильности.

---

## 5. Деплой и инфраструктура

### 5.1. Образы и сборка

- `Dockerfile` → backend (`node:20-alpine`)
- `Dockerfile.nginx` → frontend (`nginx:alpine`, отдаёт `frontend/` через nginx)
- `docker-compose.yml` — локальная разработка (postgres + backend + nginx)
- `docker-compose.prod.yml` — продакшен-сборка

GitHub Actions при push в `main` собирает оба образа и публикует в GHCR (`ghcr.io/jorikfon/jollykite/backend`, `.../nginx`).

### 5.2. Продакшен (k3s + ArgoCD)

```
Internet → Nginx (NodePort) → Backend (ClusterIP:3000)
                                ├── /api/*  → Express
                                └── /*      → static frontend
```

- **Namespace:** `jollykite`
- **PVC:** 1 ГБ на `/app/data` (JSON-состояния)
- **БД:** внешний PostgreSQL, креды в k8s-секрете `pg-credentials`
- **ArgoCD** синкает из `k8s/argocd/`

### 5.3. Секреты в k3s

```bash
kubectl -n jollykite create secret generic pg-credentials \
  --from-literal=PG_HOST=<host> \
  --from-literal=PG_PORT=5432 \
  --from-literal=PG_DATABASE=jollykite \
  --from-literal=PG_USER=jollykite \
  --from-literal=PG_PASSWORD=<password>

kubectl -n jollykite create secret generic apns-credentials \
  --from-file=apns-key=AuthKey_XXXXXXXX.p8 \
  --from-literal=APNS_KEY_ID=XXXXXXXX \
  --from-literal=APNS_TEAM_ID=XXXXXXXXXX \
  --from-literal=APNS_BUNDLE_ID=com.jollykite.app
```

### 5.4. Env-переменные backend

| Имя | Значение |
|---|---|
| `PG_*` / `DATABASE_URL` | Подключение к PostgreSQL |
| `AMBIENT_PROXY_URL` | HTTP-прокси для Ambient Weather (обход DPI) |
| `APNS_KEY_FILE`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` | APNs (опционально) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push |
| `PORT` | По умолчанию 3000 |

### 5.5. Nginx (`config/nginx.conf`)

- `/` → статика (no-cache)
- `/api/wind/stream` → SSE-проксирование (`proxy_buffering off`, таймаут 24ч)
- `/api/*` → backend (стандартные 60 секунд — учитывайте при долгих операциях типа годового импорта; делайте их в фоне)
- Изображения/шрифты — кэш 1 год
- JS/CSS — no-cache (версионируется через SW)

---

## 6. Разработка

### 6.1. Локальный запуск

```bash
# Backend
cd backend && npm install && npm run dev   # node --watch server.js → http://localhost:3000

# PWA — раздаётся бэкендом на http://localhost:3000
# или отдельно (без API):
cd frontend && python3 -m http.server 8000

# iOS
cd apple && xcodegen generate && open JollyKite.xcodeproj
```

После добавления/удаления Swift-файлов — **обязательно** `xcodegen generate`.

### 6.2. Соглашения

| Контекст | Стиль | Пример |
|---|---|---|
| JS-классы | PascalCase | `WindDataManager` |
| JS-методы | camelCase | `fetchCurrentWindData` |
| JS-файлы | PascalCase для классов | `WindUtils.js` |
| Swift-типы и файлы | PascalCase | `DashboardViewModel` |
| API-эндпоинты | kebab-case | `/api/wind/current` |

**JS:** ES6-модули, явные `import`/`export`, классы, `async/await`, никакого хардкода вне `config.js`.
**Swift:** SwiftUI + `@Observable`; общие модели — только в `JollyKiteShared`.
**Ошибки:** все API-вызовы в try/catch, в UI — русские тексты ошибок.

### 6.3. Типовые задачи

- **Новый backend-эндпоинт:** маршрут в `ApiRouter.js` → логика в соответствующем менеджере → `curl http://localhost:3000/api/...`.
- **Новая iOS-вьюшка:** `.swift` в нужный подкаталог `Views/` → `xcodegen generate` → подключить во `ContentView.swift`.
- **Пороги безопасности:** PWA — `frontend/js/config.js` (`windSafety`); iOS — `WindSafetyService.swift`; push — `NotificationManager.checkWindStability()`.
- **Обновление SW:** поднять `APP_VERSION` в обоих местах; в DevTools → Application → Service Workers → Unregister → hard refresh.

### 6.4. Отладка

- Backend: `GET /health`, `GET /api/debug/db-stats`, `GET /api/notifications/check-conditions`. Логи маркируются `✓` / `⚠` / `✗`/`❌`.
- PWA: DevTools → Application (Manifest, Service Workers, Cache, LocalStorage).
- iOS: Xcode Console для SSE; пуши — состояние `PushNotificationService`; виджет — контейнер App Group через `SharedDataStore`.

### 6.5. Тесты

PWA и backend — без автотестов, ручная проверка в браузере. iOS-пакет — есть юнит-тесты: `cd apple/JollyKiteShared && swift test`.

---

## 7. Прочие важные нюансы

- **Геопривязка.** Алгоритм безопасности направления зашит под ориентацию пляжа Pak Nam Pran. Для другого пляжа нужно править диапазоны в `WindUtils` и `WindSafetyService`.
- **DPI-блокировка.** Без `AMBIENT_PROXY_URL` бэкенд не получит данные при работе из РФ.
- **APNs опционален.** Без `.p8` `APNsProvider` тихо отключается, остальное работает.
- **Mobile-first.** UI рассчитан на использование на пляже, в перчатках, при ярком солнце.
- **Без бандлера для PWA.** Никаких webpack/vite — только ES-модули и нативный импорт.

---

## 8. Ресурсы

- Кратко: [CLAUDE.md](../CLAUDE.md)
- README: [README.md](../README.md)
- История изменений — `git log` (отдельный CHANGELOG.md не ведём)
- Контакт: Telegram @gypsy_mermaid
