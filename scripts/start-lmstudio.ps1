<#
  scripts/start-lmstudio.ps1
  Run the AGORA Mastery Engine locally against a LOCAL LM Studio model.

  Prerequisite: install LM Studio (https://lmstudio.ai), download at least one
  model in its UI, and (recommended) enable the CLI once with:  lms bootstrap

  Usage (from the repo root):
    .\scripts\start-lmstudio.ps1
    .\scripts\start-lmstudio.ps1 -Model "qwen2.5-7b-instruct"
    .\scripts\start-lmstudio.ps1 -Password "mypass" -Port 8080
    powershell -ExecutionPolicy Bypass -File .\scripts\start-lmstudio.ps1   # if scripts are blocked

  Local models only work because the server runs on THIS machine and reaches
  LM Studio's OpenAI-compatible API at 127.0.0.1:1234. Pick the model in the
  home-page dropdown.
#>
[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingPlainTextForPassword', 'Password',
  Justification = 'Local dev helper: a throwaway local Mastery-Mode password, not a stored secret.')]
param(
  [string]$Model    = '',                                # blank = use whatever LM Studio has loaded; pass an id to JIT-load it
  [string]$Password = 'agora',                           # the Mastery Mode password you'll type
  [string]$Project  = 'agora-data-driven',               # GCP project that holds the Firestore data
  [string]$Account  = 'info@agoradatadriven.com',        # Google account with access to that project
  [int]   $Port     = 8080,
  [string]$LmHost   = 'http://127.0.0.1:1234'            # LM Studio's OpenAI-compatible server
)

# lms/npm/gcloud are native commands that write progress to stderr; under
# 'Stop' PowerShell turns that into a fatal NativeCommandError. Use 'Continue'
# and check $LASTEXITCODE where it matters.
$ErrorActionPreference = 'Continue'
$RepoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $RepoRoot

function Have($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }
function Info($m)    { Write-Host $m -ForegroundColor Cyan }
function Ok($m)      { Write-Host $m -ForegroundColor Green }
function Warn($m)    { Write-Host $m -ForegroundColor Yellow }
function Fail($m)    { Write-Host $m -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  AGORA Mastery Engine - local + LM Studio" -ForegroundColor White
Write-Host "  ----------------------------------------" -ForegroundColor DarkGray

# 1. Prerequisites ----------------------------------------------------------
if (-not (Have 'node'))   { Fail "Node.js not found. Run  .\scripts\setup.ps1  first (or: winget install OpenJS.NodeJS.LTS, then reopen the terminal)." }
if (-not (Test-Path 'package.json')) { Fail "package.json not found - is the repo intact?" }

# 2. Ensure LM Studio's server is running -----------------------------------
function Test-LmStudio {
  try { Invoke-WebRequest "$LmHost/v1/models" -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true }
  catch { return $false }
}
if (Test-LmStudio) {
  Ok "LM Studio server is already running at $LmHost."
} elseif (Have 'lms') {
  Info "Starting LM Studio server in the background (lms server start)..."
  lms server start | Out-Null
  $up = $false
  for ($i = 0; $i -lt 20 -and -not $up; $i++) { Start-Sleep -Seconds 1; $up = Test-LmStudio }
  if (-not $up) { Fail "LM Studio server did not come up. Open the LM Studio app, go to the 'Developer' (server) tab, and click 'Start Server' on port 1234." }
  Ok "LM Studio server is up."
} else {
  Fail @"
LM Studio is not reachable at $LmHost and the 'lms' CLI was not found.
  1. Install LM Studio:  https://lmstudio.ai
  2. Download a model in its UI (e.g. Qwen2.5 7B Instruct).
  3. Either start the server from the app's 'Developer' tab (port 1234),
     or run  lms bootstrap  once, then re-run this script.
"@
}

# 3. Check a model is available (and optionally load the requested one) -----
function Get-LmModels {
  try {
    $resp = Invoke-RestMethod "$LmHost/v1/models" -TimeoutSec 3
    return @($resp.data | ForEach-Object { $_.id })
  } catch { return @() }
}
if ($Model -and (Have 'lms')) {
  Info "Ensuring model '$Model' is loaded..."
  lms load $Model | Out-Null   # JIT-load; no-op if already loaded
}
$models = @(Get-LmModels)
if ($models.Count -eq 0) {
  Warn "LM Studio reports no loaded models. Load one in the app (or pass -Model <id> with the CLI installed)."
  Warn "The app will still start, but local generation will fail until a model is loaded."
} else {
  if (-not $Model) { $Model = $models[0] }
  Ok "Available LM Studio model(s): $($models -join ', ')"
}

# 4. Google credentials for Firestore --------------------------------------
# The app authenticates to Firestore with Application Default Credentials (ADC).
# A *present* ADC file isn't enough - it can be the wrong account (e.g. one with
# no access to $Project), which surfaces as PERMISSION_DENIED at runtime. So we
# actually test a read against $Project and only (re-)login if that fails.
function Test-FirestoreAccess {
  param([string]$Proj)
  try {
    $token = (gcloud auth application-default print-access-token 2>$null)
    if (-not $token) { return $false }
    $uri = "https://firestore.googleapis.com/v1/projects/$Proj/databases/(default)/documents/topics?pageSize=1"
    Invoke-RestMethod -Uri $uri -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 8 | Out-Null
    return $true   # 2xx = the ADC account can read this project's data
  } catch {
    return $false  # missing ADC, wrong account, or no permission
  }
}

if (-not (Have 'gcloud')) {
  Warn "gcloud not found - the app reads its data from Firestore and may fail to load."
  Warn "Run  .\scripts\setup.ps1  to install gcloud and log in."
} else {
  # Make $Account/$Project the active gcloud context (the default pick when the
  # ADC browser opens). Harmless warnings if $Account isn't logged in yet.
  gcloud config set account $Account 2>$null | Out-Null
  gcloud config set project $Project 2>$null | Out-Null

  if (Test-FirestoreAccess $Project) {
    Ok "Firestore access for project '$Project' confirmed."
  } else {
    Warn "Current credentials can't read Firestore in '$Project'."
    Warn "A browser will open - sign in as  $Account  (the account that owns the data)."
    gcloud auth application-default login
    gcloud auth application-default set-quota-project $Project 2>$null | Out-Null
    if (Test-FirestoreAccess $Project) {
      Ok "Firestore access confirmed."
    } else {
      Warn "Still no access to '$Project'. Ensure $Account has the 'Cloud Datastore User' role there."
    }
  }
}

# 5. Environment for the server --------------------------------------------
$env:LMSTUDIO_HOST        = $LmHost
if ($Model) { $env:LMSTUDIO_MODEL = $Model }
$env:APP_PASSWORD         = $Password
$env:GOOGLE_CLOUD_PROJECT = $Project
$env:PORT                 = "$Port"
if (-not $env:SESSION_SECRET) {
  $env:SESSION_SECRET = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
}
# Optional: set $env:GEMINI_API_KEY before running if you also want the Cloud option.

# 6. Dependencies + launch --------------------------------------------------
if (-not (Test-Path 'node_modules')) { Info "Installing npm dependencies (first run)..."; npm install }

Write-Host ""
Ok  "Starting on http://localhost:$Port"
Info "  Mastery Mode password : $Password"
Info "  AI engine             : Local (LM Studio)$(if ($Model) { " / $Model" })"
Info "  Pick 'Local (LM Studio): ...' in the home-page dropdown, then sign in."
Write-Host "  (Ctrl+C to stop)" -ForegroundColor DarkGray
Write-Host ""

npm start
