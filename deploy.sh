#!/bin/bash

# Deploy script for manual deployment
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
SERVER_HOST=${SERVER_HOST}
SERVER_USER=${SERVER_USER}
APP_NAME="nest-tg-bot"

echo "🚀 Starting deployment to $ENVIRONMENT environment..."

# Check if required environment variables are set
if [ -z "$SERVER_HOST" ] || [ -z "$SERVER_USER" ]; then
    echo "❌ Error: SERVER_HOST and SERVER_USER environment variables must be set"
    exit 1
fi

# Build Docker image locally (optional)
echo "🔨 Building Docker image..."
docker build -t $APP_NAME:latest .

# Save and transfer image
echo "📦 Transferring image to server..."
docker save $APP_NAME:latest | gzip | ssh $SERVER_USER@$SERVER_HOST "
    cd /opt/$APP_NAME && 
    gunzip | docker load
"

# Deploy on server
echo "🔄 Deploying on server..."
ssh $SERVER_USER@$SERVER_HOST "
    cd /opt/$APP_NAME
    
    # Stop existing containers
    docker-compose down
    
    # Start new containers
    docker-compose up -d
    
    # Run migrations
    docker-compose exec -T app npx prisma migrate deploy
    
    # Check status
    sleep 10
    docker-compose ps
    
    echo '✅ Deployment completed!'
"

echo "🎉 Deployment to $ENVIRONMENT completed successfully!"
