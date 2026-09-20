# Ultra-lightweight local HTTP server for RAZ Oud 3D Scroll Hero
# Runs natively on Windows using built-in .NET HttpListener (zero dependencies required)

$baseDir = $PSScriptRoot
$port = 8080
$listener = $null

while ($port -lt 8095) {
    try {
        $prefix = "http://localhost:$port/"
        $listener = New-Object System.Net.HttpListener
        $listener.Prefixes.Add($prefix)
        $listener.Start()
        break
    }
    catch {
        if ($listener) { $listener.Close() }
        $port++
    }
}

if (-not $listener -or -not $listener.IsListening) {
    Write-Host "Failed to bind to local ports between 8080 and 8095." -ForegroundColor Red
    exit 1
}

$serverUrl = "http://localhost:$port/"
Write-Host "========================================================" -ForegroundColor DarkYellow
Write-Host "   RAZ OUD | 3D VIDEO SCROLL EXPERIENCE IS LIVE" -ForegroundColor Yellow
Write-Host "   Local Server: $serverUrl" -ForegroundColor Green
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor DarkYellow

# Automatically launch default browser
Start-Process $serverUrl

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
        if ($rawPath -eq "/" -or [string]::IsNullOrWhiteSpace($rawPath)) {
            $rawPath = "/index.html"
        }

        $cleanPath = $rawPath.TrimStart("/").Replace("/", "\")
        $localPath = [System.IO.Path]::Combine($baseDir, $cleanPath)

        if ([System.IO.File]::Exists($localPath)) {
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".webp" { "image/webp" }
                ".svg"  { "image/svg+xml" }
                ".json" { "application/json; charset=utf-8" }
                default { "application/octet-stream" }
            }

            $response.ContentType = $mime
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Cache-Control", "public, max-age=86400")

            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
            $response.ContentLength64 = $msg.Length
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }

        $response.OutputStream.Close()
    }
}
catch {
    # Expected on exit
}
finally {
    if ($listener) {
        $listener.Stop()
        $listener.Close()
    }
}
