@echo off
chcp 65001 >nul
title المختبر الفاحص - فقه المعاملات
:menu
cls
echo ===================================================
echo       المختبر الفاحص - منصة فقه المعاملات
echo ===================================================
echo [1] أخذ بصمة للنظام السليم (حفظ نقطة استقرار)
echo [2] فحص التعديلات الجديدة (هل النظام آمن؟)
echo [0] خروج
echo ===================================================
set /p choice="اختر الرقم واضغط Enter: "

if "%choice%"=="1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Lab-Inspector.ps1" -Mode Save
    pause
    goto menu
)
if "%choice%"=="2" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Lab-Inspector.ps1" -Mode Check
    pause
    goto menu
)
if "%choice%"=="0" exit
goto menu