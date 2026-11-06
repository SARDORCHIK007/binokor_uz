# Run API and web tests on the host.
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path -LiteralPath (Join-Path -Path $PSScriptRoot -ChildPath "..")).Path

Push-Location -LiteralPath (Join-Path -Path $Root -ChildPath "apps\api")
python -m pytest
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Pop-Location

Push-Location -LiteralPath (Join-Path -Path $Root -ChildPath "apps\web")
npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Pop-Location
