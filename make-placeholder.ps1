# make-placeholder.ps1
# Creates public/images/placeholder.png (a simple dark placeholder)
# so that SafeImage and the global fallback have a working file.
# Run once:
#   powershell -ExecutionPolicy Bypass -File .\make-placeholder.ps1

Add-Type -AssemblyName System.Drawing
$root = (Get-Location).Path
$dir = Join-Path $root 'public\images'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$out = Join-Path $dir 'placeholder.png'

$w = 600; $h = 400
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::FromArgb(26, 26, 31))   # #1a1a1f

$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(42,42,50)), 2
$pen.DashStyle = 'Dash'
$g.DrawRectangle($pen, 1, 1, $w-3, $h-3)

$font = New-Object System.Drawing.Font 'Segoe UI', 18, ([System.Drawing.FontStyle]::Regular)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(90,90,106))
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = 'Center'
$fmt.LineAlignment = 'Center'
$g.DrawString('Image unavailable', $font, $brush, (New-Object System.Drawing.RectangleF 0,0,$w,$h), $fmt)

$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Host "Created $out" -ForegroundColor Green
