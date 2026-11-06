# Stop local services.
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path -LiteralPath (Join-Path -Path $PSScriptRoot -ChildPath "..")).Path
$EnvFile = Join-Path -Path $Root -ChildPath ".env"
$Compose = Join-Path -Path $Root -ChildPath "infra\compose.yml"

& docker compose --env-file "$EnvFile" -f "$Compose" down
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
