param(
  [string]$SourceRoot = "$env:USERPROFILE\.codex\generated_images",
  [string]$DestinationRoot = (Join-Path $PSScriptRoot "outputs")
)

$cutoff = (Get-Date).Date

if (-not (Test-Path -LiteralPath $SourceRoot)) {
  Write-Host "No Codex generated-images cache found at $SourceRoot."
  exit 0
}

New-Item -ItemType Directory -Force -Path $DestinationRoot | Out-Null

$copied = 0
Get-ChildItem -Path $SourceRoot -Recurse -File -Filter "*.png" |
  Where-Object { $_.LastWriteTime -ge $cutoff } |
  ForEach-Object {
    $destination = Join-Path $DestinationRoot $_.Name
    Copy-Item -LiteralPath $_.FullName -Destination $destination -Force
    $copied++
  }

Write-Host "Copied $copied image(s) into $DestinationRoot."
