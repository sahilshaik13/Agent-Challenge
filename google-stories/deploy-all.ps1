# ============================================================
#  Google Stories — Full Stack Deploy Script
#  Deploys: Backend (Cloud Run) + MCP Server (Cloud Run) + Frontend (Firebase)
#
#  Usage:
#    .\deploy-all.ps1                        # Deploy everything
#    .\deploy-all.ps1 -Target backend        # Backend only
#    .\deploy-all.ps1 -Target frontend       # Frontend only
#    .\deploy-all.ps1 -Target mcp            # MCP server only
#    .\deploy-all.ps1 -Target backend,mcp    # Backend + MCP only
#
# ============================================================

param(
    [string]$Target = "all"
)

# ── Config ────────────────────────────────────────────────────
$PROJECT_ID    = "sincere-quasar-490216-b4"
$REGION        = "us-central1"
$BUCKET_NAME   = "stories-media-490216"
$BACKEND_IMAGE = "us-central1-docker.pkg.dev/$PROJECT_ID/google-stories-repo/backend:latest"
$MCP_IMAGE     = "us-central1-docker.pkg.dev/$PROJECT_ID/google-stories-repo/mcp:latest"
$BACKEND_NAME  = "google-stories-backend"
$MCP_NAME      = "google-stories-mcp"

# ── Load API keys from .env ───────────────────────────────────
$envFile = Join-Path $PSScriptRoot "backend\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
        }
    }
}

$KEY1 = $env:GEMINI_API_KEY_1
$KEY2 = $env:GEMINI_API_KEY_2
$KEY3 = $env:GEMINI_API_KEY_3
$KEY4 = $env:GEMINI_API_KEY_4

# ── Helpers ───────────────────────────────────────────────────
function Write-Step($msg) {
    Write-Host "`n$msg" -ForegroundColor Cyan
}
function Write-Success($msg) {
    Write-Host "$msg" -ForegroundColor Green
}
function Write-Fail($msg) {
    Write-Host "$msg" -ForegroundColor Red
}
function Write-Info($msg) {
    Write-Host "  $msg" -ForegroundColor Gray
}

$deployTargets = $Target.ToLower().Split(",") | ForEach-Object { $_.Trim() }
$deployAll     = $deployTargets -contains "all"

$startTime = Get-Date

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  Google Stories — Full Stack Deploy" -ForegroundColor Magenta
Write-Host "  Project: $PROJECT_ID" -ForegroundColor Magenta
Write-Host "  Region:  $REGION" -ForegroundColor Magenta
Write-Host "  Target:  $Target" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

$backendURL = ""
$mcpURL     = ""
$frontendURL = ""
$errors     = @()

# ══════════════════════════════════════════════════════════════
#  BACKEND
# ══════════════════════════════════════════════════════════════
if ($deployAll -or $deployTargets -contains "backend") {
    Write-Step "[1/3] BACKEND — Building Docker image..."
    Write-Info "Image: $BACKEND_IMAGE"

    Set-Location (Join-Path $PSScriptRoot "backend")

    gcloud builds submit `
        --tag $BACKEND_IMAGE `
        --project=$PROJECT_ID

    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Backend build FAILED"
        $errors += "Backend build failed"
    } else {
        Write-Step "[1/3] BACKEND — Deploying to Cloud Run..."

        gcloud run deploy $BACKEND_NAME `
            --image $BACKEND_IMAGE `
            --platform managed `
            --region $REGION `
            --allow-unauthenticated `
            --memory 4Gi `
            --cpu 4 `
            --timeout 300 `
            --concurrency 80 `
            --min-instances 1 `
            --project=$PROJECT_ID `
            --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID,GCS_BUCKET_NAME=$BUCKET_NAME,GEMINI_API_KEY_1=$KEY1,GEMINI_API_KEY_2=$KEY2,GEMINI_API_KEY_3=$KEY3,GEMINI_API_KEY_4=$KEY4"

        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Backend deploy FAILED"
            $errors += "Backend deploy failed"
        } else {
            $backendURL = "https://google-stories-backend-830357554266.us-central1.run.app"
            Write-Success "Backend deployed: $backendURL"
        }
    }
}

# ══════════════════════════════════════════════════════════════
#  MCP SERVER
# ══════════════════════════════════════════════════════════════
if ($deployAll -or $deployTargets -contains "mcp") {
    Write-Step "[2/3] MCP SERVER — Building Docker image..."
    Write-Info "Image: $MCP_IMAGE"

    Set-Location (Join-Path $PSScriptRoot "backend")

    gcloud builds submit `
        --config=cloudbuild.mcp.yaml `
        --project=$PROJECT_ID

    if ($LASTEXITCODE -ne 0) {
        Write-Fail "MCP build FAILED"
        $errors += "MCP build failed"
    } else {
        Write-Step "[2/3] MCP SERVER — Deploying to Cloud Run..."

        $backendServiceURL = if ($backendURL) { $backendURL } else { "https://google-stories-backend-830357554266.us-central1.run.app" }

        gcloud run deploy $MCP_NAME `
            --image $MCP_IMAGE `
            --platform managed `
            --region $REGION `
            --allow-unauthenticated `
            --memory 512Mi `
            --cpu 1 `
            --timeout 300 `
            --concurrency 80 `
            --min-instances 1 `
            --project=$PROJECT_ID `
            --set-env-vars "STORIES_BACKEND_URL=$backendServiceURL"

        if ($LASTEXITCODE -ne 0) {
            Write-Fail "MCP deploy FAILED"
            $errors += "MCP deploy failed"
        } else {
            $mcpURL = "https://google-stories-mcp-830357554266.us-central1.run.app/mcp"
            Write-Success "MCP server deployed: $mcpURL"
        }
    }
}

# ══════════════════════════════════════════════════════════════
#  FRONTEND
# ══════════════════════════════════════════════════════════════
if ($deployAll -or $deployTargets -contains "frontend") {
    Write-Step "[3/3] FRONTEND — Building React app..."

    Set-Location (Join-Path $PSScriptRoot "frontend")

    # Update VITE_BACKEND_URL if backend was just deployed
    if ($backendURL) {
        $envContent = "VITE_BACKEND_URL=$backendURL"
        Set-Content -Path ".env" -Value $envContent
        Write-Info "Updated .env: VITE_BACKEND_URL=$backendURL"
    }

    npm run build

    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Frontend build FAILED"
        $errors += "Frontend build failed"
    } else {
        Write-Step "[3/3] FRONTEND — Deploying to Firebase Hosting..."

        firebase deploy --only hosting

        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Frontend deploy FAILED"
            $errors += "Frontend deploy failed"
        } else {
            $frontendURL = "https://sincere-quasar-490216-b4.web.app"
            Write-Success "Frontend deployed: $frontendURL"
        }
    }
}

# ══════════════════════════════════════════════════════════════
#  SUMMARY
# ══════════════════════════════════════════════════════════════
$elapsed = [math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)

Set-Location $PSScriptRoot

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  Deploy Summary — ${elapsed} minutes" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

if ($backendURL) {
    Write-Host "  Backend:  $backendURL" -ForegroundColor Green
} elseif ($deployAll -or $deployTargets -contains "backend") {
    Write-Host "  Backend:  FAILED" -ForegroundColor Red
}

if ($mcpURL) {
    Write-Host "  MCP:      $mcpURL" -ForegroundColor Green
} elseif ($deployAll -or $deployTargets -contains "mcp") {
    Write-Host "  MCP:      FAILED" -ForegroundColor Red
}

if ($frontendURL) {
    Write-Host "  Frontend: $frontendURL" -ForegroundColor Green
} elseif ($deployAll -or $deployTargets -contains "frontend") {
    Write-Host "  Frontend: FAILED" -ForegroundColor Red
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "  Errors:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    Write-Host ""
    exit 1
} else {
    Write-Host ""
    Write-Host "  All deployments successful!" -ForegroundColor Green

    if ($backendURL) {
        Write-Host ""
        Write-Host "  Quick health check:" -ForegroundColor Cyan
        Write-Host "  curl $backendURL/health" -ForegroundColor Gray
    }
    Write-Host "============================================================" -ForegroundColor Magenta
    Write-Host ""
}