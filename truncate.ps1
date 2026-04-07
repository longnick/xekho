$lines = Get-Content -Path "d:\APP POS\app.js" -Encoding UTF8
$cleanLines = $lines[0..2542]
$cleanLines | Set-Content -Path "d:\APP POS\app.js" -Encoding UTF8
Write-Host "Truncated to $($cleanLines.Count) lines"
Remove-Item "d:\APP POS\truncate.ps1"
