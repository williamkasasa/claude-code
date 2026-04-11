$ErrorActionPreference = "Stop"

$npmCommand = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCommand) {
  throw "npm is not available on PATH. Install Node.js/npm before checking promptfoo latest."
}

$output = & $npmCommand.Source view promptfoo version 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "promptfoo latest version check failed with exit code $LASTEXITCODE"
}

$versionLine = $output | Where-Object { $_ -match '^[0-9]+\.[0-9]+\.[0-9]+' } | Select-Object -Last 1
if (-not $versionLine) {
  throw "promptfoo latest version output did not contain a semantic version."
}

Write-Output $versionLine