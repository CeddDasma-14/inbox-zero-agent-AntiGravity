
$nodeVersion = "v22.14.0" # LTS
$url = "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-win-x64.zip"
$destDir = "$env:USERPROFILE\.node"
$zipPath = "$destDir\node.zip"

Write-Host "Creating directory: $destDir"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

Write-Host "Downloading Node.js $nodeVersion from $url..."
Invoke-WebRequest -Uri $url -OutFile $zipPath

Write-Host "Extracting..."
Expand-Archive -Path $zipPath -DestinationPath $destDir -Force

$extractedDir = "$destDir\node-$nodeVersion-win-x64"
Write-Host "Extracted to: $extractedDir"

# Move files up one level
Get-ChildItem -Path "$extractedDir\*" -Recurse | Move-Item -Destination $destDir -Force
Remove-Item -Path $extractedDir -Recurse -Force
Remove-Item -Path $zipPath -Force

Write-Host "Node.js installed at $destDir"

# Check version
& "$destDir\node.exe" -v
& "$destDir\npm.cmd" -v
