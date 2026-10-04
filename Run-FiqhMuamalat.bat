@echo off
title Fiqh Muamalat - Dev Server

rem ---------------------------------------------------------
rem  Double-click to start the development server.
rem  Keep this file next to package.json inside the project.
rem  Close this window (or press Ctrl+C) to stop the server.
rem ---------------------------------------------------------

cd /d "%~dp0"

if not exist "package.json" (
  echo.
  echo [ERROR] package.json was not found next to this file.
  echo Place this file directly inside the project folder.
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Node.js is not installed.
  echo Install the LTS version from https://nodejs.org then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo First run: installing packages, please wait...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed. Check your internet connection.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Starting Fiqh Muamalat... the browser will open automatically.
echo.
call npm run dev -- --open

echo.
echo The server has stopped.
pause