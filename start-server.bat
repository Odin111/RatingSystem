@echo off
TITLE Rating System Server
cd /d "%~dp0"

:: Check if portable Node.js is available
if exist "nodejs\node.exe" (
    set "PATH=%~dp0nodejs;%PATH%"
) else (
    :: Check if global Node.js is available
    where node >nul 2>nul
    if errorlevel 1 (
        echo ========================================================
        echo Node.js is not installed. Downloading portable Node.js...
        echo Please wait, this may take a minute or two...
        echo ========================================================
        
        powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.14.0/node-v20.14.0-win-x64.zip' -OutFile 'node.zip'"
        
        if not exist "node.zip" (
            echo Failed to download Node.js. Please check your internet connection or install Node.js manually.
            pause
            exit /b
        )
        
        echo Extracting Node.js...
        powershell -Command "Expand-Archive -Path 'node.zip' -DestinationPath '.' -Force"
        
        if exist "node-v20.14.0-win-x64" (
            rename "node-v20.14.0-win-x64" "nodejs"
        )
        
        del "node.zip"
        
        if not exist "nodejs\node.exe" (
            echo Failed to extract Node.js properly. Please install Node.js manually.
            pause
            exit /b
        )
        
        echo Node.js installed successfully!
        set "PATH=%~dp0nodejs;%PATH%"
    )
)

:: Check if node_modules exists, run npm install if missing
if not exist "node_modules\" (
    echo ========================================================
    echo First time setup: Installing required dependencies...
    echo ========================================================
    call npm install
) else (
    :: Verify if better-sqlite3 matches the current Node.js runtime version
    node -e "require('better-sqlite3')" >nul 2>nul
    if errorlevel 1 (
        echo ========================================================
        echo Node module version mismatch detected. Downloading compatible database drivers...
        echo Please wait, this may take a moment...
        echo ========================================================
        if exist "node_modules\better-sqlite3" rmdir /s /q "node_modules\better-sqlite3"
        call npm install better-sqlite3 --force
    )
)

echo Starting Rating System Server...
echo.
echo Please wait while the system initializes.
echo A new browser window will open automatically...
echo.
node server.js 