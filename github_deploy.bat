@echo off
chcp 65001 >nul
title Peeshtee - GitHub Deploy Script
color 0b

echo =======================================================
echo          PEESHTEE GITHUB DEPLOY BASLATILIYOR
echo =======================================================
echo.

echo [1/3] Degisiklikler taranip hazirlaniyor...
git add .

echo.
set /p commit_msg="Commit mesajini girin (Bos birakirsaniz otomatik mesaj atanir): "
if "%commit_msg%"=="" (
    set commit_msg=feat: update peeshtee game and multiplayer
)

echo.
echo [2/3] Commit olusturuluyor: "%commit_msg%"
git commit -m "%commit_msg%"

echo.
echo [3/3] GitHub 'main' dalina yukleniyor (git push)...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =======================================================
    echo  [BASARILI] GitHub'a yuklendi!
    echo  Vercel bunu otomatik algilayip 30-60 sn icinde deploy eder.
    echo =======================================================
) else (
    echo.
    echo =======================================================
    echo  [HATA] Push sirasinda bir sorun olustu. 
    echo  GitHub erisimini veya internet baglantini kontrol et.
    echo =======================================================
)

echo.
pause
