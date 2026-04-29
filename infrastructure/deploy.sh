#!/usr/bin/env bash
# GuardianFlow AI — Azure Deployment Script
# Usage: bash infrastructure/deploy.sh
set -euo pipefail

RESOURCE_GROUP="guardianflow-rg"
LOCATION="southeastasia"
ACR_NAME="guardianflowacr"
CONTAINER_APP="guardianflow-api"
KV_NAME="guardianflow-kv"

echo "╔══════════════════════════════════════════╗"
echo "║   GuardianFlow AI — Azure Deploy         ║"
echo "╚══════════════════════════════════════════╝"

# 1. Resource Group
echo "▶ Creating resource group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

# 2. Bicep deployment
echo "▶ Deploying Azure resources via Bicep..."
az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file infrastructure/main.bicep \
  --parameters postgresAdminPassword="$(openssl rand -base64 24)" \
               redisKey="placeholder" \
  --output none

# 3. Get outputs
echo "▶ Fetching deployment outputs..."
APPINSIGHTS_CS=$(az deployment group show \
  --resource-group "$RESOURCE_GROUP" \
  --name main \
  --query properties.outputs.appInsightsConnectionString.value -o tsv)

ACR_SERVER=$(az deployment group show \
  --resource-group "$RESOURCE_GROUP" \
  --name main \
  --query properties.outputs.acrLoginServer.value -o tsv)

# 4. Train + push ML model artifacts
echo "▶ Training ML models..."
cd backend && python -m ml.trainer && cd ..

# 5. Build & push Docker image
echo "▶ Building and pushing Docker image..."
az acr login --name "$ACR_NAME"
docker build -t "$ACR_SERVER/backend:$(git rev-parse --short HEAD)" -t "$ACR_SERVER/backend:latest" ./backend
docker push "$ACR_SERVER/backend:latest"

# 6. Update Container App
echo "▶ Updating Container App..."
az containerapp update \
  --name "$CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$ACR_SERVER/backend:latest" \
  --set-env-vars "APPLICATIONINSIGHTS_CONNECTION_STRING=$APPINSIGHTS_CS" \
  --output none

# 7. Run DB migrations
echo "▶ Running Alembic migrations..."
alembic upgrade head

echo ""
echo "✅ GuardianFlow AI deployed successfully!"
echo "   API: $(az containerapp show --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)"
