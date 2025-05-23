# MediTrack Deployment Guide

This guide covers various deployment options for MediTrack, from simple Docker deployments to cloud platform deployments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Docker Deployment](#docker-deployment)
3. [AWS Deployment](#aws-deployment)
4. [Google Cloud Platform](#google-cloud-platform)
5. [Azure Deployment](#azure-deployment)
6. [Heroku Deployment](#heroku-deployment)
7. [DigitalOcean Deployment](#digitalocean-deployment)
8. [Kubernetes Deployment](#kubernetes-deployment)
9. [Production Considerations](#production-considerations)

## Prerequisites

Before deploying MediTrack, ensure you have:

- Docker and Docker Compose installed
- Git installed
- Access to your cloud platform of choice
- Domain name (optional, for custom domain)
- SSL certificate (or use Let's Encrypt)

## Docker Deployment

### Local Docker Deployment

```bash
# Clone the repository
git clone https://github.com/sjafferali/meditrack.git
cd meditrack

# Build and run with Docker Compose
# Option 1: Simple deployment with SQLite
docker compose -f docker-compose.simple.yml up -d

# Option 2: Deployment with PostgreSQL
docker compose -f docker-compose.postgres.yml up -d

# Check status
docker compose -f docker-compose.simple.yml ps

# View logs
docker compose -f docker-compose.simple.yml logs -f
```

### Production Docker Deployment

1. Create production environment file:

```bash
cp .env.example .env.production
```

2. Edit `.env.production`:

```env
# Backend Configuration
DATABASE_URL=postgresql://user:password@db/meditrack
SECRET_KEY=your-secure-secret-key
ENVIRONMENT=production
DEBUG=false

# Frontend Configuration
REACT_APP_API_URL=https://api.yourdomain.com
```

3. Deploy using the available Docker Compose configurations:

```bash
# For SQLite deployment
docker compose -f docker-compose.simple.yml up -d

# For PostgreSQL deployment
docker compose -f docker-compose.postgres.yml up -d
```

## AWS Deployment

### Using AWS ECS (Elastic Container Service)

1. Install AWS CLI and configure:

```bash
aws configure
```

2. Create ECR repositories:

```bash
# Create repositories
aws ecr create-repository --repository-name meditrack-backend
aws ecr create-repository --repository-name meditrack-frontend

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [your-account-id].dkr.ecr.us-east-1.amazonaws.com
```

3. Build and push images:

```bash
# Build the single-container image
docker build -t meditrack:latest .

# Tag image
docker tag meditrack:latest [your-account-id].dkr.ecr.us-east-1.amazonaws.com/meditrack:latest

# Push image
docker push [your-account-id].dkr.ecr.us-east-1.amazonaws.com/meditrack:latest
```

4. Create ECS task definition (`task-definition.json`):

```json
{
  "family": "meditrack",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskRole",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/meditrack-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql://user:password@rds-endpoint/meditrack"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/meditrack",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "backend"
        }
      }
    },
    {
      "name": "frontend",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/meditrack-frontend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/meditrack",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "frontend"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024"
}
```

5. Create ECS cluster and service:

```bash
# Create cluster
aws ecs create-cluster --cluster-name meditrack-cluster

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster meditrack-cluster \
  --service-name meditrack-service \
  --task-definition meditrack:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Using AWS Elastic Beanstalk

1. Install EB CLI:

```bash
pip install awsebcli
```

2. Initialize Elastic Beanstalk:

```bash
cd meditrack
eb init -p docker meditrack-app
```

3. Create environment:

```bash
eb create meditrack-env
```

4. Deploy:

```bash
eb deploy
```

## Google Cloud Platform

### Using Google Cloud Run

1. Install gcloud CLI and authenticate:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

2. Enable required APIs:

```bash
gcloud services enable containerregistry.googleapis.com
gcloud services enable run.googleapis.com
```

3. Build and push images:

```bash
# Configure Docker for GCR
gcloud auth configure-docker

# Build the single-container image
docker build -t gcr.io/YOUR_PROJECT_ID/meditrack .
docker push gcr.io/YOUR_PROJECT_ID/meditrack
```

4. Deploy to Cloud Run:

```bash
# Deploy the application
gcloud run deploy meditrack \
  --image gcr.io/YOUR_PROJECT_ID/meditrack \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=$DATABASE_URL
```

### Using Google Kubernetes Engine (GKE)

1. Create GKE cluster:

```bash
gcloud container clusters create meditrack-cluster \
  --zone us-central1-a \
  --num-nodes 3
```

2. Get cluster credentials:

```bash
gcloud container clusters get-credentials meditrack-cluster --zone us-central1-a
```

3. Deploy using Kubernetes manifests (see Kubernetes section)

## Azure Deployment

### Using Azure Container Instances

1. Install Azure CLI and login:

```bash
az login
az account set --subscription YOUR_SUBSCRIPTION_ID
```

2. Create resource group:

```bash
az group create --name meditrack-rg --location eastus
```

3. Create container registry:

```bash
az acr create --resource-group meditrack-rg --name meditrackcr --sku Basic
az acr login --name meditrackcr
```

4. Build and push image:

```bash
# Build and push the combined image
docker build -t meditrackcr.azurecr.io/meditrack:latest .
docker push meditrackcr.azurecr.io/meditrack:latest
```

5. Deploy container:

```bash
# Deploy the application
az container create \
  --resource-group meditrack-rg \
  --name meditrack \
  --image meditrackcr.azurecr.io/meditrack:latest \
  --ports 8000 \
  --environment-variables DATABASE_URL=$DATABASE_URL SECRET_KEY=$SECRET_KEY
```

## Heroku Deployment

1. Install Heroku CLI and login:

```bash
heroku login
```

2. Create Heroku app:

```bash
heroku create meditrack
```

3. Add Heroku PostgreSQL:

```bash
heroku addons:create heroku-postgresql:hobby-dev --app meditrack
```

4. Deploy application:

```bash
git init
heroku git:remote -a meditrack
git add .
git commit -m "Initial commit"
git push heroku main
```

## DigitalOcean Deployment

### Using App Platform

1. Fork the repository to your GitHub account

2. Go to DigitalOcean App Platform

3. Create new app and select your repository

4. Configure components:
   - Backend: Python/FastAPI
   - Frontend: Static Site
   - Database: PostgreSQL

5. Set environment variables:
   - `DATABASE_URL`
   - `SECRET_KEY`
   - `REACT_APP_API_URL`

6. Deploy

### Using Droplets

1. Create a droplet with Docker pre-installed

2. SSH into the droplet:

```bash
ssh root@your-droplet-ip
```

3. Clone repository and deploy:

```bash
git clone https://github.com/sjafferali/meditrack.git
cd meditrack
# Choose your deployment option
docker compose -f docker-compose.simple.yml up -d
# OR
docker compose -f docker-compose.postgres.yml up -d
```

## Kubernetes Deployment

1. Create namespace:

```bash
kubectl create namespace meditrack
```

2. Create deployment manifest:

```yaml
# meditrack-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: meditrack
  namespace: meditrack
spec:
  replicas: 3
  selector:
    matchLabels:
      app: meditrack
  template:
    metadata:
      labels:
        app: meditrack
    spec:
      containers:
      - name: meditrack
        image: your-registry/meditrack:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: meditrack-secrets
              key: database-url
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: meditrack-secrets
              key: secret-key
---
apiVersion: v1
kind: Service
metadata:
  name: meditrack-service
  namespace: meditrack
spec:
  selector:
    app: meditrack
  ports:
    - protocol: TCP
      port: 8000
      targetPort: 8000
  type: ClusterIP
```

3. Create secrets:

```bash
kubectl create secret generic meditrack-secrets \
  --from-literal=database-url=postgresql://user:password@host/db \
  --from-literal=secret-key=your-secure-secret-key \
  -n meditrack
```

4. Deploy:

```bash
kubectl apply -f meditrack-deployment.yaml
```

5. Create ingress:

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: meditrack-ingress
  namespace: meditrack
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - meditrack.yourdomain.com
    secretName: meditrack-tls
  rules:
  - host: meditrack.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: meditrack-service
            port:
              number: 8000
```

## GitHub Actions CI/CD

MediTrack uses GitHub Actions for continuous integration and deployment. When code is pushed to the main branch, GitHub Actions will:

1. Run all backend and frontend tests
2. Perform code linting and type checking
3. Run security scans and dependency checks
4. Build a Docker image with both backend and frontend
5. Push the image to Docker Hub

The GitHub Actions workflow is defined in `.github/workflows/main.yml` and handles:

- Building the frontend and copying static files to the backend
- Building a single container image using the root Dockerfile
- Tagging and pushing the image to Docker registries

This means that manual building of Docker images is only necessary for local development. For production, simply push to the main branch and let GitHub Actions handle the build and deployment process.

## Production Considerations

### Environment Variables

Create a `.env.production` file:

```env
# Backend
DATABASE_URL=postgresql://user:password@host:5432/meditrack
SECRET_KEY=your-very-secure-secret-key
ALLOWED_HOSTS=api.yourdomain.com
CORS_ORIGINS=https://yourdomain.com
ENVIRONMENT=production
DEBUG=false

# Frontend
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENVIRONMENT=production
```

### Database Configuration

1. Use PostgreSQL for production
2. Enable SSL/TLS for database connections
3. Set up regular backups
4. Configure connection pooling

### Security

1. **SSL/TLS Certificates**:
   ```bash
   # Using Let's Encrypt
   certbot --nginx -d yourdomain.com -d api.yourdomain.com
   ```

2. **Security Headers**:
   ```nginx
   # nginx.conf
   add_header X-Content-Type-Options nosniff;
   add_header X-Frame-Options DENY;
   add_header X-XSS-Protection "1; mode=block";
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
   ```

3. **Rate Limiting**:
   ```nginx
   limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
   limit_req zone=api burst=20 nodelay;
   ```

### Monitoring

1. **Application Monitoring**:
   - Use APM tools (New Relic, DataDog, etc.)
   - Set up error tracking (Sentry, Rollbar)
   - Configure structured logging

2. **Infrastructure Monitoring**:
   - CPU and memory usage
   - Disk space
   - Network traffic
   - Database performance

3. **Health Checks**:
   ```python
   # Add to FastAPI app
   @app.get("/health")
   def health_check():
       return {"status": "healthy", "timestamp": datetime.utcnow()}
   ```

### Backup Strategy

1. **Database Backups**:
   ```bash
   # PostgreSQL backup script
   pg_dump -h localhost -U postgres meditrack > backup_$(date +%Y%m%d).sql
   ```

2. **Automated Backups**:
   - Configure cloud provider's backup service
   - Set up cron jobs for regular backups
   - Store backups in different region

### Scaling

1. **Horizontal Scaling**:
   - Use load balancer
   - Deploy multiple instances
   - Configure auto-scaling

2. **Caching**:
   - Add Redis for session storage
   - Implement API response caching
   - Use CDN for static assets

### Performance Optimization

1. **Frontend**:
   - Enable gzip compression
   - Minify JavaScript and CSS
   - Optimize images
   - Use CDN for static assets

2. **Backend**:
   - Enable query optimization
   - Use database indexing
   - Implement connection pooling
   - Add caching layer

### Disaster Recovery

1. Create disaster recovery plan
2. Test restore procedures regularly
3. Document recovery processes
4. Set up monitoring alerts

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Check DATABASE_URL format
   - Verify network connectivity
   - Check database credentials
   - Ensure database is running

2. **CORS Errors**:
   - Verify CORS_ORIGINS setting
   - Check API URL in frontend
   - Ensure protocol matches (http/https)

3. **Container Won't Start**:
   - Check logs: `docker logs container-name`
   - Verify environment variables
   - Check port conflicts
   - Ensure images are built correctly

### Debugging Commands

```bash
# Check container logs
docker logs meditrack-backend
docker logs meditrack-frontend

# Check container status
docker ps -a

# Enter container shell
docker exec -it meditrack-backend /bin/bash

# Check environment variables
docker exec meditrack-backend env

# Test database connection
docker exec meditrack-backend python -c "from app.db.session import engine; print(engine.url)"
```

## Support

For deployment issues:
1. Check the [GitHub Issues](https://github.com/sjafferali/meditrack/issues)
2. Review logs and error messages
3. Consult cloud provider documentation
4. Open a new issue with details