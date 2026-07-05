<#
  scripts/setup.ps1
  One-time setup so the AGORA Mastery Engine runs on a fresh Windows machine.

  It installs (via winget) anything missing, logs you into Google Cloud, pulls a
  starter Ollama model if you have none, and installs npm deps. After it finishes,
  start the app with:  .\scripts\start-ollama.ps1

  Run from the repo root:
    .\scripts\setup.ps1
    powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1   # if scripts are blocked
#>
param(
  [string]$Project = 'agora-data-driven',          # GCP project holding the Firestore data
  [string]$Account = 'info@agoradatadriven.com',   # Google account with access to it
  [string]$Model   = 'qwen2.5:7b'                   # portable starter model (only pulled if you have none)
)

# gcloud/ollama/npm/winget are native commands that legitimately write progress
# to stderr; under 'Stop' PowerShell turns that into a fatal NativeCommandError.
# Use 'Continue' and check $LASTEXITCODE where it actually matters.
$ErrorActionPreference = 'Continue'
$RepoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $RepoRoot

function Have($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }
function Info($m) { Write-Host $m -ForegroundColor Cyan }
function Ok($m)   { Write-Host $m -ForegroundColor Green }
function Warn($m) { Write-Host $m -ForegroundColor Yellow }
function Fail($m) { Write-Host $m -ForegroundColor Red; exit 1 }

# Pull freshly-installed tools onto PATH without reopening the terminal.
function Update-Path {
  $machine = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user    = [System.Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user"
}

function Ensure-Tool($cmd, $wingetId, $label) {
  if (Have $cmd) { Ok "$label is installed."; return }
  if (-not (Have 'winget')) {
    Fail "$label is missing and winget is unavailable. Install '$label' manually, then re-run."
  }
  Info "Installing $label (a UAC prompt may appear)..."
  winget install --id $wingetId -e --source winget --accept-package-agreements --accept-source-agreements
  Update-Path
  if (Have $cmd) { Ok "$label installed." }
  else { Warn "$label installed but not on PATH yet - reopen the terminal afterwards." }
}

# Configure GitHub auth so `git push` NEVER opens a browser again. Prefer a pasted
# Personal Access Token (durable, browser-free); fall back to the browser device flow.
# No-op if already signed in (so re-running never re-prompts).
function Set-GitHubAuth {
  $__eap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try {
    if (-not (Have 'gh')) { Warn "gh not on PATH yet - skipping GitHub auth (reopen terminal + re-run)."; return }
    gh auth status *> $null
    if ($LASTEXITCODE -eq 0) { Ok "Already signed in to GitHub."; gh auth setup-git 2>$null | Out-Null; return }
    Info "GitHub sign-in (so git push never opens a browser). Do ONE of:"
    Info "  - copy your PAT to the clipboard, then press ENTER here to use it, or"
    Info "  - paste the PAT on the line below and press Enter (it will be visible), or"
    Info "  - type 'b' then Enter to sign in via browser instead."
    Info "Create one: https://github.com/settings/tokens  (classic; scopes: repo, workflow, read:org)"
    $tok = Read-Host "PAT (or ENTER=use clipboard, b=browser)"
    if ($tok -match '^(b|browser)$') { gh auth login --web --git-protocol https }
    else {
      if ([string]::IsNullOrWhiteSpace($tok)) {
        try { $tok = (Get-Clipboard -Raw 2>$null | Out-String) } catch { $tok = "" }
        if (-not [string]::IsNullOrWhiteSpace($tok)) { Ok "Using the token from your clipboard." }
      }
      $tok = ($tok -replace '\s', '')
      if ([string]::IsNullOrWhiteSpace($tok)) { Warn "No token found (clipboard empty?). Falling back to browser."; gh auth login --web --git-protocol https }
      else {
        $tok | gh auth login --with-token
        if ($LASTEXITCODE -ne 0) { Warn "Token rejected (needs scopes: repo, workflow, read:org). Falling back to browser."; gh auth login --web --git-protocol https }
      }
    }
    $tok = $null
    gh auth setup-git 2>$null | Out-Null
    gh auth status *> $null
    if ($LASTEXITCODE -eq 0) { Ok "GitHub configured - git push will not prompt." } else { Warn "GitHub auth not confirmed - pushes may still prompt." }
  } finally { $ErrorActionPreference = $__eap }
}

Write-Host ""
Write-Host "  AGORA Mastery Engine - setup" -ForegroundColor White
Write-Host "  ----------------------------" -ForegroundColor DarkGray

# 1. Prerequisites ----------------------------------------------------------
Ensure-Tool 'git'    'Git.Git'           'Git'
Ensure-Tool 'node'   'OpenJS.NodeJS.LTS' 'Node.js (LTS)'
Ensure-Tool 'gh'     'GitHub.cli'        'GitHub CLI'
Ensure-Tool 'ollama' 'Ollama.Ollama'     'Ollama'
Ensure-Tool 'gcloud' 'Google.CloudSDK'   'Google Cloud CLI'

# 2. Google Cloud login (regular + application-default for Firestore) -------
if (Have 'gcloud') {
  $active = (gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>$null)
  if ($active -ne $Account) {
    Info "Logging into Google Cloud as $Account (a browser will open)..."
    gcloud auth login $Account
  } else {
    Ok "Already logged in as $Account."
  }
  gcloud config set account $Account 2>$null | Out-Null
  gcloud config set project $Project 2>$null | Out-Null

  $adc = Join-Path $env:APPDATA 'gcloud\application_default_credentials.json'
  if (-not (Test-Path $adc)) {
    Info "Setting up application-default credentials for Firestore (a browser will open)..."
    gcloud auth application-default login
  } else {
    Ok "Application-default credentials present."
  }
  gcloud auth application-default set-quota-project $Project 2>$null | Out-Null
  Ok "Google Cloud configured (account=$Account, project=$Project)."
} else {
  Warn "gcloud not on PATH yet. Reopen the terminal and re-run setup to finish the Google login."
}

# 2b. GitHub sign-in (PAT preferred -> browser-free pushes) -----------------
Set-GitHubAuth

# 3. A starter Ollama model (only if you have none) -------------------------
if (Have 'ollama') {
  Info "Starting Ollama..."
  try { Invoke-WebRequest 'http://127.0.0.1:11434' -UseBasicParsing -TimeoutSec 2 | Out-Null }
  catch { Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden; Start-Sleep -Seconds 3 }

  $models = (ollama list 2>$null) -split "`r?`n" | Where-Object { $_ -and $_ -notmatch '^NAME\s' }
  if (-not $models) {
    Info "No local models found - pulling starter model '$Model'..."
    ollama pull $Model
  } else {
    Ok ("Found {0} local model(s) - keeping them." -f @($models).Count)
  }
}

# 4. npm dependencies -------------------------------------------------------
if (Have 'node') {
  Info "Installing npm dependencies..."
  npm install
  Ok "Dependencies installed."
} else {
  Warn "Node not on PATH yet - reopen the terminal, then run 'npm install'."
}

Write-Host ""
Ok "Setup complete."
Info "Next:  .\scripts\start-ollama.ps1            (uses your best local model)"
Info "   or:  .\scripts\start-ollama.ps1 -Model `"$Model`""
if (-not (Have 'node')) { Warn "First reopen this terminal so newly-installed tools are on PATH." }
Write-Host ""
