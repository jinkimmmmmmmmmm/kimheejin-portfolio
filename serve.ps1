param(
    [int]$Port = 8000,
    [string]$Directory = $PSScriptRoot
)

if (-not $Directory) {
    $Directory = (Get-Location).Path
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
} catch {
    Write-Host "포트 $Port 에서 서버를 시작하지 못했습니다: $_" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  로컬 웹 서버가 실행되었습니다!" -ForegroundColor Cyan
Write-Host "  주소: http://localhost:$Port/" -ForegroundColor Yellow
Write-Host "  루트 경로: $Directory"
Write-Host "  종료하려면 Ctrl+C를 누르세요."
Write-Host "==========================================" -ForegroundColor Green

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".webp" = "image/webp"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
        if ($rawPath -eq "/" -or $rawPath -eq "") {
            $rawPath = "/index.html"
        }

        $relPath = $rawPath.TrimStart("/\").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Directory, $relPath))

        $basePath = [System.IO.Path]::GetFullPath($Directory)
        if (-not $filePath.StartsWith($basePath, [System.StringComparison]::OrdinalIgnoreCase) -or -not [System.IO.File]::Exists($filePath)) {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $msg.Length
            $response.OutputStream.Write($msg, 0, $msg.Length)
            $response.Close()
            continue
        }

        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        if ($mimeTypes.ContainsKey($ext)) {
            $response.ContentType = $mimeTypes[$ext]
        } else {
            $response.ContentType = "application/octet-stream"
        }

        # Cache control for local dev
        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")

        try {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.StatusCode = 200
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } catch {
            $response.StatusCode = 500
            $err = [System.Text.Encoding]::UTF8.GetBytes("500 Internal Server Error: $_")
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $err.Length
            $response.OutputStream.Write($err, 0, $err.Length)
        } finally {
            $response.Close()
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
