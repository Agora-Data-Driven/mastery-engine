<#
  scripts/start_day.ps1  -  per-session preflight for the Agora Mastery Engine.

  Run at the start of each work session (AFTER scripts/setup.ps1 once). It:
    1. Verifies gcloud CLI creds AND Application Default Credentials (Firestore
       uses ADC locally), reauthing only when needed, and pins the project.
    2. Pulls the latest main (over HTTP/1.1 -- these repos hang on HTTP/2).
    3. Installs npm deps only if the lockfile changed.
    4. Prints the common run commands.

  Run:  .\scripts\start_day.ps1        (or double-click scripts\start_day.cmd)
#>

# gcloud/git/npm write progress to stderr; under 'Stop' PowerShell treats that as fatal
# even on success. Stay on Continue and gate on $LASTEXITCODE.
$ErrorActionPreference = "Continue"

$PROJECT = "agora-data-driven"
$REGION  = "us-central1"
$ACCOUNT = "info@agoradatadriven.com"

$REPO = Split-Path -Parent $PSScriptRoot
Set-Location $REPO

function Ok([string]$m)   { Write-Host "[OK] $m" -ForegroundColor Green }
function Note([string]$m) { Write-Host "[..] $m" -ForegroundColor Yellow }

Write-Host ""
Write-Host "=== Agora Mastery Engine :: start of day ===" -ForegroundColor Cyan
Write-Host "Repo: $REPO" -ForegroundColor DarkGray

# --- 1. gcloud (CLI + ADC) ---------------------------------------------------
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "[X] gcloud not on PATH. Run scripts\setup.ps1 (or open a new terminal)." -ForegroundColor Red
    exit 1
}
Write-Host "[..] Checking gcloud CLI credentials" -ForegroundColor Cyan
$null = gcloud auth print-access-token 2>$null
if ($LASTEXITCODE -ne 0) { Note "CLI creds expired -- launching browser login"; gcloud auth login $ACCOUNT } else { Ok "gcloud CLI credentials valid" }
gcloud config set project $PROJECT 2>$null | Out-Null
gcloud config set run/region $REGION 2>$null | Out-Null

Write-Host "[..] Checking Application Default Credentials (Firestore uses ADC)" -ForegroundColor Cyan
$null = gcloud auth application-default print-access-token 2>$null
if ($LASTEXITCODE -ne 0) { Note "ADC expired -- launching browser login"; gcloud auth application-default login | Out-Null } else { Ok "ADC valid" }
gcloud auth application-default set-quota-project $PROJECT 2>$null | Out-Null
Ok "Active account: $(gcloud config get-value account 2>$null)  (project=$PROJECT region=$REGION)"

# --- 2. Latest code ----------------------------------------------------------
Write-Host "[..] Pulling latest main" -ForegroundColor Cyan
$branch = "$(git rev-parse --abbrev-ref HEAD 2>$null)".Trim()
if ($branch -eq 'main' -and [string]::IsNullOrWhiteSpace((git status --porcelain))) {
    git -c http.version=HTTP/1.1 pull --ff-only
    if ($LASTEXITCODE -ne 0) { Note "pull skipped/failed -- resolve manually if needed" }
} else {
    Note "on '$branch'$(if (git status --porcelain) { ' with local changes' }) -- not auto-pulling"
}

# --- 3. Dependencies (only if the lockfile changed) --------------------------
Write-Host "[..] Checking npm dependencies" -ForegroundColor Cyan
$needInstall = $false
if (-not (Test-Path '.\node_modules')) { $needInstall = $true }
else {
    $lock  = Get-Item '.\package-lock.json' -ErrorAction SilentlyContinue
    $stamp = Get-Item '.\node_modules\.package-lock.json' -ErrorAction SilentlyContinue
    if ($lock -and (-not $stamp -or $lock.LastWriteTime -gt $stamp.LastWriteTime)) { $needInstall = $true }
}
if ($needInstall) { Note "installing (npm ci)"; npm ci } else { Ok "dependencies up to date" }

# --- 4. Cheat sheet ----------------------------------------------------------
Write-Host ""
Write-Host "================ Common commands ================" -ForegroundColor Cyan
Write-Host "  npm run dev                 # local server (node --watch server.js)" -ForegroundColor Gray
Write-Host "  npm start                   # local server (node server.js)" -ForegroundColor Gray
Write-Host "  .\scripts\start-ollama.ps1  # run with a local Ollama model instead of cloud Gemini" -ForegroundColor Gray
Write-Host "  .\scripts\push-branch.ps1   # push WIP to your dev branch" -ForegroundColor Gray
Write-Host "  .\scripts\merge-branches.ps1  # integrate -> land on main -> deploy to Cloud Run ($REGION)" -ForegroundColor Gray
Write-Host "  .\scripts\glm-bypass-mode.ps1 # launch Claude Code on Z.ai GLM" -ForegroundColor Gray
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Ok "Preflight complete."
