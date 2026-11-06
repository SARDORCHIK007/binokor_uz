# Start every local service.
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path -LiteralPath (Join-Path -Path $PSScriptRoot -ChildPath "..")).Path
Set-Location -LiteralPath $Root

$EnvFile = Join-Path -Path $Root -ChildPath ".env"
$Example = Join-Path -Path $Root -ChildPath ".env.example"
$Compose = Join-Path -Path $Root -ChildPath "infra\compose.yml"

if (-not (Test-Path -LiteralPath $EnvFile)) {
    Copy-Item -LiteralPath $Example -Destination $EnvFile
}

& docker compose --env-file "$EnvFile" -f "$Compose" up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
