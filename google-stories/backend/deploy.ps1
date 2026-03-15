# Google Stories — One-command backend deploy
# Usage: .\deploy.ps1

Write-Host "Building backend image..." -ForegroundColor Cyan

gcloud builds submit --tag us-central1-docker.pkg.dev/sincere-quasar-490216-b4/google-stories-repo/backend:latest --project=sincere-quasar-490216-b4

Write-Host "Deploying to Cloud Run..." -ForegroundColor Cyan

gcloud run deploy google-stories-backend --image us-central1-docker.pkg.dev/sincere-quasar-490216-b4/google-stories-repo/backend:latest --platform managed --region us-central1 --allow-unauthenticated --memory 4Gi --cpu 4 --timeout 300 --concurrency 80 --min-instances 1 --project=sincere-quasar-490216-b4 --set-env-vars "GCP_PROJECT_ID=sincere-quasar-490216-b4,GCS_BUCKET_NAME=stories-media-490216,GEMINI_API_KEY_1=$env:GEMINI_API_KEY_1,GEMINI_API_KEY_2=$env:GEMINI_API_KEY_2,GEMINI_API_KEY_3=$env:GEMINI_API_KEY_3,GEMINI_API_KEY_4=$env:GEMINI_API_KEY_4"

Write-Host "Backend deployed successfully!" -ForegroundColor Green
Write-Host "URL: https://google-stories-backend-830357554266.us-central1.run.app" -ForegroundColor Green