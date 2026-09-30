$ErrorActionPreference = 'Stop'
$previewUrl = 'http://127.0.0.1:6088/world-preview.html'
$previewAvailable = $false
try {
    $previewResponse = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2
    $previewAvailable = $previewResponse.StatusCode -eq 200 -and $previewResponse.Content.Contains('community-world')
} catch { }
if (-not $previewAvailable) {
    $previewVite = Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'
    if (-not (Test-Path -LiteralPath $previewVite)) {
        throw 'Dependencies are missing. Run npm install in this folder, then launch again.'
    }
    $previewNode = (Get-Command node).Source
    Start-Process -FilePath $previewNode -ArgumentList @('node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '6088', '--strictPort') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $env:TEMP 'sugar-world-preview.log') -RedirectStandardError (Join-Path $env:TEMP 'sugar-world-preview.err.log') | Out-Null
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 300
        try {
            $previewResponse = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2
            if ($previewResponse.StatusCode -eq 200 -and $previewResponse.Content.Contains('community-world')) { $previewAvailable = $true; break }
        } catch { }
    }
}
if (-not $previewAvailable) { throw 'Preview could not start. Check port 6088 and the preview log in your Temp folder.' }
Start-Process $previewUrl
