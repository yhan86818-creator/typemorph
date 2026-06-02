# TypeFlow — Cloudflare Pages deploy (Windows-friendly)
# Fixes common EBUSY: close dev server & Explorer on /out before running.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "==> Stopping stray Node processes is recommended (npm run dev)." -ForegroundColor Yellow
Write-Host "==> Close any File Explorer window open on the 'out' folder." -ForegroundColor Yellow

if (Test-Path "out") {
  Write-Host "==> Removing old 'out' directory..."
  Remove-Item -Recurse -Force "out"
}

Write-Host "==> Building..."
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Deploying to Cloudflare Pages (typeflow-pro)..."
npx wrangler pages deploy out `
  --project-name typeflow-pro `
  --branch main `
  --commit-dirty=true

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Deploy failed. If you see EBUSY:" -ForegroundColor Red
  Write-Host "  1. Close File Explorer on 'out'"
  Write-Host "  2. Stop 'npm run dev'"
  Write-Host "  3. Pause OneDrive/antivirus scan on this folder"
  Write-Host "  4. Re-run: npm run deploy:only"
  exit $LASTEXITCODE
}

Write-Host "==> Done." -ForegroundColor Green
