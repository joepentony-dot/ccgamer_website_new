# ================================
#  CCG THUMBNAIL VALIDATOR v6
#  (Correctly uses "thumbnail")
# ================================

Write-Host "`n=== CCG Thumbnail Validator v6 (thumbnail-aware) ===`n"

# Paths (relative to repo root)
$gameJsonPath = "games/games.json"
$thumbFolder  = "resources/images/thumbnails/all"

if (!(Test-Path $gameJsonPath)) {
    Write-Host "ERROR: games.json not found at $gameJsonPath" -ForegroundColor Red
    exit 1
}
if (!(Test-Path $thumbFolder)) {
    Write-Host "ERROR: Thumbnail folder not found at $thumbFolder" -ForegroundColor Red
    exit 1
}

Write-Host "Loading games.json..."
$games = Get-Content $gameJsonPath -Raw | ConvertFrom-Json

Write-Host "Scanning real thumbnails in /all/..."
$realFiles = Get-ChildItem $thumbFolder -File | Select-Object -ExpandProperty Name

# Build a case-insensitive HashSet of actual filenames
$realSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($f in $realFiles) { [void]$realSet.Add($f) }

$noThumbnailField = 0
$alreadyCorrect   = 0
$fixedToAll       = 0
$missingFile      = 0

$missingList = @()
$fixedList   = @()

Write-Host "Checking each game.thumbnail against /all/..."

foreach ($game in $games) {

    # Check if "thumbnail" property exists and is non-empty
    if (-not ($game.PSObject.Properties.Name -contains 'thumbnail') -or
        [string]::IsNullOrWhiteSpace($game.thumbnail)) {

        $noThumbnailField++
        $missingList += "NO THUMB FIELD: $($game.id)  ($($game.title))"
        continue
    }

    $thumbPath = $game.thumbnail.Trim()
    $fileName  = Split-Path $thumbPath -Leaf

    if ($realSet.Contains($fileName)) {
        # There IS a file in /all/ with this name
        $correctPath = "resources/images/thumbnails/all/$fileName"

        if ($thumbPath -ne $correctPath) {
            # Path points somewhere else (e.g. /arcade/) but filename exists in /all/
            $game.thumbnail = $correctPath
            $fixedToAll++
            $fixedList += "$($game.id) ($($game.title))  ->  $fileName"
        }
        else {
            # Already perfect
            $alreadyCorrect++
        }
    }
    else {
        # The filename used in JSON does NOT exist in /all/
        $missingFile++
        $missingList += "MISSING FILE: $($game.id) ($($game.title))  ->  $fileName"
    }
}

# Save new corrected games.json
$newFile = "games/games_v6.json"
$games | ConvertTo-Json -Depth 12 | Out-File $newFile -Encoding utf8

Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
Write-Host ("Total games:            {0}" -f $games.Count)
Write-Host ("Already correct:        {0}" -f $alreadyCorrect)
Write-Host ("Fixed to /all/:         {0}" -f $fixedToAll)
Write-Host ("Missing file in /all/:  {0}" -f $missingFile)
Write-Host ("No thumbnail field:     {0}" -f $noThumbnailField)

$TotalMismatches = $fixedToAll + $missingFile
Write-Host ("`nTOTAL MISMATCHES (paths not matching /all/ initially): {0}" -f $TotalMismatches) -ForegroundColor Yellow

Write-Host ("`nCorrected file saved as: {0}" -f $newFile) -ForegroundColor Green

if ($missingList.Count -gt 0) {
    Write-Host "`n=== Missing / Problem Thumbnails ===" -ForegroundColor Yellow
    $missingList | ForEach-Object { Write-Host $_ }
}

if ($fixedList.Count -gt 0) {
    Write-Host "`n=== Paths Auto-Fixed To /all/ ===" -ForegroundColor Green
    $fixedList | ForEach-Object { Write-Host $_ }
}
