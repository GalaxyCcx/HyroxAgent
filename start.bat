@echo off
chcp 65001 >nul
title HyroxAgent 启动器

echo ============================================
echo        HyroxAgent 前后端启动脚本
echo ============================================
echo.

:: 彻底清理后端端口 8000 (循环清理直到无进程)
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

:: 彻底清理前端端口 5173 (循环清理直到无进程)
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

:: 等待端口完全释放
timeout /t 2 /nobreak >nul

:: 启动后端
echo [3/4] 启动后端服务...
cd /d %~dp0backend
start "HyroxAgent Backend" cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: 等待后端启动
timeout /t 3 /nobreak >nul

:: 启动前端
echo [4/4] 启动前端服务...
cd /d %~dp0frontend
start "HyroxAgent Frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo              启动完成！
echo ============================================
echo.
echo   后端地址: http://localhost:8000
echo   前端地址: http://localhost:5173
echo   API文档:  http://localhost:8000/docs
echo.
echo   提示: 关闭此窗口不会停止服务
echo         如需停止，请关闭对应的终端窗口
echo ============================================
echo.
pause
