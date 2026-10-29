@echo off
setlocal

cd /d "%~dp0"
chcp 65001 >nul

echo ========================================================
echo   Peeshtee - Repo Guncelleme (Git Pull)
echo ========================================================
echo.

set STASHED=0

git diff-index --quiet HEAD -- >nul 2>&1
if errorlevel 1 (
    echo [UYARI] Takip edilen dosyalarda kaydedilmemis yerel degisiklikleriniz var.
    echo [BILGI] Cakismalari onlemek icin degisiklikleriniz saklaniyor: git stash
    git stash >nul 2>&1
    set STASHED=1
) else (
    echo [OK] Calisma alani temiz.
)

echo.
echo [1/3] GitHub 'origin/main' uzerinden son degisiklikler aliniyor...
echo --------------------------------------------------------
git pull origin main
if errorlevel 1 goto PULL_ERROR
echo --------------------------------------------------------

if "%STASHED%"=="1" (
    echo.
    echo [BILGI] Saklanan yerel degisiklikleriniz geri yukleniyor: git stash pop
    git stash pop
)

echo.
echo [2/3] En son yapilan 3 commit:
echo --------------------------------------------------------
git log -3 --graph --oneline --decorate
echo --------------------------------------------------------

git diff --name-only HEAD@{1} HEAD 2>nul | findstr /i "package.json" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo [!] DIKKAT: package.json guncellendi! Yeni paketler eklenmis olabilir.
    echo [!] Terminalde 'npm install' calistirarak paketleri guncellemeniz onerilir.
)

echo.
echo ========================================================
echo   [OK] Guncelleme basariyla tamamlandi!
echo   Iyi calismalar! (Projeyi baslatmak icin: npm run dev)
echo ========================================================
echo.
pause
exit /b 0

:PULL_ERROR
echo --------------------------------------------------------
echo.
echo [HATA] 'git pull origin main' basarisiz oldu!
echo        Lutfen internet baglantinizi veya olasi cakismalari kontrol edin.
if "%STASHED%"=="1" (
    echo.
    echo [BILGI] Saklanan yerel degisiklikleriniz geri aliniyor: git stash pop
    git stash pop
)
echo.
pause
exit /b 1
