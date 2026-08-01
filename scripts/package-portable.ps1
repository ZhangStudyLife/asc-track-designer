$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$package = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw -Encoding utf8 | ConvertFrom-Json
$source = Join-Path $root 'src-tauri\target\release\asc-track-designer.exe'
$release = Join-Path $root 'release'
$destination = Join-Path $release "ASC.$($package.version).exe"

Push-Location $root
try {
    & npm.cmd run tauri:build
    if ($LASTEXITCODE -ne 0) {
        throw "Tauri build failed with exit code $LASTEXITCODE"
    }

    New-Item -ItemType Directory -Path $release -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Force
    Write-Output $destination
} finally {
    Pop-Location
}
