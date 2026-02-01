@echo off
chcp 65001 >nul
title HyroxAgent 启动器

:: 优先使用 PowerShell 脚本启动（支持 Cursor/VS Code 终端与双击运行）
if exist "%~dp0start.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
    echo.
    pause
    exit /b 0
)

:: 无 start.ps1 时回退到原批处理逻辑
echo ============================================
echo        HyroxAgent 前后端启动脚本
echo ============================================
echo.

echo [1/4] 清理后端端口 8000...
:cleanup_8000
set "found8000=0"
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000" ^| findstr "LISTENING"') do (
    set "found8000=1"
    echo       终止进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
if "%found8000%"=="1" (
    timeout /t 1 /nobreak >nul
    goto cleanup_8000
)
echo       端口 8000 已清理

echo [2/4] 清理前端端口 5173...
:cleanup_5173
set "found5173=0"
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    set "found5173=1"
    echo       终止进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
if "%found5173%"=="1" (
    timeout /t 1 /nobreak >nul
    goto cleanup_5173
)
echo       端口 5173 已清理

timeout /t 2 /nobreak >nul

echo [3/4] 启动后端服务...
cd /d %~dp0backend
start "HyroxAgent Backend" cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo [4/4] 启动前端服务...
cd /d %~dp0frontend
start "HyroxAgent Frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo              启动完成！
echo ============================================
echo   后端: http://localhost:8000  前端: http://localhost:5173
echo ============================================
echo.
pause
