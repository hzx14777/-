# YJ Smart Exam Platform - register logon scheduled task
# Starts yj-bff (static front-end + API on port 80) automatically after Windows logon.
# Pure ASCII on purpose: PS 5.1 parses non-BOM files as ANSI, Chinese text would break it.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$bff  = Join-Path $root 'yj-bff'
$log  = Join-Path $root 'run-logs'

if (-not (Test-Path $log)) { New-Item -ItemType Directory -Path $log -Force | Out-Null }

function Find-Node {
  $cand = @()

  # 1) system PATH
  $cmd = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($cmd) { $cand += $cmd.Source }

  # 2) bundled runtime of this machine
  $verDir = Join-Path $env:USERPROFILE '.workbuddy\binaries\node\versions'
  if (Test-Path $verDir) {
    Get-ChildItem $verDir -Directory | Sort-Object Name -Descending | ForEach-Object {
      $exe = Join-Path $_.FullName 'node.exe'
      if (Test-Path $exe) { $cand += $exe }
    }
  }

  # 3) standard install locations
  $cand += (Join-Path $env:ProgramFiles 'nodejs\node.exe')
  $cand += (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe')

  foreach ($c in $cand) {
    if ($c -and (Test-Path $c)) { return (Resolve-Path $c).Path }
  }
  return $null
}

$node = Find-Node
if (-not $node) {
  Write-Host '[ERROR] node.exe not found, install Node.js 18+ first.'
  exit 1
}
Write-Host "node.exe : $node"

if (-not (Test-Path (Join-Path $bff 'server.js'))) {
  Write-Host "[ERROR] missing $bff\server.js"
  exit 2
}

# NOTE: using node.exe directly as the task action gets terminated by the OS with
# CTRL_C (0xC000013A) on this machine. Wrapping it in cmd.exe -> run-bff.cmd is stable,
# runs without a window, and lets the script resolve node and write logs itself.
$bat    = Join-Path $root 'run-bff.cmd'
$cmdExe = Join-Path $env:SystemRoot 'System32\cmd.exe'

$action = New-ScheduledTaskAction -Execute $cmdExe -Argument "/c `"`"$bat`"`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew `
  -StartWhenAvailable

Register-ScheduledTask -TaskName 'YJ-Exam-Platform' `
  -Action $action -Trigger $trigger -Settings $settings `
  -Description 'YJ Smart Exam Platform, auto start on logon, port 80' -Force | Out-Null

Set-Content -Path (Join-Path $log 'node-path.txt') -Value $node -Encoding ASCII

Write-Host '[OK] scheduled task YJ-Exam-Platform registered (starts on logon)'
Write-Host '     entry: http://127.0.0.1/yj/login'
exit 0
