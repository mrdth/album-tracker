# Album Tracker - Deployment Guide

This guide explains how to deploy the Album Tracker application using Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- A music library accessible on the host machine

## Quick Start

1. **Clone the repository** (on your deployment machine):
   ```bash
   git clone <repository-url>
   cd album-tracker
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   nano .env
   ```
   
   Update `MUSIC_LIBRARY_PATH` to point to your music library:
   ```bash
   MUSIC_LIBRARY_PATH=/path/to/your/music/library
   ```

3. **Build and start the services**:
   ```bash
   docker-compose up -d
   ```

4. **Access the application**:
   - Frontend: http://localhost:8175
   - Backend API: http://localhost:3035

## Configuration

### Port Configuration

The default ports are:
- **Frontend**: 8175
- **Backend**: 3035

To change ports, edit `docker-compose.yml`:
```yaml
services:
  frontend:
    ports:
      - "YOUR_PORT:8175"  # Change YOUR_PORT
  backend:
    ports:
      - "YOUR_PORT:3035"  # Change YOUR_PORT
```

### Music Library Path

The music library is mounted as read-only into the backend container. Update the path in `.env`:

```bash
MUSIC_LIBRARY_PATH=/path/to/your/music/library
```

If your music library path contains spaces or special characters, use quotes:
```bash
MUSIC_LIBRARY_PATH="/path/to/My Music/Library"
```

### Database Persistence

The SQLite database is persisted in a Docker volume named `backend-data`. This ensures data survives container restarts.

To backup the database:
```bash
docker-compose exec backend cp /app/data/album-tracker.db /app/data/backup.db
docker cp album-tracker-backend:/app/data/backup.db ./album-tracker-backup.db
```

To restore from backup:
```bash
docker cp ./album-tracker-backup.db album-tracker-backend:/app/data/album-tracker.db
docker-compose restart backend
```

## Docker Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
```

### Rebuild and restart
```bash
docker-compose up -d --build
```

### Stop and remove everything (including volumes)
```bash
docker-compose down -v
```

## Health Checks

Both services include health checks:

Check backend health:
```bash
curl http://localhost:3035/health
```

Check frontend health:
```bash
curl http://localhost:8175/
```

View health status:
```bash
docker-compose ps
```

## Troubleshooting

### Services won't start

Check logs:
```bash
docker-compose logs
```

Verify ports aren't already in use:
```bash
netstat -tulpn | grep -E '8175|3035'
```

### Database errors

The database is automatically initialized on first run. If you encounter issues:

1. Check backend logs:
   ```bash
   docker-compose logs backend
   ```

2. Reset the database (WARNING: This deletes all data):
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

### Permission issues with music library

Ensure the Docker user has read permissions:
```bash
chmod -R a+rX /path/to/your/music/library
```

### Frontend can't connect to backend

1. Check that both services are running:
   ```bash
   docker-compose ps
   ```

2. Verify network connectivity:
   ```bash
   docker-compose exec frontend wget -O- http://backend:3035/health
   ```

3. Check nginx configuration is correct in `frontend/nginx.conf`

## Production Recommendations

### 1. Use a reverse proxy

For production deployments, use a reverse proxy like nginx or Traefik:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8175;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. Enable HTTPS

Use Let's Encrypt with certbot or configure your reverse proxy for SSL.

### 3. Set resource limits

Edit `docker-compose.yml` to add resource limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          memory: 256M
```

### 4. Configure automatic backups

Create a cron job to backup the database:

```bash
0 2 * * * docker-compose -f /path/to/album-tracker/docker-compose.yml exec -T backend cp /app/data/album-tracker.db /app/data/backup-$(date +\%Y\%m\%d).db
```

### 5. Monitor logs

Use a log aggregation tool or configure Docker logging driver:

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Updating the Application

1. Pull latest changes:
   ```bash
   cd album-tracker
   git pull
   ```

2. Rebuild and restart:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

3. Verify services are healthy:
   ```bash
   docker-compose ps
   ```

## Uninstalling

To completely remove the application:

```bash
cd album-tracker
docker-compose down -v --rmi all
cd ..
rm -rf album-tracker
```

## Support

For issues or questions:
- Check the logs: `docker-compose logs`
- Review this documentation
- Check the main README.md for application usage
