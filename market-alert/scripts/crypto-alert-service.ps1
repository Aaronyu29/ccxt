param(
  [ValidateSet('start', 'stop', 'status')]
  [string]$Mode = 'start'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $Root 'data\crypto-alert.pid'
$ErrFile = Join-Path $Root 'data\logs\crypto-monitor.err.log'
$Node = 'C:\Program Files\nodejs\node.exe'
$Tsx = Join-Path $Root 'node_modules\tsx\dist\cli.mjs'

function Get-ManagedProcess {
  if (-not (Test-Path -LiteralPath $PidFile)) { return $null }
  $managedPid = [int](Get-Content -LiteralPath $PidFile -Raw).Trim()
  return Get-Process -Id $managedPid -ErrorAction SilentlyContinue
}

if ($Mode -eq 'status') {
  $process = Get-ManagedProcess
  if ($process) { Write-Output "running pid=$($process.Id)" } else { Write-Output 'stopped' }
  exit 0
}

if ($Mode -eq 'stop') {
  $process = Get-ManagedProcess
  if ($process) { & taskkill.exe /PID $process.Id /T /F | Out-Null }
  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
  exit 0
}

$existing = Get-ManagedProcess
if ($existing) {
  Write-Output "already running pid=$($existing.Id)"
  exit 0
}

New-Item -ItemType Directory -Path (Split-Path -Parent $PidFile) -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path -Parent $ErrFile) -Force | Out-Null
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $Node
$psi.UseShellExecute = $true
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
$psi.WorkingDirectory = $Root
$psi.Arguments = "`"$Tsx`" `"src/main.ts`" `"rule.yaml`""
$process = [System.Diagnostics.Process]::Start($psi)
Set-Content -LiteralPath $PidFile -Value $process.Id -NoNewline
Write-Output "started pid=$($process.Id)"
