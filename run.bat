@echo off
TITLE Personal-Cloud Master Runner
echo ==========================================
echo    STARTING SERVICES...
echo ==========================================

:: 0. Check XAMPP
tasklist /FI "IMAGENAME eq xampp-control.exe" 2>NUL | find /I /N "xampp-control.exe">NUL
if "%ERRORLEVEL%"=="1" (
    start "" "C:\xampp\xampp-control.exe"
    timeout /t 2 >nul
)

:: 1. Kill ONLY Personal-Cloud processes by Window Title
echo Cleaning up previous sessions...
taskkill /FI "WINDOWTITLE eq Personal-Cloud-Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Personal-Cloud-Frontend*" /F >nul 2>&1
timeout /t 1 >nul

:: 2. Start Apache & MySQL only if not running
tasklist /FI "IMAGENAME eq httpd.exe" 2>NUL | find /I /N "httpd.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo Starting Apache...
    pushd C:\xampp
    start /b "" "apache\bin\httpd.exe"
    popd
)

tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo Starting MySQL...
    start /b "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
)

:: 3. Start Backend with specific Title
echo Starting Backend...
start "Personal-Cloud-Backend" /min cmd /c "npm start"

:: 4. Start Frontend with specific Title
cd client
echo Starting Frontend...
start "Personal-Cloud-Frontend" /min cmd /c "npm run dev"

echo ==========================================
echo    ALL SERVICES STARTED!
echo    Use 'taskkill /FI "WINDOWTITLE eq Personal-Cloud*"' 
echo    to stop specific instances.
echo ==========================================
timeout /t 3 >nul
exit
