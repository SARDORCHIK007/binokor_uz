# Apply Alembic migrations inside the API container.
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path -LiteralPath (Join-Path -Path $PSScriptRoot -ChildPath "..")).Path
$EnvFile = Join-Path -Path $Root -ChildPath ".env"
$Compose = Join-Path -Path $Root -ChildPath "infra\compose.yml"

& docker compose --env-file "$EnvFile" -f "$Compose" exec -T api alembic upgrade head
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
