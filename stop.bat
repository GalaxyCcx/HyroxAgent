@echo off
chcp 65001 >nul
title HyroxAgent 停止器

echo ============================================
echo        HyroxAgent 服务停止脚本
echo ============================================
echo.

:: 彻底停止后端服务 (端口 8000，循环直到无进程)
echo [1/2] 停止后端服务...
:stop_8000
set "found8000=0"
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000" ^| findstr "LISTENING"') do (
    set "found8000=1"
    echo       终止进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
if "%found8000%"=="1" (
    timeout /t 1 /nobreak >nul
    goto stop_8000
)
echo       后端服务已停止

:: 彻底停止前端服务 (端口 5173，循环直到无进程)
echo [2/2] 停止前端服务...
:stop_5173
set "found5173=0"
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    set "found5173=1"
    echo       终止进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
if "%found5173%"=="1" (
    timeout /t 1 /nobreak >nul
    goto stop_5173
)
echo       前端服务已停止

echo.
echo ============================================
echo              所有服务已停止
echo ============================================
echo.
pause
