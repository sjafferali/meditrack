# MediTrack Production Deployment Guide

## Overview

This guide covers deploying MediTrack to production environments using Docker.

## Deployment Options

### Option 1: Single Server (VPS/Cloud VM)

Suitable for small to medium deployments.

#### Requirements
- Ubuntu 20.04+ or similar Linux distribution
- 2 CPU cores minimum
- 2GB RAM minimum
- 10GB disk space
- Docker and Docker Compose installed

#### Steps

1. **Prepare the server**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Add your user to docker group
sudo usermod -aG docker $USER
```

2. **Clone the repository**
```bash
git clone https://github.com/yourusername/meditrack.git
cd meditrack
```

3. **Configure environment**
```bash
# Copy production compose file
cp docker-compose.prod.yml docker-compose.yml

# Create .env file
cat > .env << EOF
SECRET_KEY=your-generated-secret-key
DATABASE_URL=sqlite:///./data/meditrack.db
ENVIRONMENT=production
EOF
```

4. **Build and deploy**
```bash
# Build images
./build_images.sh

# Start services
docker compose up -d

# Check status
docker compose ps
```

5. **Set up reverse proxy (Nginx)**
```bash
# Install Nginx
sudo apt install nginx

# Create site configuration
sudo tee /etc/nginx/sites-available/meditrack << EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/meditrack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Set up SSL with Let's Encrypt**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com
```

### Option 2: Docker Swarm Cluster

For high availability and horizontal scaling.

#### Setup

1. **Initialize Swarm**
```bash
# On manager node
docker swarm init

# Join worker nodes
docker swarm join --token <token> <manager-ip>:2377
```

2. **Create secrets**
```bash
echo "your-secret-key" | docker secret create meditrack_secret_key -
```

3. **Deploy stack**
```bash
docker stack deploy -c docker-compose.prod.yml meditrack
```

### Option 3: Kubernetes Deployment

For enterprise deployments with advanced orchestration.

#### Kubernetes Manifests

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: meditrack

---
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: meditrack
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: meditrack-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          value: "sqlite:///./data/meditrack.db"
        volumeMounts:
        - name: data
          mountPath: /app/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: backend-data

---
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: meditrack
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: meditrack-frontend:latest
        ports:
        - containerPort: 80

---
# services.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: meditrack
spec:
  selector:
    app: backend
  ports:
  - port: 8000
    targetPort: 8000

---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: meditrack
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

## Cloud Platform Deployments

### AWS ECS

1. **Build and push to ECR**
```bash
# Authenticate with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag meditrack-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/meditrack-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/meditrack-backend:latest
```

2. **Create task definitions and services via AWS Console or Terraform**

### Google Cloud Run

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT-ID/meditrack-backend
gcloud builds submit --tag gcr.io/PROJECT-ID/meditrack-frontend

# Deploy
gcloud run deploy meditrack-backend --image gcr.io/PROJECT-ID/meditrack-backend --platform managed
gcloud run deploy meditrack-frontend --image gcr.io/PROJECT-ID/meditrack-frontend --platform managed
```

### Azure Container Instances

```bash
# Create resource group
az group create --name meditrack-rg --location eastus

# Create container registry
az acr create --resource-group meditrack-rg --name meditrackacr --sku Basic

# Build and push
az acr build --registry meditrackacr --image meditrack-backend:latest ./backend
az acr build --registry meditrackacr --image meditrack-frontend:latest ./frontend

# Deploy
az container create --resource-group meditrack-rg --name meditrack-backend --image meditrackacr.azurecr.io/meditrack-backend:latest
```

## Monitoring and Logging

### Prometheus + Grafana

1. **Add metrics endpoint to FastAPI**
```python
from prometheus_client import make_asgi_app

# Add to main.py
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)
```

2. **Deploy monitoring stack**
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### ELK Stack

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: elasticsearch:7.17.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  logstash:
    image: logstash:7.17.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: kibana:7.17.0
    ports:
      - "5601:5601"
```

## Backup Strategy

### Automated Daily Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/meditrack"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec meditrack-backend-1 cp /app/data/meditrack.db /app/data/meditrack_${DATE}.db
docker cp meditrack-backend-1:/app/data/meditrack_${DATE}.db $BACKUP_DIR/

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/meditrack_${DATE}.db s3://your-backup-bucket/meditrack/

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -type f -mtime +7 -delete
```

### Restore Procedure

```bash
# Stop services
docker compose down

# Restore database
docker cp /backups/meditrack/meditrack_20240116_120000.db meditrack-backend-1:/app/data/meditrack.db

# Start services
docker compose up -d
```

## Security Checklist

- [ ] Use strong SECRET_KEY
- [ ] Enable HTTPS/TLS
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Set up intrusion detection
- [ ] Regular backup testing
- [ ] Monitor for vulnerabilities
- [ ] Implement CSP headers

## Performance Optimization

### Caching

1. **Add Redis for caching**
```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

2. **Implement caching in FastAPI**
```python
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://redis")
    FastAPICache.init(RedisBackend(redis), prefix="meditrack-cache:")
```

### CDN for Static Assets

```nginx
# Add CDN configuration
location /static {
    proxy_pass https://cdn.your-domain.com;
    proxy_cache_valid 200 1y;
    add_header Cache-Control "public, immutable";
}
```

## Troubleshooting Production Issues

### High Memory Usage
```bash
# Check memory usage
docker stats

# Limit container memory
docker run -m 512m meditrack-backend
```

### Slow Response Times
```bash
# Check logs
docker logs meditrack-backend-1 --tail 100

# Profile application
python -m cProfile -o profile.out app/main.py
```

### Database Locked
```bash
# Check connections
docker exec meditrack-backend-1 fuser /app/data/meditrack.db

# Restart backend
docker compose restart backend
```

## Maintenance

### Rolling Updates
```bash
# Update one container at a time
docker compose up -d --no-deps --build backend
docker compose up -d --no-deps --build frontend
```

### Health Monitoring
```bash
#!/bin/bash
# health-check.sh

BACKEND_HEALTH=$(curl -s http://localhost:8000/health | jq -r .status)
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

if [ "$BACKEND_HEALTH" != "healthy" ] || [ "$FRONTEND_STATUS" != "200" ]; then
    echo "Health check failed!"
    # Send alert
    curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
         -H 'Content-type: application/json' \
         --data '{"text":"MediTrack health check failed!"}'
fi
```

## Cost Optimization

1. **Use spot instances** for non-critical workloads
2. **Implement auto-scaling** based on metrics
3. **Schedule non-production environments** to shut down after hours
4. **Use ARM-based instances** where supported
5. **Optimize Docker images** for smaller size

## Compliance and Regulations

If handling health data:
1. Implement audit logging
2. Enable encryption at rest
3. Set up data retention policies
4. Implement access controls
5. Regular security audits
6. HIPAA compliance measures