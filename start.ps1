# HyroxAgent 前后端启动脚本 (PowerShell)
# 支持在 PowerShell / Cursor / VS Code 终端中直接运行
# 用法: .\start.ps1  或  pwsh -File start.ps1

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Get-Location -PSProvider FileSystem | Select-Object -ExpandProperty Path }

function Stop-ProcessOnPort {
    param([int]$Port, [string]$Name)
    $found = $true
    while ($found) {
        $found = $false
        $lines = netstat -ano 2>$null | Select-String ":$Port\s" | Select-String "LISTENING"
        foreach ($line in $lines) {
            $parts = $line -split '\s+'
            $procId = $parts[-1]
            if ($procId -match '^\d+$') {
                Write-Host "       终止进程 PID: $procId"
                try { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } catch {}
                $found = $true
            }
        }
        if ($found) { Start-Sleep -Seconds 1 }
    }
    Write-Host "       端口 $Port 已清理"
}

Write-Host ""
Write-Host "============================================"
Write-Host "       HyroxAgent 前后端启动脚本"
Write-Host "============================================"
Write-Host ""

Write-Host "[1/4] 清理后端端口 8000..."
Stop-ProcessOnPort -Port 8000 -Name "后端"

Write-Host "[2/4] 清理前端端口 5173..."
Stop-ProcessOnPort -Port 5173 -Name "前端"

Write-Host "[3/4] 等待端口释放..."
Start-Sleep -Seconds 2

Write-Host "[3/4] 启动后端服务..."
$backendCmd = "cd /d `"$scriptDir\backend`" && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $backendCmd -WorkingDirectory $scriptDir

Start-Sleep -Seconds 3

Write-Host "[4/4] 启动前端服务..."
$frontendCmd = "cd /d `"$scriptDir\frontend`" && npm run dev"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $frontendCmd -WorkingDirectory $scriptDir

Write-Host ""
Write-Host "============================================"
Write-Host "              启动完成！"
Write-Host "============================================"
Write-Host ""
Write-Host "  后端地址: http://localhost:8000"
Write-Host "  前端地址: http://localhost:5173"
Write-Host "  API文档:  http://localhost:8000/docs"
Write-Host ""
Write-Host "  提示: 已打开两个新窗口分别运行后端与前端"
Write-Host "        关闭此窗口不会停止服务，请用 stop.ps1 或 stop.bat 停止"
Write-Host "============================================"
Write-Host ""
