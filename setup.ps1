Param(
  [string]$MongoUri = "mongodb://127.0.0.1:27017/trading_journal"
)

Write-Host "=== Trading Journal - Automated Setup ===" -ForegroundColor Cyan

# Ensure we are running from the project root
Set-Location -Path $PSScriptRoot

function Ensure-Command {
  param (
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    return $false
  }

  return $true
}

Write-Host "`n1) Checking prerequisites..." -ForegroundColor Yellow

if (-not (Ensure-Command "node")) {
  Write-Error "Node.js is not installed. Please install it from https://nodejs.org and re-run this script."
  exit 1
}

if (-not (Ensure-Command "npm")) {
  Write-Error "npm is not available. It is usually installed with Node.js. Install Node.js from https://nodejs.org and re-run this script."
  exit 1
}

# Try to provision MongoDB + Compass on Windows using Chocolatey if available
Write-Host "`n2) Checking for MongoDB and MongoDB Compass..." -ForegroundColor Yellow

$mongoOk = Ensure-Command "mongod"
if (-not $mongoOk) {
  if (Ensure-Command "choco") {
    Write-Host "MongoDB not detected. Installing MongoDB Community Server and MongoDB Compass via Chocolatey..." -ForegroundColor Yellow
    choco install -y mongodb mongodb-compass
  }
  else {
    Write-Warning @"
MongoDB is not installed and Chocolatey is not available.

Please install:
  - MongoDB Community Server
  - MongoDB Compass (for visual DB browsing)

You can download both from: https://www.mongodb.com/try/download

After installation, re-run this script.
"@
  }
}
else {
  Write-Host "MongoDB server appears to be installed." -ForegroundColor Green
}

Write-Host "`n3) Installing npm dependencies (root + backend + frontend)..." -ForegroundColor Yellow

Write-Host "Running: npm install" -ForegroundColor DarkGray
npm install

Write-Host "Running: npm run install:all" -ForegroundColor DarkGray
npm run install:all

Write-Host "`n4) Creating backend .env (if missing)..." -ForegroundColor Yellow

$backendEnvPath = Join-Path $PSScriptRoot "backend\.env"
if (-not (Test-Path $backendEnvPath)) {
  @(
    "MONGODB_URI=$MongoUri",
    "PORT=4000"
  ) | Set-Content -Path $backendEnvPath -Encoding UTF8

  Write-Host "Created backend\.env with default Mongo URI: $MongoUri" -ForegroundColor Green
}
else {
  Write-Host "backend\.env already exists. Leaving it unchanged." -ForegroundColor Green
}

Write-Host "`n5) Seeding MongoDB with 100 demo trades..." -ForegroundColor Yellow

Push-Location "backend"
$env:MONGODB_URI = $MongoUri
npm run seed:dummies
Pop-Location

Write-Host "`n=== Setup complete ===" -ForegroundColor Cyan
Write-Host @"
To run the full Trading Journal app on this machine:

1) Ensure MongoDB server is running.
2) From the project root, start the dev servers:

   npm run dev

3) Open the frontend in your browser:

   http://localhost:5173

You can inspect the MongoDB data using MongoDB Compass, connecting to:

   $MongoUri
"@

