param(
    [string]$Target = "all"
)

$PROJECT_ID    = "sincere-quasar-490216-b4"
$REGION        = "us-central1"
$BUCKET_NAME   = "stories-media-490216"
$BACKEND_IMAGE = "us-central1-docker.pkg.dev/$PROJECT_ID/google-stories-repo/backend:latest"
$MCP_IMAGE     = "us-central1-docker.pkg.dev/$PROJECT_ID/google-stories-repo/mcp:latest"
$BACKEND_NAME  = "google-stories-backend"
$MCP_NAME      = "google-stories-mcp"
$BACKEND_URL   = "https://google-stories-backend-830357554266.us-central1.run.app"
$MCP_URL       = "https://google-stories-mcp-830357554266.us-central1.run.app/mcp"
$FRONTEND_URL  = "https://sincere-quasar-490216-b4.web.app"

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

function Write-Step($msg) { Write-Host "`n$msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "$msg"   -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "$msg"   -ForegroundColor Red }
function Write-Info($msg) { Write-Host "  $msg" -ForegroundColor Gray }

$targets   = $Target.ToLower().Split(",") | ForEach-Object { $_.Trim() }
$deployAll = $targets -contains "all"
$startTime = Get-Date
$errors    = @()

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  Google Stories - Full Stack Deploy" -ForegroundColor Magenta
Write-Host "  Project : $PROJECT_ID" -ForegroundColor Magenta
Write-Host "  Region  : $REGION" -ForegroundColor Magenta
Write-Host "  Target  : $Target" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

# ── BACKEND ────────────────────────────────────────────────────────────────
if ($deployAll -or $targets -contains "backend") {
    Write-Step "[1/3] BACKEND - Building Docker image..."
    Write-Info "Image: $BACKEND_IMAGE"

    Set-Location (Join-Path $PSScriptRoot "backend")

    gcloud builds submit --tag $BACKEND_IMAGE --project=$PROJECT_ID

    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Backend build FAILED"
        $errors += "Backend build failed"
    } else {
        Write-Step "[1/3] BACKEND - Deploying to Cloud Run..."

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
            Write-Ok "Backend deployed: $BACKEND_URL"
        }
    }
}

# ── MCP SERVER ─────────────────────────────────────────────────────────────
if ($deployAll -or $targets -contains "mcp") {
    Write-Step "[2/3] MCP SERVER - Building Docker image..."
    Write-Info "Image: $MCP_IMAGE"

    Set-Location (Join-Path $PSScriptRoot "backend")

    gcloud builds submit --config=cloudbuild.mcp.yaml --project=$PROJECT_ID

    if ($LASTEXITCODE -ne 0) {
        Write-Fail "MCP build FAILED"
        $errors += "MCP build failed"
    } else {
        Write-Step "[2/3] MCP SERVER - Deploying to Cloud Run..."

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
            --set-env-vars "STORIES_BACKEND_URL=$BACKEND_URL"

        if ($LASTEXITCODE -ne 0) {
            Write-Fail "MCP deploy FAILED"
            $errors += "MCP deploy failed"
        } else {
            Write-Ok "MCP server deployed: $MCP_URL"
        }
    }
}

# ── FRONTEND ───────────────────────────────────────────────────────────────
if ($deployAll -or $targets -contains "frontend") {
    Write-Step "[3/3] FRONTEND - Building React app..."

    Set-Location (Join-Path $PSScriptRoot "frontend")

    Set-Content -Path ".env" -Value "VITE_BACKEND_URL=$BACKEND_URL"
    Write-Info "Set VITE_BACKEND_URL=$BACKEND_URL"

    npm run build

    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Frontend build FAILED"
        $errors += "Frontend build failed"
    } else {
        Write-Step "[3/3] FRONTEND - Deploying to Firebase Hosting..."

        firebase deploy --only hosting

        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Frontend deploy FAILED"
            $errors += "Frontend deploy failed"
        } else {
            Write-Ok "Frontend deployed: $FRONTEND_URL"
        }
    }
}

# ── SUMMARY ────────────────────────────────────────────────────────────────
$elapsed = [math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)

Set-Location $PSScriptRoot

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  Deploy Summary - ${elapsed} minutes" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

if ($deployAll -or $targets -contains "backend") {
    if ($errors -notcontains "Backend build failed" -and $errors -notcontains "Backend deploy failed") {
        Write-Host "  Backend  : $BACKEND_URL" -ForegroundColor Green
    } else {
        Write-Host "  Backend  : FAILED" -ForegroundColor Red
    }
}

if ($deployAll -or $targets -contains "mcp") {
    if ($errors -notcontains "MCP build failed" -and $errors -notcontains "MCP deploy failed") {
        Write-Host "  MCP      : $MCP_URL" -ForegroundColor Green
    } else {
        Write-Host "  MCP      : FAILED" -ForegroundColor Red
    }
}

if ($deployAll -or $targets -contains "frontend") {
    if ($errors -notcontains "Frontend build failed" -and $errors -notcontains "Frontend deploy failed") {
        Write-Host "  Frontend : $FRONTEND_URL" -ForegroundColor Green
    } else {
        Write-Host "  Frontend : FAILED" -ForegroundColor Red
    }
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
    Write-Host "  Health check: $BACKEND_URL/health" -ForegroundColor Gray
    Write-Host "============================================================" -ForegroundColor Magenta
    Write-Host ""
}