# Переезд JollyKite на VPS (pnp.miko.ru, Bangmod) — runbook

Цель: перенести k3s-miko → один VPS (Debian 13, Docker, swap уже есть). Домен и клиенты не меняются.
Старый прод на k3s остаётся рабочим до cutover и ~2 недели после (откат = вернуть A/CNAME в Route53).

## 0. Подготовка VPS (один раз)

```bash
apt-get install -y awscli git
git clone https://github.com/jorikfon/jollykite /opt/jollykite   # или rsync репо
cd /opt/jollykite/deploy/vps
cp env.sample .env && chmod 600 .env     # PG_PASSWORD (новый, openssl rand -hex 16), APNS_*
mkdir -p data secrets
# APNs .p8 → secrets/apns-key (chmod 600); берётся из k8s secret apns-credentials (владелец/эскалация)
```

`PG_PASSWORD` и APNs-ключ не коммитить и не вставлять в чат.

## 1. Первый запуск без Caddy (DNS ещё на старом проде)

```bash
docker compose pull
docker compose up -d postgres backend nginx
docker compose exec nginx wget -qO- http://localhost/health      # → ok/JSON
```

## 2. Перенос данных (пробный прогон — можно много раз)

С data-vm (дамп, нужен доступ к PG под эскалацией/RO-идентити) и NFS (`/data/nfs/shared/jollykite` → `./data`):

```bash
# дамп (custom format) прямо в Postgres на VPS
pg_dump -h <data-vm> -U <user> -Fc jollykite | \
  ssh root@pnp.miko.ru 'cd /opt/jollykite/deploy/vps && docker compose exec -T postgres pg_restore -U jollykite -d jollykite --clean --if-exists --no-owner'
# JSON-состояния (push-подписки, APNs-токены, calibration, notification_log)
rsync -a <nfs-host>:/data/nfs/shared/jollykite/ /opt/jollykite/deploy/vps/data/
docker compose restart backend
```

Проверка: `docker compose logs backend | grep -E "✓|✗|❌"`, `curl localhost` через nginx: `/api/wind/current`, `/api/debug/db-stats` (число строк `wind_data` ≈ как на старом проде).

## 3. Cutover

1. За сутки: в Route53 снизить TTL записи `pnp` до 60 с.
2. Остановить запись на старом проде: `kubectl -n jollykite scale deploy jollykite-backend --replicas=0`.
3. Финальная дельта: повторить дамп/restore и rsync из шага 2.
4. Применить патч удаления прокси **в этот же момент** и пересобрать образ (push в `main` → GitHub Actions → GHCR):
   `git apply deploy/vps/remove-proxy.patch` (+ убрать упоминания прокси в `CLAUDE.md` и `docs/ARCHITECTURE.md` §5.4;
   `k8s/argocd/backend.yaml` — env `AMBIENT_PROXY_URL` уйдёт вместе с самим манифестом).
   ⚠️ Раньше cutover нельзя: из РФ без прокси Ambient Weather недоступен.
   На VPS: `docker compose pull && docker compose up -d backend`.
5. Route53: `pnp` → A `116.204.182.158` (вместо CNAME на traefikserver).
6. `docker compose up -d caddy` — Let's Encrypt выпустит сертификат (нужны открытые 80/443 и уже переключённый DNS).
7. Проверка: `https://pnp.miko.ru/health`, `/api/wind/current`, SSE `curl -N https://pnp.miko.ru/api/wind/stream`,
   PWA в браузере, iOS-виджет/пуш; логи backend: сбор ветра каждые 5 мин, прогноз Open-Meteo без таймаутов.

Откат: A → CNAME `traefikserver.miko.ru`, `kubectl scale deploy jollykite-backend --replicas=1`
(данные на data-vm не трогаем ~2 недели; дельту после cutover на старый прод не переливаем — ветер ре-импортится `AmbientHistoryImporter`).

## 4. Бэкапы и мониторинг

```bash
# /etc/jollykite-backup.env (chmod 600): S3_BUCKET=miko-pg-backups, S3_PREFIX=pnp-vps, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION=eu-central-1
echo '17 2 * * * root /opt/jollykite/deploy/vps/backup.sh >>/var/log/jollykite-backup.log 2>&1' > /etc/cron.d/jollykite-backup
/opt/jollykite/deploy/vps/backup.sh          # пробный прогон
```

⚠️ cron считает время сервера, а оно в **UTC**: 02:17 по cron — это 09:17 по Бангкоку.

S3 lifecycle: удалять объекты `pnp-vps/` старше 30 дней. Uptime-проверка `https://pnp.miko.ru/health` — Zabbix или внешний.
Тест восстановления: `pg_restore` последнего дампа на чистый `postgres:16-alpine` хотя бы раз (проверено 13.11: дамп из бакета, счётчики совпали).

## 5. Через ~2 недели

Удалить ArgoCD-приложение и PVC `jollykite-data` в k3s-miko, затем БД `jollykite` на data-vm.

## 6. Доставка из GitHub Actions (вместо ArgoCD)

Push в `main` → job `build-and-push` собирает оба образа в GHCR → job `deploy` заходит по SSH на VPS
и запускает `/usr/local/bin/jollykite-deploy`: `docker compose pull`, `up -d postgres backend nginx`,
health-гейт `wget /health` (10 попыток). Провал гейта валит job, откат — revert коммита.
Другие ветки, PR и теги доставку не запускают.

Что настроено на VPS:

- пользователь `deploy` (uid 999), sudo **только** на `/usr/local/bin/jollykite-deploy`
  (`/etc/sudoers.d/jollykite-deploy`), никаких других прав;
- ключ в `~deploy/.ssh/authorized_keys` с `command="sudo -n /usr/local/bin/jollykite-deploy",restrict`
  — через этот ключ можно выполнить только деплой, шелла нет.

⚠️ **Одна ручная правка остаётся за владельцем.** В `/etc/ssh/sshd_config` стоит `AllowUsers mikoadmin`,
поэтому `deploy` не пустит. Нужно: `AllowUsers mikoadmin deploy` → `sshd -t && systemctl reload ssh`.
До этой правки job `deploy` будет падать с `Permission denied (publickey)` — workflow в `main`
не пушить раньше неё.

Секреты репозитория (Settings → Secrets → Actions): `VPS_DEPLOY_KEY` — приватный ключ `deploy`,
`VPS_SSH_KNOWN_HOSTS` — `[116.204.182.158]:7722 ssh-ed25519 AAAA…`. В workflow хост задан IP-адресом,
а не `pnp.miko.ru`: DNS до cutover (§3.5) смотрит на старый прод.

Ручной деплой (fallback): `ssh -p 7722 deploy@116.204.182.158` — выполнится тот же скрипт.
Caddy деплоем не управляется: поднимается один раз на cutover (§3.6).
