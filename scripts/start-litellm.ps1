param(
  [int]$Port = 4000,
  [string]$ConfigPath = "",
  [string]$MasterKey = "agclaw-dev-key",
  [switch]$Inline
)

$ErrorActionPreference = "Stop"

function Resolve-LiteLLMCommand {
  param([string]$RepoRoot)

  $repoVenvCommand = Join-Path $RepoRoot ".venv/Scripts/litellm.exe"
  if (Test-Path $repoVenvCommand) {
    return $repoVenvCommand
  }

  $fromPath = Get-Command litellm -ErrorAction SilentlyContinue
  if ($fromPath) {
    return $fromPath.Source
  }

  return $null
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$defaultConfig = Join-Path $repoRoot "litellm/agclaw-config.local.yaml"
$resolvedConfig = if ($ConfigPath) { $ConfigPath } else { $defaultConfig }

if (-not (Test-Path $resolvedConfig)) {
  throw "LiteLLM config not found at $resolvedConfig"
}

$litellmCommand = Resolve-LiteLLMCommand -RepoRoot $repoRoot
if (-not $litellmCommand) {
  throw "litellm is not available in the repo .venv or on PATH. Install it with: pip install 'litellm[proxy]'"
}

$command = "`$env:LITELLM_MASTER_KEY='$MasterKey'; & '$litellmCommand' --config '$resolvedConfig' --host 127.0.0.1 --port $Port"

if ($Inline) {
  Write-Host $command
  exit 0
}

Start-Process powershell -ArgumentList @('-NoExit', '-Command', $command) -WorkingDirectory $repoRoot | Out-Null
Write-Host "LiteLLM starting on http://127.0.0.1:$Port using $resolvedConfig" -ForegroundColor Green
Write-Host "Use provider 'openai-compatible' and API URL http://127.0.0.1:$Port in AG-Claw." -ForegroundColor Green