param(
  [int[]]$Ports = @(3000, 8008, 3100, 11500)
)

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  Write-Error "adb was not found on PATH. Install Android platform-tools and try again."
  exit 1
}

$deviceLines = (& adb devices) | Select-Object -Skip 1 | Where-Object { $_ -match "\sdevice$" }
if (-not $deviceLines) {
  Write-Error "No authorized Android devices found. Run 'adb devices', accept the device prompt, and try again."
  exit 1
}

Write-Host "Authorized Android devices:" -ForegroundColor Cyan
$deviceLines | ForEach-Object { Write-Host "  $_" }

foreach ($port in $Ports) {
  Write-Host "Reversing tcp:$port -> tcp:$port" -ForegroundColor Yellow
  & adb reverse "tcp:$port" "tcp:$port" | Out-Null
}

Write-Host "" 
Write-Host "ADB reverse is active. Open Chrome on the Android device and use one of these URLs:" -ForegroundColor Green
Write-Host "  http://127.0.0.1:3000  (Next.js dev or production UI)"
Write-Host "  http://127.0.0.1:3100  (mock Playwright stack)"
Write-Host ""
Write-Host "Useful checks:" -ForegroundColor Cyan
Write-Host "  adb reverse --list"
Write-Host "  chrome://inspect/#devices   (desktop Chrome remote inspection)"
