# diagnose.ps1
# Bulletproof image + asset diagnostic for Vite + React projects on Windows.
# Run from project root:
#   powershell -ExecutionPolicy Bypass -File .\diagnose.ps1
# Optional: pass -AutoFix to auto-rewrite wrong paths in src/.

param(
    [switch]$AutoFix
)

$ErrorActionPreference = 'Continue'
$root = (Get-Location).Path
$publicDir = Join-Path $root 'public'
$imagesDir = Join-Path $publicDir 'images'
$srcDir = Join-Path $root 'src'

function Write-Section([string]$title) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " $title" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-OK([string]$m) { Write-Host "  [OK]    $m" -ForegroundColor Green }
function Write-Warn([string]$m) { Write-Host "  [WARN]  $m" -ForegroundColor Yellow }
function Write-Bad([string]$m) { Write-Host "  [FAIL]  $m" -ForegroundColor Red }
function Write-Info([string]$m) { Write-Host "  [INFO]  $m" -ForegroundColor Gray }

# =============================================================
Write-Section "1. PROJECT STRUCTURE"
# =============================================================
$hasPackage = Test-Path (Join-Path $root 'package.json')
$hasViteConfig = (Test-Path (Join-Path $root 'vite.config.js')) -or (Test-Path (Join-Path $root 'vite.config.ts'))
if (-not $hasPackage) { Write-Bad "No package.json — are you in the project root?"; exit 1 }
if (-not $hasViteConfig) { Write-Warn "No vite.config.{js,ts} found"; } else { Write-OK "vite.config found" }
if (Test-Path $publicDir) { Write-OK "public/ exists" } else { Write-Bad "public/ MISSING"; New-Item -ItemType Directory -Path $publicDir | Out-Null; Write-Info "Created public/" }
if (Test-Path $imagesDir) { Write-OK "public/images/ exists" } else { Write-Bad "public/images/ MISSING"; New-Item -ItemType Directory -Path $imagesDir | Out-Null; Write-Info "Created public/images/" }

# =============================================================
Write-Section "2. DISK INVENTORY"
# =============================================================
$diskImages = @()
if (Test-Path $imagesDir) {
    $diskImages = Get-ChildItem $imagesDir -File -ErrorAction SilentlyContinue
    Write-Info "Files in public/images/: $($diskImages.Count)"
    if ($diskImages.Count -gt 0) {
        $diskImages | ForEach-Object { Write-Host "          $($_.Name) ($([math]::Round($_.Length/1KB,1)) KB)" -ForegroundColor DarkGray }
    } else {
        Write-Bad "public/images/ is EMPTY — this is the root cause of your 404s"
    }
}

# Also detect images sitting in WRONG places
$candidates = @()
$candidates += Get-ChildItem -Path $root -Recurse -File -Include *.png,*.jpg,*.jpeg,*.webp,*.svg,*.gif,*.ico `
    -ErrorAction SilentlyContinue `
    | Where-Object {
        $p = $_.FullName
        ($p -notlike "*\node_modules\*") -and
        ($p -notlike "*\.git\*") -and
        ($p -notlike "*\dist\*") -and
        ($p -notlike "*\build\*") -and
        ($p -notlike "*\public\images\*")
    }

if ($candidates.Count -gt 0) {
    Write-Warn "Found $($candidates.Count) image(s) OUTSIDE public/images/:"
    $candidates | Select-Object -First 30 | ForEach-Object {
        $rel = $_.FullName.Substring($root.Length).TrimStart('\').Replace('\','/')
        Write-Host "          $rel" -ForegroundColor Yellow
    }
    if ($candidates.Count -gt 30) { Write-Info "  ...and $($candidates.Count - 30) more" }
}

# =============================================================
Write-Section "3. CODE REFERENCE SCAN"
# =============================================================
$codeFiles = @()
if (Test-Path $srcDir) {
    $codeFiles = Get-ChildItem -Path $srcDir -Recurse -File `
        -Include *.ts,*.tsx,*.js,*.jsx,*.html,*.css `
        -ErrorAction SilentlyContinue
}
$indexHtml = Join-Path $root 'index.html'
if (Test-Path $indexHtml) { $codeFiles += Get-Item $indexHtml }

$pattern = '["''`](\.{0,2}/?[^"''`\s<>]*?\.(?:png|jpe?g|gif|webp|svg|ico|avif))["''`]'
$refs = @{}
foreach ($f in $codeFiles) {
    $text = Get-Content -Raw -LiteralPath $f.FullName -ErrorAction SilentlyContinue
    if (-not $text) { continue }
    $matches = [regex]::Matches($text, $pattern, 'IgnoreCase')
    foreach ($m in $matches) {
        $p = $m.Groups[1].Value
        if (-not $refs.ContainsKey($p)) { $refs[$p] = @() }
        $refs[$p] += $f.FullName
    }
}
Write-Info "Unique image paths referenced in code: $($refs.Count)"

# =============================================================
Write-Section "4. CROSS-CHECK (CODE vs DISK)"
# =============================================================
$missing = @()
$casing = @()
$wrongShape = @()

foreach ($ref in $refs.Keys | Sort-Object) {
    if ($ref -match '^(https?:|data:|blob:|//)') { continue }
    $clean = $ref -replace '^\.{0,2}/?', ''  # strip leading "./" "../" "/"
    $diskPath = Join-Path $publicDir $clean
    $basename = Split-Path $clean -Leaf

    if (Test-Path $diskPath) {
        # exists; flag if not using leading-slash form
        if (-not $ref.StartsWith('/')) {
            $wrongShape += [PSCustomObject]@{
                Code = $ref; ShouldBe = "/$clean"; Files = $refs[$ref]
            }
        }
    } else {
        # check by basename for casing or relocation issues
        $byName = $diskImages | Where-Object { $_.Name -ieq $basename } | Select-Object -First 1
        if ($byName) {
            if ($byName.Name -cne $basename) {
                $casing += [PSCustomObject]@{
                    Code = $ref; ActualOnDisk = $byName.Name; Files = $refs[$ref]
                }
            } else {
                # name matches but path was off
                $wrongShape += [PSCustomObject]@{
                    Code = $ref; ShouldBe = "/images/$($byName.Name)"; Files = $refs[$ref]
                }
            }
        } else {
            # check if it exists somewhere else in repo
            $elsewhere = $candidates | Where-Object { $_.Name -ieq $basename } | Select-Object -First 1
            if ($elsewhere) {
                $rel = $elsewhere.FullName.Substring($root.Length).TrimStart('\').Replace('\','/')
                $missing += [PSCustomObject]@{
                    Code = $ref; Status = "EXISTS at $rel — needs to be moved to public/images/"; Files = $refs[$ref]
                }
            } else {
                $missing += [PSCustomObject]@{
                    Code = $ref; Status = "NOT FOUND anywhere in project"; Files = $refs[$ref]
                }
            }
        }
    }
}

if ($missing.Count -gt 0) {
    Write-Bad "$($missing.Count) referenced image(s) MISSING:"
    $missing | ForEach-Object {
        Write-Host "          $($_.Code) -> $($_.Status)" -ForegroundColor Red
    }
}
if ($casing.Count -gt 0) {
    Write-Warn "$($casing.Count) CASING mismatch(es) — will 404 on Linux/Vercel:"
    $casing | ForEach-Object {
        Write-Host "          code: $($_.Code) <> disk: $($_.ActualOnDisk)" -ForegroundColor Yellow
    }
}
if ($wrongShape.Count -gt 0) {
    Write-Warn "$($wrongShape.Count) path(s) need rewriting to /images/...:"
    $wrongShape | ForEach-Object {
        Write-Host "          $($_.Code) -> $($_.ShouldBe)" -ForegroundColor Yellow
    }
}
if (($missing.Count + $casing.Count + $wrongShape.Count) -eq 0) {
    Write-OK "All code references resolve to real disk files"
}

# =============================================================
Write-Section "5. .gitignore CHECK"
# =============================================================
$gi = Join-Path $root '.gitignore'
if (Test-Path $gi) {
    $lines = Get-Content $gi
    $bad = $lines | Where-Object {
        $_ -match '(^|[/\s])images($|[/\s])' -or
        $_ -match '^\s*\*\.(png|jpe?g|gif|webp|svg)\s*$' -or
        $_ -match 'public/images'
    }
    if ($bad) {
        Write-Bad ".gitignore has lines that may exclude images:"
        $bad | ForEach-Object { Write-Host "          $_" -ForegroundColor Red }
    } else {
        Write-OK ".gitignore looks clean"
    }
} else {
    Write-Info "No .gitignore"
}

# =============================================================
Write-Section "6. GIT TRACKING"
# =============================================================
$gitOk = $false
try {
    $null = git rev-parse --is-inside-work-tree 2>$null
    if ($LASTEXITCODE -eq 0) { $gitOk = $true }
} catch {}

if ($gitOk) {
    $tracked = (git ls-files public/images 2>$null) -split "`n" | Where-Object { $_ }
    if ($tracked.Count -gt 0) {
        Write-OK "Git tracks $($tracked.Count) file(s) in public/images/"
    } else {
        Write-Bad "Git tracks NO files in public/images/ — they will not deploy"
        Write-Info "Fix: git add public/images && git commit -m 'add images' && git push"
    }

    $untracked = (git status --porcelain public/images 2>$null) -split "`n" | Where-Object { $_ -match '^\?\?' }
    if ($untracked.Count -gt 0) {
        Write-Warn "$($untracked.Count) UNTRACKED image(s) — won't deploy until added:"
        $untracked | Select-Object -First 15 | ForEach-Object { Write-Host "          $_" -ForegroundColor Yellow }
    }
} else {
    Write-Warn "Not a git repository or git not on PATH"
}

# =============================================================
Write-Section "7. FAVICON"
# =============================================================
$favs = @('favicon.ico','favicon.svg','favicon.png','apple-touch-icon.png') | ForEach-Object {
    $p = Join-Path $publicDir $_
    [PSCustomObject]@{ Name = $_; Path = $p; Exists = (Test-Path $p) }
}
$haveAny = $favs | Where-Object { $_.Exists }
if ($haveAny) {
    $haveAny | ForEach-Object { Write-OK "Found public/$($_.Name)" }
} else {
    Write-Bad "No favicon files in public/"
    Write-Info "Generate at https://favicon.io and drop into public/"
}

if (Test-Path $indexHtml) {
    $html = Get-Content -Raw $indexHtml
    if ($html -match '<link[^>]*rel="icon"') {
        Write-OK "index.html references a favicon"
    } else {
        Write-Warn "index.html has no <link rel=icon> tag"
    }
}

# =============================================================
Write-Section "8. AUTO-FIX (only with -AutoFix)"
# =============================================================
if ($AutoFix) {
    if ($wrongShape.Count -gt 0) {
        Write-Info "Rewriting $($wrongShape.Count) path(s) in src/..."
        foreach ($w in $wrongShape) {
            $files = $w.Files | Select-Object -Unique
            foreach ($file in $files) {
                $content = Get-Content -Raw -LiteralPath $file
                $newContent = $content.Replace($w.Code, $w.ShouldBe)
                if ($content -ne $newContent) {
                    Set-Content -LiteralPath $file -Value $newContent -NoNewline
                    Write-OK "Rewrote in $($file.Substring($root.Length+1))"
                }
            }
        }
    }
    if ($casing.Count -gt 0) {
        Write-Info "Rewriting $($casing.Count) casing reference(s) in src/..."
        foreach ($c in $casing) {
            $correct = $c.Code -replace [regex]::Escape((Split-Path $c.Code -Leaf)), $c.ActualOnDisk
            $files = $c.Files | Select-Object -Unique
            foreach ($file in $files) {
                $content = Get-Content -Raw -LiteralPath $file
                $newContent = $content.Replace($c.Code, $correct)
                if ($content -ne $newContent) {
                    Set-Content -LiteralPath $file -Value $newContent -NoNewline
                    Write-OK "Casing-fixed in $($file.Substring($root.Length+1))"
                }
            }
        }
    }
} else {
    if (($wrongShape.Count + $casing.Count) -gt 0) {
        Write-Info "Re-run with -AutoFix to apply path/casing fixes automatically:"
        Write-Info "  powershell -ExecutionPolicy Bypass -File .\diagnose.ps1 -AutoFix"
    }
}

# =============================================================
Write-Section "SUMMARY"
# =============================================================
$problems = $missing.Count + $casing.Count + $wrongShape.Count
if ($problems -eq 0 -and $diskImages.Count -gt 0) {
    Write-OK "No issues detected. If still 404 in production, redeploy and hard-refresh."
} else {
    Write-Host ""
    Write-Host "  Disk has $($diskImages.Count) image(s). Code references $($refs.Count) path(s)." -ForegroundColor White
    Write-Host "  Missing: $($missing.Count)  |  Casing: $($casing.Count)  |  Wrong shape: $($wrongShape.Count)" -ForegroundColor White
    Write-Host ""
    Write-Host "  NEXT STEPS:" -ForegroundColor Cyan
    if ($missing.Count -gt 0) {
        Write-Host "    1. Add the missing image files to public/images/" -ForegroundColor White
    }
    if ($wrongShape.Count -gt 0 -or $casing.Count -gt 0) {
        Write-Host "    2. Run with -AutoFix to rewrite paths" -ForegroundColor White
    }
    Write-Host "    3. git add public/images" -ForegroundColor White
    Write-Host "    4. git commit -m 'fix: add and reference images correctly'" -ForegroundColor White
    Write-Host "    5. git push  (then wait for Vercel redeploy)" -ForegroundColor White
}
Write-Host ""
