<#
  scripts/start-ollama.ps1
  Run the AGORA Mastery Engine locally against a LOCAL Ollama model.

  First time on a new machine? Run  .\scripts\setup.ps1  once first.

  Usage (from the repo root):
    .\scripts\start-ollama.ps1
    .\scripts\start-ollama.ps1 -Model "qwen3.5:9b"
    .\scripts\start-ollama.ps1 -Password "mypass" -Port 8080
    powershell -ExecutionPolicy Bypass -File .\scripts\start-ollama.ps1   # if scripts are blocked

  Local models only work because the server runs on THIS machine and reaches
  Ollama at 127.0.0.1:11434. Pick the model in the home-page dropdown.
#>
[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingPlainTextForPassword', 'Password',
  Justification = 'Local dev helper: a throwaway local Mastery-Mode password, not a stored secret.')]
param(
  [string]$Model    = 'qwen3.6:35b-a3b',                 # best of the local models for this app
  [string]$Password = 'local',                           # the Mastery Mode password you'll type
  [string]$Project  = 'agora-data-driven',               # GCP project that holds the Firestore data
  [int]   $Port     = 8080,
  [int]   $NumCtx   = 8192                                # Ollama context window (bigger = no prompt truncation)
)

# ollama/npm/gcloud are native commands that write progress to stderr; under
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
Write-Host "  AGORA Mastery Engine - local + Ollama" -ForegroundColor White
Write-Host "  ------------------------------------" -ForegroundColor DarkGray

# 1. Prerequisites ----------------------------------------------------------
if (-not (Have 'node'))   { Fail "Node.js not found. Run  .\scripts\setup.ps1  first (or: winget install OpenJS.NodeJS.LTS, then reopen the terminal)." }
if (-not (Have 'ollama')) { Fail "Ollama not found. Run  .\scripts\setup.ps1  first (or: winget install Ollama.Ollama)." }
if (-not (Test-Path 'package.json')) { Fail "package.json not found - is the repo intact?" }

# 2. Ensure Ollama is running ----------------------------------------------
function Test-Ollama {
  try { Invoke-WebRequest 'http://127.0.0.1:11434' -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true }
  catch { return $false }
}
if (Test-Ollama) {
  Ok "Ollama is already running."
} else {
  Info "Starting Ollama in the background..."
  Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden
  $up = $false
  for ($i = 0; $i -lt 20 -and -not $up; $i++) { Start-Sleep -Seconds 1; $up = Test-Ollama }
  if (-not $up) { Fail "Ollama did not start. Try running 'ollama serve' in another window." }
  Ok "Ollama is up."
}

# 3. Ensure a usable model -------------------------------------------------
function Get-Models {
  return (ollama list 2>$null) -split "`r?`n" |
    Where-Object { $_ -and $_ -notmatch '^NAME\s' } |
    ForEach-Object { ($_ -split '\s+')[0] }
}
$models = @(Get-Models)
if ($models -contains $Model) {
  Ok "Model '$Model' is available."
} else {
  Warn "Model '$Model' not found locally - trying to pull it..."
  ollama pull $Model
  if ($LASTEXITCODE -ne 0) {
    $models = @(Get-Models)
    if ($models.Count -gt 0) {
      $Model = $models[0]
      Warn "Could not pull it; falling back to your installed model '$Model'."
    } else {
      Fail "No models available. Run:  ollama pull qwen2.5:7b   (or pass -Model with one you have)."
    }
  }
}

# 4. Google credentials for Firestore --------------------------------------
$adc = Join-Path $env:APPDATA 'gcloud\application_default_credentials.json'
if (-not (Test-Path $adc)) {
  Warn "No Google credentials found - the app reads its data from Firestore."
  if (Have 'gcloud') {
    $ans = Read-Host "Run 'gcloud auth application-default login' now? (y/N)"
    if ($ans -eq 'y' -or $ans -eq 'Y') { gcloud auth application-default login }
    else { Warn "Skipping - data may not load. Run  .\scripts\setup.ps1  to finish Google login." }
  } else {
    Warn "Run  .\scripts\setup.ps1  to install gcloud and log in."
  }
} else {
  Ok "Google credentials found."
}

# 5. Environment for the server --------------------------------------------
$env:OLLAMA_HOST          = 'http://127.0.0.1:11434'
$env:OLLAMA_MODEL         = $Model
$env:OLLAMA_NUM_CTX       = "$NumCtx"
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
Info "  AI engine             : Local (Ollama) / $Model"
Info "  Pick 'Local (Ollama): $Model' in the home-page dropdown, then sign in."
Write-Host "  (Ctrl+C to stop)" -ForegroundColor DarkGray
Write-Host ""

npm start
