# ============================================================
#  CHEEKY COMMODORE GAMER — FINAL THUMBNAIL NORMALISER
#  SAFE MODE (EXT-A): Preserves original file extension
#  Converts filenames to clean snake_case, removes symbols
#  Generates mapping list for fixing games.json afterwards
# ============================================================

$folder = "resources/images/thumbnails/all"
$log = "thumbnail_rename_log.txt"
$mappings = @()

Write-Host "Scanning folder: $folder"

Get-ChildItem -Path $folder -File | ForEach-Object {

    $original = $_.Name
    $ext = $_.Extension.ToLower()

    # 1. Clean base name: lowercase, replace spaces, remove bad chars
    $clean = $_.BaseName.ToLower()

    $clean = $clean `
        -replace "[^a-z0-9]+", "_" `
        -replace "_+", "_" `
        -replace "^_", "" `
        -replace "_$", ""

    $newName = "$clean$ext"
    $newPath = Join-Path $folder $newName

    # 2. Skip if already correct
    if ($original -eq $newName) {
        Write-Host "OK: $original (already clean)"
        return
    }

    # 3. Handle duplicates by appending id
    $counter = 1
    while (Test-Path $newPath) {
        $newName = "$clean" + "_$counter$ext"
        $newPath = Join-Path $folder $newName
        $counter++
    }

    # 4. Perform rename
    Rename-Item -Path $_.FullName -NewName $newName

    # 5. Save mapping for JSON patching
    $mappings += [PSCustomObject]@{
        original = $original
        clean    = $newName
    }

    Write-Host "RENAMED: $original → $newName"
}

# 6. Save mapping log
$mappings | ConvertTo-Json -Depth 5 | Out-File $log
Write-Host "`nDONE! Mappings saved to $log"
