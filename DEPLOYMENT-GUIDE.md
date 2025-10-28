# JollyKite Deployment Guide

## Quick Deployment (Minimal Files)

You don't need to clone the entire repository! Just copy these files:

### Required Files Only

```bash
# On remote server, create directory
mkdir jollykite && cd jollykite

# Download only required files from GitHub
curl -O https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/nginx.conf
curl -O https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/.env.example

# Rename .env.example to .env (optional for tunnel)
cp .env.example .env

# Create required directories
mkdir -p backend/data

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

That's it! The Docker image will be automatically pulled from GitHub Container Registry.

### What Gets Downloaded Automatically

- **Backend Docker Image**: `ghcr.io/jorikfon/jollykite:latest` (~200MB)
  - Contains: Node.js backend, all dependencies, source code
- **Nginx Image**: `nginx:alpine` (~40MB)
- **Tunnel Image**: `localxpose/localxpose:latest` (optional)

### Frontend Files

The frontend files need to be copied separately since nginx serves them from the host:

```bash
# Download all frontend files
curl -O https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/index.html
curl -O https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/manifest.json
curl -O https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/sw.js
curl -O https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/kiter.png

# Download CSS
mkdir -p css
curl -o css/main.css https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/css/main.css

# Download JS files
mkdir -p js/utils
curl -o js/App.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/App.js
curl -o js/config.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/config.js
curl -o js/WindDataManager.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/WindDataManager.js
curl -o js/WindStreamManager.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/WindStreamManager.js
curl -o js/MapController.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/MapController.js
curl -o js/ForecastManager.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/ForecastManager.js
curl -o js/WindArrowController.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/WindArrowController.js
curl -o js/HistoryManager.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/HistoryManager.js
curl -o js/WindStatistics.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/WindStatistics.js
curl -o js/WindHistoryDisplay.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/WindHistoryDisplay.js
curl -o js/NotificationManager.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/NotificationManager.js
curl -o js/KiteSizeRecommendation.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/KiteSizeRecommendation.js
curl -o js/utils/WindUtils.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/utils/WindUtils.js
curl -o js/utils/KiteSizeCalculator.js https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/js/utils/KiteSizeCalculator.js

# Download icons
mkdir -p icons
# Add icon download commands here if needed

# Download images
mkdir -p images
curl -o images/map-background.png https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/images/map-background.png
```

## Deployment Options Comparison

### Option 1: Minimal Files (RECOMMENDED)
**Pros:**
- Fast deployment
- Small footprint on server
- Only production files
- Easy to update specific files

**Cons:**
- Need to download each file individually
- No git history

**Best for:** Production servers

---

### Option 2: Full Git Clone
```bash
git clone https://github.com/jorikfon/JollyKite.git
cd JollyKite
git checkout docker-containerization
docker-compose -f docker-compose.prod.yml up -d
```

**Pros:**
- Single command to download everything
- Easy to update (git pull)
- Access to all files and history

**Cons:**
- Downloads unnecessary files (.git, docs, etc.)
- Larger disk space usage

**Best for:** Development, staging servers

---

### Option 3: Deployment Script
Create a deployment script that automates the download:

```bash
curl -O https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/scripts/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

---

## What's Inside the Docker Image

The backend Docker image (`ghcr.io/jorikfon/jollykite:latest`) contains:

- ✅ Node.js runtime (v20)
- ✅ Backend source code (`backend/src/*`)
- ✅ All npm dependencies
- ✅ Server configuration

**NOT included in image:**
- ❌ Frontend files (served by nginx from host)
- ❌ Database files (mounted as volume)
- ❌ Configuration files (docker-compose.yml, nginx.conf)

## Directory Structure After Deployment

```
jollykite/
├── docker-compose.prod.yml    # Docker services config
├── nginx.conf                  # Web server config
├── .env                        # Environment variables (optional)
├── backend/
│   └── data/                   # Database files (created automatically)
│       ├── wind_data.db
│       ├── wind_archive.db
│       └── subscriptions.json
├── index.html                  # Frontend files
├── manifest.json
├── sw.js
├── css/
├── js/
├── icons/
└── images/
```

## Updating Deployment

### Update Backend (Docker Image)
```bash
docker-compose -f docker-compose.prod.yml pull backend
docker-compose -f docker-compose.prod.yml up -d backend
```

### Update Frontend
```bash
# Re-download changed files
curl -O https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/index.html
# Nginx will serve new files immediately (no restart needed)
```

### Update Configuration
```bash
curl -O https://raw.githubusercontent.com/jorikfon/JollyKite/docker-containerization/docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Cannot Pull Docker Image
```bash
# Check if image exists
docker pull ghcr.io/jorikfon/jollykite:latest

# If permission denied, login (image should be public though)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### Frontend Not Loading
```bash
# Check if files exist
ls -la index.html js/ css/

# Check nginx logs
docker-compose -f docker-compose.prod.yml logs nginx
```

### Backend Not Connecting
```bash
# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Test backend API
curl http://localhost:3000/api/wind/current
```

## Monitoring

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Check status
docker-compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats
```

## Backup

```bash
# Backup database files
tar -czf backup-$(date +%Y%m%d).tar.gz backend/data/

# Backup configuration
tar -czf config-backup.tar.gz docker-compose.prod.yml nginx.conf .env
```

## Complete Single-Command Deployment

For a fully automated deployment, we can create a deployment script that handles everything.
