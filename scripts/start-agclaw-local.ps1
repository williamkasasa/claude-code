param(
  [string]$Model = "qwen2.5-coder:7b",
  [int]$BackendPort = 8008,
  [int]$WebPort = 3000,
  [switch]$PullModel,
  [switch]$Inline,
  [switch]$SkipOllamaHealthCheck,
  [switch]$EnableRoutedVision,
  [int]$VisionPort = 11500,
  [string]$VisionCaptionModel = "qwen2.5vl:7b",
  [string]$VisionHmiModel = "qwen2.5vl:7b",
  [string]$VisionOcrModel = "gemma3:4b",
  [switch]$PullVisionModels,
  [switch]$StartLiteLLM,
  [int]$LiteLLMPort = 4000,
  [switch]$RunVisionGate
)

$ErrorActionPreference = "Stop"

function Test-CommandAvailable {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Resolve-OllamaCommand {
  $fromPath = Get-Command ollama -ErrorAction SilentlyContinue
  if ($fromPath) {
    return $fromPath.Source
  }

  $candidates = @(
    "D:\Apps\Ollama\ollama.exe",
    (Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe")
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      $parent = Split-Path -Parent $candidate
      if ($env:PATH -notlike "*$parent*") {
        $env:PATH = "$parent;$env:PATH"
      }
      return $candidate
    }
  }

  return $null
}

function Resolve-PythonCommand {
  param([string]$RepoRoot)

  $repoVenvPython = Join-Path $RepoRoot ".venv/Scripts/python.exe"
  if (Test-Path $repoVenvPython) {
    return $repoVenvPython
  }

  $fromPath = Get-Command python -ErrorAction SilentlyContinue
  if ($fromPath) {
    return $fromPath.Source
  }

  return $null
}

function Wait-HttpReady {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        return $true
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  return $false
}

function Start-OllamaHost {
  param(
    [string]$OllamaCommand,
    [string]$HostValue,
    [string]$ProbeUrl,
    [string]$Label,
    [switch]$SkipHealthCheck
  )

  if ($SkipHealthCheck) {
    return
  }

  $ready = $false
  try {
    $probe = Invoke-WebRequest -Uri $ProbeUrl -UseBasicParsing -TimeoutSec 2
    $ready = $probe.StatusCode -eq 200
  } catch {
    $ready = $false
  }

  if ($ready) {
    return
  }

  Write-Host "Starting $Label Ollama service on $HostValue..." -ForegroundColor Cyan
  $command = "`$env:OLLAMA_HOST='$HostValue'; & '$OllamaCommand' serve"
  Start-Process powershell -ArgumentList @('-NoExit', '-Command', $command) | Out-Null

  if (-not (Wait-HttpReady -Url $ProbeUrl -TimeoutSeconds 20)) {
    throw "$Label Ollama did not become healthy on $HostValue."
  }
}

function Pull-OllamaModels {
  param(
    [string]$OllamaCommand,
    [string]$HostValue,
    [string[]]$Models
  )

  foreach ($pullModel in ($Models | Where-Object { $_ } | Select-Object -Unique)) {
    Write-Host "Pulling Ollama model $pullModel via $HostValue..." -ForegroundColor Cyan
    $previousHost = $env:OLLAMA_HOST
    try {
      $env:OLLAMA_HOST = $HostValue
      & $OllamaCommand pull $pullModel
      $exitCode = $LASTEXITCODE
    } finally {
      if ($null -eq $previousHost) {
        Remove-Item Env:OLLAMA_HOST -ErrorAction SilentlyContinue
      } else {
        $env:OLLAMA_HOST = $previousHost
      }
    }

    if ($exitCode -ne 0) {
      throw "ollama pull failed for model $pullModel"
    }
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $repoRoot "web"
$promptfooDir = Join-Path $repoRoot "promptfoo"
$backendPythonPath = Join-Path $repoRoot "backend"
$backendUrl = "http://127.0.0.1:$BackendPort"
$defaultOllamaHost = "127.0.0.1:11434"
$defaultOllamaUrl = "http://$defaultOllamaHost/api/tags"
$visionOllamaHost = "127.0.0.1:$VisionPort"
$visionOllamaUrl = "http://$visionOllamaHost/api/tags"
$liteLLMUrl = "http://127.0.0.1:$LiteLLMPort"
$pythonCommand = Resolve-PythonCommand -RepoRoot $repoRoot

if ($RunVisionGate) {
  $EnableRoutedVision = $true
}

if (-not $pythonCommand) {
  throw "python is not available in the repo .venv or on PATH. Install Python or fix PATH before running AG-Claw."
}

if (-not (Test-CommandAvailable npm)) {
  throw "npm is not available on PATH. Install Node.js or fix PATH before running AG-Claw."
}

$ollamaCommand = Resolve-OllamaCommand
if (-not $ollamaCommand) {
  throw "ollama is not available on PATH. Install Ollama first, then rerun this script."
}

Start-OllamaHost -OllamaCommand $ollamaCommand -HostValue $defaultOllamaHost -ProbeUrl $defaultOllamaUrl -Label "default" -SkipHealthCheck:$SkipOllamaHealthCheck

if ($EnableRoutedVision) {
  Start-OllamaHost -OllamaCommand $ollamaCommand -HostValue $visionOllamaHost -ProbeUrl $visionOllamaUrl -Label "routed vision" -SkipHealthCheck:$SkipOllamaHealthCheck
}

if ($PullModel) {
  Pull-OllamaModels -OllamaCommand $ollamaCommand -HostValue $defaultOllamaHost -Models @($Model)
}

if ($PullVisionModels) {
  Pull-OllamaModels -OllamaCommand $ollamaCommand -HostValue $(if ($EnableRoutedVision) { $visionOllamaHost } else { $defaultOllamaHost }) -Models @($VisionCaptionModel, $VisionHmiModel, $VisionOcrModel)
}

$backendEnvPrefix = "`$env:PYTHONPATH='$backendPythonPath';"
if ($EnableRoutedVision) {
  $backendEnvPrefix += " `$env:AGCLAW_SCREEN_VISION_PROVIDER_HMI='ollama';"
  $backendEnvPrefix += " `$env:AGCLAW_SCREEN_VISION_BASE_URL_HMI='http://$visionOllamaHost';"
  $backendEnvPrefix += " `$env:AGCLAW_SCREEN_VISION_MODEL_HMI='$VisionHmiModel';"
  $backendEnvPrefix += " `$env:AGCLAW_SCREEN_VISION_TIMEOUT_SECONDS_HMI='360';"
}

$backendCommand = "$backendEnvPrefix & '$pythonCommand' -m agclaw_backend.server --host 127.0.0.1 --port $BackendPort"

$webCommand = "Set-Location '$webDir'; `$env:AGCLAW_BACKEND_URL='$backendUrl'; npm run dev -- --port $WebPort"

$liteLLMCommand = "Set-Location '$repoRoot'; & '$PSScriptRoot/start-litellm.ps1' -Port $LiteLLMPort"

$visionGateCommand = @(
  "Set-Location '$promptfooDir'",
  "`$env:AGCLAW_PROMPTFOO_VISION_PROVIDER_CAPTION='ollama'",
  "`$env:AGCLAW_PROMPTFOO_VISION_BASE_URL_CAPTION='http://$visionOllamaHost'",
  "`$env:AGCLAW_PROMPTFOO_VISION_MODEL_CAPTION='$VisionCaptionModel'",
  "`$env:AGCLAW_PROMPTFOO_VISION_PROVIDER_HMI='ollama'",
  "`$env:AGCLAW_PROMPTFOO_VISION_BASE_URL_HMI='http://$visionOllamaHost'",
  "`$env:AGCLAW_PROMPTFOO_VISION_MODEL_HMI='$VisionHmiModel'",
  "`$env:AGCLAW_PROMPTFOO_VISION_PROVIDER_OCR='ollama'",
  "`$env:AGCLAW_PROMPTFOO_VISION_BASE_URL_OCR='http://$visionOllamaHost'",
  "`$env:AGCLAW_PROMPTFOO_VISION_MODEL_OCR='$VisionOcrModel'",
  "npm run gate:vision-all"
) -join '; '

if ($Inline) {
  Write-Host "Start backend in a separate terminal with:" -ForegroundColor Yellow
  Write-Host $backendCommand
  Write-Host ""
  Write-Host "Start web in a separate terminal with:" -ForegroundColor Yellow
  Write-Host $webCommand
  Write-Host ""
  if ($EnableRoutedVision) {
    Write-Host "Start routed vision Ollama in a separate terminal with:" -ForegroundColor Yellow
    Write-Host "`$env:OLLAMA_HOST='$visionOllamaHost'; & '$ollamaCommand' serve"
    Write-Host ""
  }
  if ($StartLiteLLM) {
    Write-Host "Start LiteLLM in a separate terminal with:" -ForegroundColor Yellow
    Write-Host $liteLLMCommand
    Write-Host ""
  }
  if ($RunVisionGate) {
    Write-Host "Run the routed promptfoo gate with:" -ForegroundColor Yellow
    Write-Host $visionGateCommand
    Write-Host ""
  }
  Write-Host "Open http://localhost:$WebPort" -ForegroundColor Green
  exit 0
}

if ($StartLiteLLM) {
  if (Wait-HttpReady -Url "$liteLLMUrl/health/readiness" -TimeoutSeconds 2) {
    Write-Host "LiteLLM already ready on $liteLLMUrl" -ForegroundColor Green
  } else {
    Write-Host "Starting LiteLLM on port $LiteLLMPort..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList @('-NoExit', '-Command', $liteLLMCommand) -WorkingDirectory $repoRoot | Out-Null
    if (-not (Wait-HttpReady -Url "$liteLLMUrl/health/readiness" -TimeoutSeconds 60)) {
      Write-Warning "LiteLLM did not report readiness on $liteLLMUrl/health/readiness. Continuing with direct Ollama routing."
    }
  }
}

if (Wait-HttpReady -Url "$backendUrl/health" -TimeoutSeconds 2) {
  Write-Host "AG-Claw backend already ready on $backendUrl" -ForegroundColor Green
} else {
  Write-Host "Starting AG-Claw backend on port $BackendPort..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList @('-NoExit', '-Command', "Set-Location '$repoRoot'; $backendCommand") -WorkingDirectory $repoRoot | Out-Null

  if (-not (Wait-HttpReady -Url "$backendUrl/health" -TimeoutSeconds 30)) {
    throw "Backend did not become healthy on $backendUrl"
  }
}

if (Wait-HttpReady -Url "http://127.0.0.1:$WebPort/health" -TimeoutSeconds 2) {
  Write-Host "AG-Claw web shell already ready on http://127.0.0.1:$WebPort" -ForegroundColor Green
} else {
  Write-Host "Starting AG-Claw web shell on port $WebPort..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList @('-NoExit', '-Command', $webCommand) -WorkingDirectory $webDir | Out-Null

  if (-not (Wait-HttpReady -Url "http://127.0.0.1:$WebPort/health" -TimeoutSeconds 90)) {
    throw "Web shell did not become ready on http://127.0.0.1:$WebPort"
  }
}

Write-Host ""
Write-Host "AG-Claw local stack started." -ForegroundColor Green
Write-Host "Web UI: http://localhost:$WebPort"
Write-Host "Backend: $backendUrl"
Write-Host "Provider: ollama"
Write-Host "Model: $Model"
if ($EnableRoutedVision) {
  Write-Host "Routed vision Ollama: http://$visionOllamaHost" -ForegroundColor Green
  Write-Host "Vision caption/HMI model: $VisionCaptionModel" -ForegroundColor Green
  Write-Host "Vision OCR model: $VisionOcrModel" -ForegroundColor Green
}
if ($StartLiteLLM) {
  Write-Host "LiteLLM: $liteLLMUrl" -ForegroundColor Green
}
Write-Host ""
Write-Host "In the UI: Settings -> enable Local mode -> provider ollama -> model $Model -> Check -> chat"

if ($RunVisionGate) {
  Write-Host ""
  Write-Host "Running routed promptfoo vision gate..." -ForegroundColor Cyan
  Invoke-Expression $visionGateCommand
}
