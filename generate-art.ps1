param(
  [ValidateSet("page", "character")]
  [string]$Kind = "page",

  [string]$ServerUrl = "http://127.0.0.1:8001",
  [string]$ServerHost = "127.0.0.1",
  [int]$Port = 8001,
  [switch]$NoAutoStart,

  [string]$ProjectTitle = "",
  [string]$Cover = "",

  [string]$PageNumber = "",
  [string]$PageText = "",
  [string]$Scene = "",
  [string[]]$Characters = @(),
  [string]$Setting = "",
  [string]$Mood = "",
  [string]$Lighting = "",
  [string]$Composition = "",
  [string]$TextSpace = "",
  [string]$PrintSize = "",

  [string]$Name = "",
  [string]$Role = "",
  [string]$VisualTraits = "",
  [string]$BirthState = "",
  [string]$DistinctiveAnatomy = "",
  [string]$ExpressionPose = "",
  [string]$StyleNotes = "",
  [string]$CoverStoryNotes = "",
  [string]$PromptSeed = "",
  [string]$Background = "auto",
  [string]$Size = "",
  [string]$Quality = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

function Get-PropertyValue {
  param($Object, [string]$Name, $Fallback = "")
  if ($null -eq $Object) { return $Fallback }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property -or $null -eq $property.Value) { return $Fallback }
  return $property.Value
}

function Convert-ImagePathToDataUrl {
  param([string]$ImagePath)
  if (-not $ImagePath.Trim()) { return "" }
  if ($ImagePath -match "^data:image/") { return $ImagePath }
  if ($ImagePath -match "^https?://") { return $ImagePath }

  $resolvedPath = if ([System.IO.Path]::IsPathRooted($ImagePath)) {
    $ImagePath
  } else {
    Join-Path $repoRoot $ImagePath
  }
  if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) { return "" }

  $extension = [System.IO.Path]::GetExtension($resolvedPath).ToLowerInvariant()
  $mimeType = switch ($extension) {
    ".png" { "image/png" }
    ".webp" { "image/webp" }
    ".gif" { "image/gif" }
    default { "image/jpeg" }
  }
  $bytes = [System.IO.File]::ReadAllBytes($resolvedPath)
  return "data:$mimeType;base64,$([Convert]::ToBase64String($bytes))"
}

function Get-CharacterProfiles {
  param([string[]]$RequestedNames, [string]$Context)

  $profiles = @()
  Get-ChildItem -LiteralPath (Join-Path $repoRoot "characters") -Filter "*.json" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne "scene-style.json" } |
    ForEach-Object {
      $profile = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
      $profileName = [string](Get-PropertyValue $profile "name")
      $wasRequested = $RequestedNames | Where-Object { $_ -ieq $profileName }
      $isMentioned = $profileName -and $Context -match "(?i)(?<![\w])$([regex]::Escape($profileName))(?![\w])"
      if ($wasRequested -or $isMentioned) {
        $profiles += $profile
      }
    }
  return @($profiles)
}

$statePath = Join-Path $repoRoot "data\studio-state.json"
$studioState = if (Test-Path -LiteralPath $statePath) {
  Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
} else {
  $null
}
$activeBook = if ($studioState) {
  $studioState.books | Where-Object { $_.id -eq $studioState.activeBookId } | Select-Object -First 1
} else {
  $null
}
if (-not $activeBook -and $studioState) {
  $activeBook = $studioState.books | Select-Object -First 1
}
$activePage = if ($activeBook) {
  $activeBook.pages | Where-Object { $_.id -eq $activeBook.activePageId } | Select-Object -First 1
} else {
  $null
}
if ($activeBook -and $PageNumber.Trim()) {
  $numberedPage = $activeBook.pages |
    Where-Object { [string]$_.number -eq $PageNumber.Trim() } |
    Select-Object -First 1
  if ($numberedPage) {
    $activePage = $numberedPage
  }
}
$sceneStylePath = Join-Path $repoRoot "characters\scene-style.json"
$sceneStyle = if (Test-Path -LiteralPath $sceneStylePath) {
  Get-Content -LiteralPath $sceneStylePath -Raw | ConvertFrom-Json
} else {
  $null
}

function Test-StudioServer {
  try {
    Invoke-RestMethod -Method Get -Uri "$ServerUrl/api/dev-version" -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Start-StudioServer {
  $python = "python"
  $devServer = Join-Path $repoRoot "dev_server.py"
  Start-Process -FilePath $python -ArgumentList @($devServer, $Port, $ServerHost) -WorkingDirectory $repoRoot -WindowStyle Hidden | Out-Null
}

if (-not (Test-StudioServer)) {
  if ($NoAutoStart) {
    throw "The local server is not running at $ServerUrl. Start it with `.\\serve.bat` or rerun without -NoAutoStart."
  }

  Start-StudioServer

  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 500
    if (Test-StudioServer) {
      break
    }
  }

  if (-not (Test-StudioServer)) {
    throw "Could not reach the local server at $ServerUrl after starting it."
  }
}

$resolvedProjectTitle = if ($ProjectTitle.Trim()) { $ProjectTitle } else { [string](Get-PropertyValue $activeBook "projectTitle" "Untitled Book") }
$savedCover = [string](Get-PropertyValue $activeBook "coverReferenceUrl")
if (-not $savedCover) { $savedCover = [string](Get-PropertyValue $activeBook "coverPreviewUrl") }
if (-not $savedCover) { $savedCover = [string](Get-PropertyValue $activeBook "coverFileName") }
$resolvedCover = if ($Cover.Trim()) { $Cover } else { $savedCover }

$payload = @{
  project_title = $resolvedProjectTitle
  cover_data_url = Convert-ImagePathToDataUrl $resolvedCover
  scene_style = $sceneStyle
}

if ($Kind -eq "page") {
  if (-not $Scene.Trim()) {
    throw "Scene is required for page generation."
  }

  $resolvedPageNumber = if ($PageNumber.Trim()) { $PageNumber } else { [string](Get-PropertyValue $activePage "number") }
  $resolvedPageText = if ($PageText.Trim()) { $PageText } else { [string](Get-PropertyValue $activePage "text") }
  $resolvedCharacters = @($Characters)
  $savedPageCharacters = [string](Get-PropertyValue $activePage "characters")
  if ($savedPageCharacters) {
    $resolvedCharacters += @($savedPageCharacters -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  }
  $characterProfiles = Get-CharacterProfiles -RequestedNames $resolvedCharacters -Context "$resolvedPageText $Scene"
  $resolvedCharacters += @($characterProfiles | ForEach-Object { $_.name })
  $resolvedCharacters = @($resolvedCharacters | Where-Object { $_ } | Select-Object -Unique)

  $payload.page_number = $resolvedPageNumber
  $payload.page_text = $resolvedPageText
  $payload.scene_description = $Scene
  $payload.characters = $resolvedCharacters
  $payload.character_profiles = $characterProfiles
  $payload.setting = if ($Setting.Trim()) { $Setting } else { [string](Get-PropertyValue $activePage "setting") }
  $payload.mood = if ($Mood.Trim()) { $Mood } else { [string](Get-PropertyValue $activePage "mood") }
  $payload.lighting = if ($Lighting.Trim()) { $Lighting } else { [string](Get-PropertyValue $activePage "lighting") }
  $payload.composition = if ($Composition.Trim()) { $Composition } else { [string](Get-PropertyValue $activePage "composition") }
  $payload.text_space = if ($TextSpace.Trim()) { $TextSpace } else { [string](Get-PropertyValue $activePage "textSpace") }
  $payload.layout = [string](Get-PropertyValue $activePage "layout")
  $payload.print_size = if ($PrintSize.Trim()) { $PrintSize } else { [string](Get-PropertyValue $activeBook "printSize") }
  if ($Size.Trim()) {
    $payload.size = $Size
  }
  if ($Background.Trim()) {
    $payload.background = $Background
  }
} else {
  if (-not $Name.Trim()) {
    throw "Name is required for character generation."
  }

  $payload.character_name = $Name
  $payload.character_role = $Role
  $payload.visual_traits = $VisualTraits
  $payload.birth_state = $BirthState
  $payload.distinctive_anatomy = $DistinctiveAnatomy
  $payload.expression_pose = $ExpressionPose
  $payload.style_notes = $StyleNotes
  $payload.cover_story_notes = $CoverStoryNotes
  $payload.prompt_seed = $PromptSeed
  if ($Size.Trim()) {
    $payload.size = $Size
  }
  if ($Quality.Trim()) {
    $payload.quality = $Quality
  }
  if ($Background.Trim()) {
    $payload.background = $Background
  }
}

$endpoint = if ($Kind -eq "page") { "/api/generate-page-scene" } else { "/api/generate-character" }
$json = $payload | ConvertTo-Json -Depth 8

try {
  $result = Invoke-RestMethod -Method Post -Uri "$ServerUrl$endpoint" -ContentType "application/json" -Body $json
} catch {
  throw "Image generation failed: $($_.Exception.Message)"
}

if ($result.error) {
  throw $result.error
}

Write-Host "Saved: $($result.file_path)"
Write-Host "URL:   $($result.file_url)"
if ($result.prompt) {
  Write-Host ""
  Write-Host "Prompt:"
  Write-Host $result.prompt
}
