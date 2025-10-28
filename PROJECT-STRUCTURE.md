# JollyKite Project Structure

This document describes the organized structure of the JollyKite project.

## Directory Structure

```
JollyKite/
├── frontend/                    # Frontend application (PWA)
│   ├── index.html              # Main HTML file
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service Worker
│   ├── kiter.png              # App logo
│   ├── css/                    # Stylesheets
│   │   └── main.css
│   ├── js/                     # JavaScript modules
│   │   ├── App.js             # Main application controller
│   │   ├── config.js          # Configuration
│   │   ├── WindDataManager.js # Wind data fetching
│   │   ├── WindStreamManager.js # SSE connection handler
│   │   ├── MapController.js   # Leaflet map controller
│   │   ├── ForecastManager.js # Weather forecast
│   │   ├── WindArrowController.js # Wind direction arrow
│   │   ├── HistoryManager.js  # Local storage history
│   │   ├── WindStatistics.js  # Wind statistics
│   │   ├── WindHistoryDisplay.js # History UI
│   │   ├── NotificationManager.js # Push notifications
│   │   ├── KiteSizeRecommendation.js # Kite size calculator
│   │   └── utils/             # Utility functions
│   │       ├── WindUtils.js
│   │       └── KiteSizeCalculator.js
│   ├── icons/                  # PWA icons
│   │   ├── icon-*.png
│   │   └── app-icon.svg
│   └── images/                 # Images and assets
│       └── map-background.png
│
├── backend/                     # Node.js backend service
│   ├── server.js               # Main server file
│   ├── package.json            # Node.js dependencies
│   ├── src/                    # Backend source code
│   │   ├── ApiRouter.js       # API routes
│   │   ├── WindDataCollector.js # Wind data collection
│   │   ├── ForecastCollector.js # Forecast collection
│   │   ├── DatabaseManager.js  # SQLite database
│   │   ├── ArchiveManager.js   # Data archiving
│   │   └── NotificationManager.js # Push notifications
│   ├── data/                   # Database files (gitignored)
│   │   ├── wind_data.db       # Current wind data
│   │   ├── wind_archive.db    # Historical data
│   │   └── subscriptions.json # Push notification subscriptions
│   ├── check-db.js            # Database inspection tool
│   └── test-trend.js          # Trend testing tool
│
├── config/                      # Configuration files
│   └── nginx.conf              # Nginx configuration
│
├── scripts/                     # Utility scripts
│   ├── deploy-remote.sh        # Remote deployment script
│   ├── start-with-tunnel.sh    # Start with tunnel
│   └── tunnel-frontend.sh      # Tunnel helper
│
├── .github/                     # GitHub workflows
│   └── workflows/
│       └── docker-publish.yml  # Docker image publishing
│
├── docs/                        # Documentation (optional)
│
├── docker-compose.yml           # Development Docker Compose
├── docker-compose.prod.yml      # Production Docker Compose
├── Dockerfile                   # Backend Docker image
├── .dockerignore               # Docker ignore rules
├── .gitignore                  # Git ignore rules
├── .env.example                # Environment variables example
├── README.md                   # Main project documentation
├── README-DOCKER.md            # Docker deployment guide
├── DEPLOYMENT-GUIDE.md         # Deployment instructions
├── DEVELOPMENT.md              # Development guide
└── PROJECT-STRUCTURE.md        # This file
```

## Component Architecture

### Frontend (PWA)
- **Technology**: Vanilla JavaScript, Leaflet.js, Tailwind CSS
- **Features**:
  - Real-time wind data display via SSE
  - Interactive map with wind direction
  - Weather forecast
  - Wind history tracking
  - Push notifications
  - Kite size recommendations
  - Offline support (Service Worker)
- **Entry Point**: `frontend/index.html`
- **Main Controller**: `frontend/js/App.js`

### Backend (Node.js)
- **Technology**: Node.js, Express, SQLite
- **Features**:
  - Wind data collection every 5 minutes
  - SSE (Server-Sent Events) for real-time updates
  - Historical data archiving
  - Wind trend analysis
  - Push notification management
  - RESTful API
- **Entry Point**: `backend/server.js`
- **Database**: SQLite (in `backend/data/`)

### Configuration (Nginx)
- **Purpose**: Web server and reverse proxy
- **Location**: `config/nginx.conf`
- **Features**:
  - Serves frontend static files
  - Proxies API requests to backend
  - Special SSE streaming configuration
  - Gzip compression
  - Security headers

## Data Flow

```
User Browser (PWA)
    ↕ (HTTP/SSE)
Nginx (Port 80)
    ↕ (Proxy)
Backend (Port 3000)
    ↕ (HTTP)
External APIs (Ambient Weather, Open-Meteo)
    ↓
Backend Database (SQLite)
```

## Deployment Architecture

### Development
```bash
docker-compose up -d
```
- Builds backend from local Dockerfile
- Mounts `./frontend` for live development
- Mounts `./config/nginx.conf` for configuration

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```
- Uses pre-built image from `ghcr.io/jorikfon/jollykite:latest`
- Mounts `./frontend` for static files
- Mounts `./config/nginx.conf` for configuration

## Database Schema

### wind_data.db
- **measurements**: Current wind measurements
- **forecast**: Weather forecast data
- Retention: Last 24 hours

### wind_archive.db
- **archived_measurements**: Historical wind data
- **hourly_stats**: Aggregated hourly statistics
- Retention: 30+ days

### subscriptions.json
- Push notification subscriptions
- Format: JSON array

## API Endpoints

### Wind Data
- `GET /api/wind/current` - Current wind conditions
- `GET /api/wind/stream` - SSE stream for real-time updates
- `GET /api/wind/trend` - Wind trend analysis
- `GET /api/wind/forecast` - Weather forecast
- `GET /api/wind/history` - Historical data

### Notifications
- `POST /api/notifications/subscribe` - Subscribe to push notifications
- `POST /api/notifications/unsubscribe` - Unsubscribe
- `GET /api/notifications/status` - Check subscription status

### Health
- `GET /health` - Service health check

## Environment Variables

### Backend
Configured in `docker-compose.yml`:
- `NODE_ENV` - Environment (production/development)
- `PORT` - Backend port (default: 3000)
- `AMBIENT_WEATHER_API` - Ambient Weather API URL
- `OPEN_METEO_API` - Open-Meteo API URL
- `DATA_COLLECTION_INTERVAL` - Collection interval in ms (default: 300000)
- `ARCHIVE_INTERVAL` - Archive interval in ms (default: 3600000)
- `TZ` - Timezone (default: Asia/Bangkok)

### Tunnel (Optional)
- `LX_ACCESS_TOKEN` - LocalXpose tunnel token

## Development Workflow

1. **Local Development**:
   ```bash
   docker-compose up -d
   # Frontend: http://localhost
   # Backend: http://localhost:3000
   ```

2. **Make Changes**:
   - Frontend: Edit files in `frontend/` (live reload via volume mount)
   - Backend: Edit files in `backend/` and restart container
   - Config: Edit `config/nginx.conf` and reload nginx

3. **Testing**:
   ```bash
   # Check logs
   docker-compose logs -f backend

   # Test API
   curl http://localhost:3000/api/wind/current
   ```

4. **Commit and Push**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

5. **Automated Build**:
   - GitHub Actions automatically builds Docker image
   - Image published to ghcr.io

## File Naming Conventions

- **JavaScript**: PascalCase for classes (`WindDataManager.js`)
- **Configuration**: kebab-case (`docker-compose.yml`)
- **Documentation**: UPPERCASE (`README.md`)
- **Scripts**: kebab-case with `.sh` extension

## Best Practices

1. **Frontend**:
   - Keep components modular
   - Use ES6 modules
   - Cache API responses appropriately
   - Handle offline scenarios

2. **Backend**:
   - Validate all inputs
   - Handle errors gracefully
   - Log important events
   - Use proper HTTP status codes

3. **Docker**:
   - Use volume mounts for data persistence
   - Don't commit `.env` files
   - Use `.dockerignore` to reduce build context
   - Tag images properly

4. **Git**:
   - Write clear commit messages
   - Use feature branches
   - Don't commit sensitive data
   - Keep `.gitignore` updated

## Security Considerations

- Environment variables for sensitive data
- No secrets in git repository
- Nginx security headers enabled
- CORS configured appropriately
- Service Worker caching strategy
- Input validation on backend
- Rate limiting (if needed)

## Performance Optimization

1. **Frontend**:
   - Service Worker caching
   - Gzip compression
   - CDN for external libraries
   - Lazy loading (if needed)

2. **Backend**:
   - Database indexing
   - Connection pooling
   - Data archiving
   - Efficient queries

3. **Nginx**:
   - Gzip compression
   - Static file caching
   - Proxy caching (where appropriate)

## Monitoring and Logging

### Logs Location
```bash
# Backend logs
docker-compose logs backend

# Nginx logs
docker-compose logs nginx

# All logs
docker-compose logs -f
```

### Health Checks
- Frontend: http://localhost/
- Backend: http://localhost:3000/health
- API: http://localhost:3000/api/wind/current

## Troubleshooting

See `DEPLOYMENT-GUIDE.md` and `README-DOCKER.md` for detailed troubleshooting guides.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details
