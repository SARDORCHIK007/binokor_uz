# Run Python and TypeScript checks on the host.
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path -LiteralPath (Join-Path -Path $PSScriptRoot -ChildPath "..")).Path

Push-Location -LiteralPath (Join-Path -Path $Root -ChildPath "apps\api")
python -m ruff check "app" "tests" (Join-Path -Path $Root -ChildPath "apps\bot")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python -m mypy "app"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Pop-Location

Push-Location -LiteralPath (Join-Path -Path $Root -ChildPath "apps\web")
npm run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Pop-Location
