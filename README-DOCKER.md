# Docker Deployment Guide

## Using Pre-built Images from GitHub Container Registry

### Quick Start (Production)

Use the pre-built image from GitHub Container Registry:

```bash
# Pull the latest image
docker pull ghcr.io/jorikfon/jollykite:latest

# Run with production compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Building Locally (Development)

Build the image locally from source:

```bash
# Build and run
docker-compose up -d

# Or build separately
docker-compose build
docker-compose up -d
```

## Available Images

Images are automatically built and published to GitHub Container Registry via GitHub Actions:

- `ghcr.io/jorikfon/jollykite:latest` - Latest build from main branch
- `ghcr.io/jorikfon/jollykite:docker-containerization` - Latest build from docker-containerization branch
- `ghcr.io/jorikfon/jollykite:v*` - Tagged releases (e.g., v1.0.0)
- `ghcr.io/jorikfon/jollykite:<branch>-<sha>` - Specific commit builds

## Image Registry

All images are published to: https://github.com/jorikfon/JollyKite/pkgs/container/jollykite

## Configuration Files

- `docker-compose.yml` - Local development (builds from Dockerfile)
- `docker-compose.prod.yml` - Production (uses pre-built image from ghcr.io)
- `Dockerfile` - Backend service build instructions

## Environment Variables

Create a `.env` file in the root directory:

```bash
# LocalXpose tunnel token (optional)
LX_ACCESS_TOKEN=your_token_here
```

Backend environment variables are configured in docker-compose files.

## Updating to Latest Image

```bash
# Pull latest image
docker-compose -f docker-compose.prod.yml pull

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring

```bash
# View logs
docker-compose logs -f backend

# Check status
docker-compose ps

# View all logs
docker-compose logs -f
```

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Troubleshooting

### Image Pull Issues

If you encounter permission errors pulling from ghcr.io:

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Then pull
docker pull ghcr.io/jorikfon/jollykite:latest
```

Note: Public images don't require authentication.

### Building Issues

```bash
# Clean build (no cache)
docker-compose build --no-cache

# Rebuild specific service
docker-compose build backend
```

## Architecture

- **Backend**: Node.js service collecting wind data every 5 minutes
- **Nginx**: Web server serving static frontend files and proxying API requests
- **Tunnel**: LocalXpose tunnel for public access (optional)

All services communicate via `jollykite-network` Docker network.
