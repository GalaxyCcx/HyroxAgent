# HyroxAgent 服务停止脚本 (PowerShell)
# 用法: .\stop.ps1  或  pwsh -File stop.ps1

$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Stop-ProcessOnPort {
    param([int]$Port, [string]$Name)
    $found = $true
    while ($found) {
        $found = $false
        $lines = netstat -ano 2>$null | Select-String ":$Port\s" | Select-String "LISTENING"
        foreach ($line in $lines) {
            $parts = $line -split '\s+'
            $pid = $parts[-1]
            if ($pid -match '^\d+$') {
                Write-Host "       终止进程 PID: $pid"
                try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
                $found = $true
            }
        }
        if ($found) { Start-Sleep -Seconds 1 }
    }
    Write-Host "       $Name 已停止"
}

Write-Host ""
Write-Host "============================================"
Write-Host "       HyroxAgent 服务停止脚本"
Write-Host "============================================"
Write-Host ""

Write-Host "[1/2] 停止后端服务 (8000)..."
Stop-ProcessOnPort -Port 8000 -Name "后端"

Write-Host "[2/2] 停止前端服务 (5173)..."
Stop-ProcessOnPort -Port 5173 -Name "前端"

Write-Host ""
Write-Host "============================================"
Write-Host "              所有服务已停止"
Write-Host "============================================"
Write-Host ""
