param(
  [ValidateSet("common-pages", "chat-shell", "buddy", "settings", "home-url")]
  [string]$Preset,
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$PassThroughArgs
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $repoRoot "web"

if (-not (Test-Path $webDir)) {
  throw "web package not found at $webDir"
}

function Resolve-BrowserExecutable {
  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe"
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  return $null
}

function Resolve-ImpeccableCommand {
  param([string]$WebDirectory)

  $localCandidates = @(
    (Join-Path $WebDirectory "node_modules/.bin/impeccable.cmd"),
    (Join-Path $WebDirectory "node_modules/.bin/impeccable.ps1"),
    (Join-Path $WebDirectory "node_modules/.bin/impeccable")
  )

  foreach ($candidate in $localCandidates) {
    if (Test-Path $candidate) {
      return @{ Type = "local"; Command = $candidate }
    }
  }

  $npxCommand = Get-Command npx -ErrorAction SilentlyContinue
  if ($npxCommand) {
    return @{ Type = "npx"; Command = $npxCommand.Source }
  }

  return $null
}

function Resolve-NodeCommand {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCommand) {
    return $nodeCommand.Source
  }

  return $null
}

$impeccableCommand = Resolve-ImpeccableCommand -WebDirectory $webDir
if (-not $impeccableCommand) {
  throw "Neither a local Impeccable binary nor npx is available. Install dependencies in the web package or install Node.js/npm."
}

Set-Location $webDir

if ($Preset) {
  $normalizedBaseUrl = $BaseUrl.TrimEnd('/')
  switch ($Preset) {
    "common-pages" {
      $PassThroughArgs = @(
        "detect",
        "./app/page.tsx",
        "./app/share/[shareId]/page.tsx",
        "./components/chat/ChatLayout.tsx",
        "./components/chat/ChatInput.tsx",
        "./components/buddy/BuddyPanel.tsx",
        "./components/settings/SettingsDialog.tsx"
      )
    }
    "chat-shell" {
      $PassThroughArgs = @(
        "detect",
        "./app/page.tsx",
        "./components/chat/ChatLayout.tsx",
        "./components/chat/ChatInput.tsx",
        "./components/layout/Header.tsx"
      )
    }
    "buddy" {
      $PassThroughArgs = @(
        "detect",
        "./components/buddy/BuddyPanel.tsx",
        "./components/buddy/BuddyWidget.tsx"
      )
    }
    "settings" {
      $PassThroughArgs = @(
        "detect",
        "./components/settings/SettingsDialog.tsx",
        "./components/settings/SettingsNav.tsx",
        "./components/settings/GeneralSettings.tsx",
        "./components/settings/ModelSettings.tsx",
        "./components/settings/ApiSettings.tsx"
      )
    }
    "home-url" {
      $PassThroughArgs = @(
        "detect",
        "$normalizedBaseUrl/"
      )
    }
  }
}

$containsUrlTarget = $PassThroughArgs -and ($PassThroughArgs | Where-Object { $_ -match '^https?://' } | Select-Object -First 1)
if ($containsUrlTarget) {
  $browserExecutable = Resolve-BrowserExecutable
  if (-not $browserExecutable) {
    throw "URL auditing requires a local Chrome or Edge executable, but none was found in the standard install paths."
  }

  $env:PUPPETEER_EXECUTABLE_PATH = $browserExecutable

  $nodeCommand = Resolve-NodeCommand
  if (-not $nodeCommand) {
    throw "node is not available on PATH. Install Node.js before running the URL audit helper."
  }

  $urlTargets = @($PassThroughArgs | Where-Object { $_ -match '^https?://' })
  & $nodeCommand (Join-Path $webDir "scripts/run-impeccable-url-audit.mjs") @urlTargets
  if ($LASTEXITCODE -ne 0) {
    throw "Impeccable URL audit exited with code $LASTEXITCODE"
  }

  exit 0
}

if (-not $PassThroughArgs -or $PassThroughArgs.Count -eq 0) {
  Write-Host "No Impeccable arguments supplied. Showing CLI help from the web package..." -ForegroundColor Yellow
  $PassThroughArgs = @("--help")
}

if ($impeccableCommand.Type -eq "local") {
  & $impeccableCommand.Command @PassThroughArgs
} else {
  & $impeccableCommand.Command "--yes" "impeccable@latest" @PassThroughArgs
}
if ($LASTEXITCODE -ne 0) {
  throw "Impeccable exited with code $LASTEXITCODE"
}