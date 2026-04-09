param(
  [int]$Port = 4000,
  [string]$ConfigPath = "",
  [string]$MasterKey = "agclaw-dev-key",
  [switch]$Inline
)

$ErrorActionPreference = "Stop"

function Test-CommandAvailable {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$defaultConfig = Join-Path $repoRoot "litellm/agclaw-config.local.yaml"
$resolvedConfig = if ($ConfigPath) { $ConfigPath } else { $defaultConfig }

if (-not (Test-Path $resolvedConfig)) {
  throw "LiteLLM config not found at $resolvedConfig"
}

if (-not (Test-CommandAvailable litellm)) {
  throw "litellm is not available on PATH. Install it with: pip install 'litellm[proxy]'"
}

$command = "`$env:LITELLM_MASTER_KEY='$MasterKey'; litellm --config '$resolvedConfig' --host 127.0.0.1 --port $Port"

if ($Inline) {
  Write-Host $command
  exit 0
}

Start-Process powershell -ArgumentList @('-NoExit', '-Command', $command) -WorkingDirectory $repoRoot | Out-Null
Write-Host "LiteLLM starting on http://127.0.0.1:$Port using $resolvedConfig" -ForegroundColor Green
Write-Host "Use provider 'openai-compatible' and API URL http://127.0.0.1:$Port in AG-Claw." -ForegroundColor Green