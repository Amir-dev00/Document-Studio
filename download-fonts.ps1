$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$FontDir = Join-Path $Root 'fonts'
New-Item -ItemType Directory -Force -Path $FontDir | Out-Null

# Open-source families from Google Fonts. The script downloads browser-ready WOFF2
# assets locally and generates fonts/fonts.css with local relative URLs.
$Families = @(
  'Vazirmatn','Estedad','Noto Sans Arabic','Noto Naskh Arabic','Noto Kufi Arabic','Noto Nastaliq Urdu',
  'Amiri','Amiri Quran','Cairo','Tajawal','Almarai','Alexandria','IBM Plex Sans Arabic','Readex Pro',
  'Markazi Text','Changa','El Messiri','Reem Kufi','Reem Kufi Fun','Mada','Harmattan','Lateef','Mirza',
  'Aref Ruqaa','Aref Ruqaa Ink','Scheherazade New','Baloo Bhaijaan 2','Lalezar','Rakkas','Katibeh',
  'Inter','Roboto','Open Sans','Montserrat','Poppins','Lato','Nunito Sans','Manrope','DM Sans','Source Sans 3',
  'Merriweather','Lora','Playfair Display','Libre Baskerville','Source Serif 4','Roboto Slab'
)
$Weights = @(100,200,300,400,500,600,700,800,900)
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36'
$CssOut = New-Object System.Text.StringBuilder
[void]$CssOut.AppendLine('/* Auto-generated local font CSS. Source: Google Fonts. */')
$Downloaded = @{}

function Slugify([string]$s) {
  return (($s.ToLowerInvariant() -replace '[^a-z0-9]+','-').Trim('-'))
}

function Download-CssAssets([string]$family, [string]$css, [string]$slug) {
  $localCss = $css
  $urls = [regex]::Matches($css, 'https://fonts\.gstatic\.com/[^)\s]+') | ForEach-Object { $_.Value } | Select-Object -Unique
  foreach ($url in $urls) {
    $uri = [Uri]$url
    $file = [IO.Path]::GetFileName($uri.AbsolutePath)
    if (-not $file) { continue }
    $familyDir = Join-Path $FontDir $slug
    New-Item -ItemType Directory -Force -Path $familyDir | Out-Null
    $dest = Join-Path $familyDir $file
    if (-not (Test-Path $dest)) {
      Invoke-WebRequest -Uri $url -OutFile $dest -Headers @{ 'User-Agent' = $UA }
    }
    $localUrl = "./$slug/$file"
    $localCss = $localCss.Replace($url, $localUrl)
    $Downloaded[$dest] = $true
  }
  [void]$CssOut.AppendLine("`n/* ===== $family ===== */")
  [void]$CssOut.AppendLine($localCss)
}

foreach ($family in $Families) {
  Write-Host "Downloading $family ..." -ForegroundColor Cyan
  $slug = Slugify $family
  $gotAny = $false

  # Request each weight independently. Unsupported weights are simply skipped.
  foreach ($w in $Weights) {
    $encoded = [Uri]::EscapeDataString($family).Replace('%20','+')
    $cssUrl = "https://fonts.googleapis.com/css2?family=$encoded`:wght@$w&display=swap"
    try {
      $resp = Invoke-WebRequest -Uri $cssUrl -Headers @{ 'User-Agent' = $UA } -UseBasicParsing
      if ($resp.Content -match 'fonts\.gstatic\.com') {
        Download-CssAssets $family $resp.Content $slug
        $gotAny = $true
      }
    } catch {
      # Family may not expose this weight; continue.
    }
  }

  # Fallback/default face for single-weight families.
  if (-not $gotAny) {
    $encoded = [Uri]::EscapeDataString($family).Replace('%20','+')
    $cssUrl = "https://fonts.googleapis.com/css2?family=$encoded&display=swap"
    try {
      $resp = Invoke-WebRequest -Uri $cssUrl -Headers @{ 'User-Agent' = $UA } -UseBasicParsing
      if ($resp.Content -match 'fonts\.gstatic\.com') {
        Download-CssAssets $family $resp.Content $slug
      } else {
        Write-Warning "No downloadable face returned for $family"
      }
    } catch {
      Write-Warning "Skipped $family : $($_.Exception.Message)"
    }
  }
}

$CssPath = Join-Path $FontDir 'fonts.css'
[IO.File]::WriteAllText($CssPath, $CssOut.ToString(), [Text.UTF8Encoding]::new($false))
Write-Host "`nDone. Local font assets: $($Downloaded.Count)" -ForegroundColor Green
Write-Host "Generated: $CssPath" -ForegroundColor Green
Write-Host "Cursor can now integrate fonts/fonts.css and build the font-family selector." -ForegroundColor Green
