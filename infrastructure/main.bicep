// GuardianFlow AI — Azure Infrastructure as Code (Bicep)
// Deploys all required Azure resources for Southeast Asia region

@description('Environment name (dev, staging, production)')
param environment string = 'production'

@description('Azure region')
param location string = 'southeastasia'

@description('PostgreSQL admin password')
@secure()
param postgresAdminPassword string

@description('Redis access key')
@secure()
param redisKey string

var prefix = 'guardianflow'
var tags = { project: 'guardianflow-ai', environment: environment }

// ── Log Analytics Workspace ─────────────────────────────────────────────────
resource logWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${prefix}-logs'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// ── Application Insights ────────────────────────────────────────────────────
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-appinsights'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logWorkspace.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ── Key Vault ───────────────────────────────────────────────────────────────
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: '${prefix}-kv'
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

// ── Container Registry ──────────────────────────────────────────────────────
resource acr 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: '${prefix}acr'
  location: location
  tags: tags
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: true }
}

// ── PostgreSQL Flexible Server ──────────────────────────────────────────────
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: '${prefix}-postgres'
  location: location
  tags: tags
  sku: { name: 'Standard_B2ms', tier: 'Burstable' }
  properties: {
    administratorLogin: 'guardianflow'
    administratorLoginPassword: postgresAdminPassword
    version: '15'
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgres
  name: 'guardianflow'
  properties: { charset: 'utf8', collation: 'en_US.utf8' }
}

// ── Redis Cache ─────────────────────────────────────────────────────────────
resource redis 'Microsoft.Cache/redis@2023-04-01' = {
  name: '${prefix}-redis'
  location: location
  tags: tags
  properties: {
    sku: { name: 'Standard', family: 'C', capacity: 1 }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// ── Cosmos DB (Gremlin) ─────────────────────────────────────────────────────
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: '${prefix}-cosmos'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [{ locationName: location, failoverPriority: 0 }]
    capabilities: [{ name: 'EnableGremlin' }]
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
  }
}

// ── Event Hubs ──────────────────────────────────────────────────────────────
resource eventHubNs 'Microsoft.EventHub/namespaces@2022-10-01-preview' = {
  name: '${prefix}-eh'
  location: location
  tags: tags
  sku: { name: 'Standard', tier: 'Standard', capacity: 1 }
}

resource eventHub 'Microsoft.EventHub/namespaces/eventhubs@2022-10-01-preview' = {
  parent: eventHubNs
  name: 'transactions'
  properties: { messageRetentionInDays: 1, partitionCount: 4 }
}

// ── Container Apps Environment ──────────────────────────────────────────────
resource caEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${prefix}-caenv'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logWorkspace.properties.customerId
        sharedKey: logWorkspace.listKeys().primarySharedKey
      }
    }
  }
}

// ── Container App (Backend API) ─────────────────────────────────────────────
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-api'
  location: location
  tags: tags
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: caEnv.id
    configuration: {
      ingress: { external: true, targetPort: 8000 }
      registries: [{ server: acr.properties.loginServer, username: acr.listCredentials().username, passwordSecretRef: 'acr-password' }]
      secrets: [{ name: 'acr-password', value: acr.listCredentials().passwords[0].value }]
    }
    template: {
      containers: [{
        name: 'backend'
        image: '${acr.properties.loginServer}/backend:latest'
        resources: { cpu: json('0.5'), memory: '1Gi' }
        env: [
          { name: 'ENVIRONMENT', value: environment }
          { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        ]
      }]
      scale: { minReplicas: 1, maxReplicas: 10 }
    }
  }
}

// ── Static Web App (Frontend) ───────────────────────────────────────────────
resource swa 'Microsoft.Web/staticSites@2022-09-01' = {
  name: '${prefix}-frontend'
  location: 'eastasia'
  tags: tags
  sku: { name: 'Standard', tier: 'Standard' }
  properties: {}
}

// ── Outputs ─────────────────────────────────────────────────────────────────
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output containerAppFqdn string = containerApp.properties.configuration.ingress.fqdn
output acrLoginServer string = acr.properties.loginServer
output keyVaultUri string = keyVault.properties.vaultUri
