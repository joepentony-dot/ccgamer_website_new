# =============================================
#   CCG THUMBNAIL RECONCILER v6 (FINAL)
#   Case-sensitive ✔ Exact filename match ✔
#   Generates: games/games_v6.json
# =============================================

Write-Host "`n=== CCG THUMBNAIL RECONCILER v6 (FINAL) ===`n"

$gameJsonPath = "games/games.json"
$thumbFolder  = "resources/images/thumbnails/all"

if (!(Test-Path $gameJsonPath)) { Write-Host "ERROR: games.json not found!" -ForegroundColor Red; exit }
if (!(Test-Path $thumbFolder)) { Write-Host "ERROR: Thumbnail folder not found!" -ForegroundColor Red; exit }

Write-Host "Loading games.json..."
$games = Get-Content $gameJsonPath -Raw | ConvertFrom-Json

Write-Host "Loading real thumbnail filenames (case-sensitive)..."
$realFiles = Get-ChildItem $thumbFolder -File | Select-Object -ExpandProperty Name

# Convert to HashSet for exact matching
$realSet = [System.Collections.Generic.HashSet[string]]::new()

foreach ($f in $realFiles) { [void]$realSet.Add($f) }

$fixedPaths = 0
$missingFiles = 0

$missingReport = @()
$fixedReport   = @()

Write-Host "Reconciling JSON entries..."

foreach ($game in $games) {

    if (-not $game.thumbnail -or $game.thumbnail.Trim() -eq "") {
        $missingFiles++
        $missingReport += "NO THUMB: $($game.id)  ($($game.title))"
        continue
    }

    $thumbPath = $game.thumbnail
    $fileName  = Split-Path $thumbPath -Leaf

    if ($realSet.Contains($fileName)) {
        # Correct the folder path only
        $correctPath = "resources/images/thumbnails/all/$fileName"

        if ($thumbPath -ne $correctPath) {
            $game.thumbnail = $correctPath
            $fixedPaths++
            $fixedReport += "$($game.id): $fileName"
        }
    }
    else {
        $missingFiles++
        $missingReport += "MISSING FILE: $($game.id) ($($game.title)) -> $fileName"
    }
}

# Save corrected JSON
$outFile = "games/games_v6.json"
$games | ConvertTo-Json -Depth 12 | Out-File $outFile -Encoding utf8

Write-Host "`n=== SUMMARY ==="
Write-Host "Correct thumbnail matches: $($realSet.Count)"
Write-Host "Paths fixed to /all/:      $fixedPaths"
Write-Host "Missing thumbnails:        $missingFiles"
Write-Host "Output written to:         $outFile" -ForegroundColor Green

if ($missingReport.Count -gt 0) {
    Write-Host "`n=== Missing Thumbnail Report ==="
    $missingReport | ForEach-Object { Write-Host $_ }
}

if ($fixedReport.Count -gt 0) {
    Write-Host "`n=== Paths Fixed ==="
    $fixedReport | ForEach-Object { Write-Host $_ }
}
