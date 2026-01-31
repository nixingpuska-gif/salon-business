$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $repoRoot

$bashCandidates = @(
  "C:\Program Files\Git\bin\bash.exe",
  "C:\Program Files\Git\usr\bin\bash.exe",
  "C:\Program Files (x86)\Git\bin\bash.exe",
  "C:\Program Files (x86)\Git\usr\bin\bash.exe"
)

$bash = $bashCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $bash) {
  throw "Git Bash not found. Install Git for Windows or add bash.exe to PATH."
}

if ($repoRoot -match "^([A-Za-z]):") {
  $drive = $Matches[1].ToLower()
  $rest = $repoRoot.Substring(2) -replace "\\", "/"
  $posixRoot = "/$drive$rest"
} else {
  $posixRoot = $repoRoot -replace "\\", "/"
}

$cmd = "cd `"$posixRoot`" && ./scripts/smoke/run_all.sh"
& $bash -lc $cmd
