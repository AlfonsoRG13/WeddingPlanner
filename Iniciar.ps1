$ErrorActionPreference = "Stop"
$projectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverUrl = "http://127.0.0.1:5173"
$browserProfile = Join-Path $env:LOCALAPPDATA "NuestroDiaBrowser"

$browserCandidates = @(
  (Join-Path ([Environment]::GetFolderPath("ProgramFilesX86")) "Microsoft\Edge\Application\msedge.exe"),
  (Join-Path ([Environment]::GetFolderPath("ProgramFiles")) "Microsoft\Edge\Application\msedge.exe"),
  (Join-Path $env:LOCALAPPDATA "Microsoft\Edge\Application\msedge.exe"),
  (Join-Path ([Environment]::GetFolderPath("ProgramFiles")) "Google\Chrome\Application\chrome.exe"),
  (Join-Path ([Environment]::GetFolderPath("ProgramFilesX86")) "Google\Chrome\Application\chrome.exe"),
  (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
)
$browserPath = $browserCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browserPath) {
  throw "No se encontró Microsoft Edge ni Google Chrome. Instala uno de ellos para abrir la app en una ventana dedicada."
}

$nodeCommand = Get-Command node.exe -ErrorAction Stop
$serverProcess = $null
$browserProcess = $null

try {
  Write-Host "Iniciando el servidor local..."
  $serverProcess = Start-Process `
    -FilePath $nodeCommand.Source `
    -ArgumentList "server.mjs" `
    -WorkingDirectory $projectDirectory `
    -PassThru `
    -NoNewWindow

  Write-Host "Esperando a que la aplicación esté lista..."
  $serverReady = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if ($serverProcess.HasExited) {
      throw "El servidor se cerró inesperadamente. Revisa el error mostrado arriba."
    }

    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri "$serverUrl/api/health" -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        $serverReady = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  if (-not $serverReady) {
    throw "El servidor no respondió en $serverUrl después de 30 segundos."
  }

  Write-Host "Abriendo la aplicación en una ventana dedicada de Edge o Chrome."
  Write-Host "Cierra esa ventana para detener el servidor y cerrar esta consola."
  $browserArguments = @(
    "--user-data-dir=`"$browserProfile`"",
    "--app=$serverUrl",
    "--no-first-run",
    "--disable-background-mode",
    "--disable-sync"
  )
  $browserProcess = Start-Process -FilePath $browserPath -ArgumentList $browserArguments -PassThru
  Wait-Process -Id $browserProcess.Id
} catch {
  Write-Error $_
  exit 1
} finally {
  if ($serverProcess -and -not $serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id -Force
    Wait-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue
  }
}
