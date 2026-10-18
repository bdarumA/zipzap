@echo off
setlocal
cd /d "%~dp0"
title SIANKAI V7 - Cloudflare D1 Initial Setup
where npx.cmd >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js / npx not available.
  pause
  exit /b 1
)
echo.
echo --------------------------------------------------------
echo SIANKAI V7 - D1 initial setup (one time only)
echo --------------------------------------------------------
echo.
echo This command creates a Cloudflare D1 database named
 echo siankai-traffic.
echo.
echo IMPORTANT: If this database ALREADY EXISTS, press Ctrl+C
 echo now and follow README_V7.txt to avoid recreating it.
echo.
pause
call npx.cmd wrangler d1 create siankai-traffic
if errorlevel 1 (
  echo.
  echo Create failed or database already exists. Do NOT run the next step blindly.
  echo See README_V7.txt
  pause
  exit /b 1
)
echo.
echo Database creation finished. Initializing schema...
call npx.cmd wrangler d1 execute siankai-traffic --remote --file=schema.sql
if errorlevel 1 (
  echo.
  echo Initialization failed. Fix setup then run:
  echo npx wrangler d1 execute siankai-traffic --remote --file=schema.sql
  pause
  exit /b 1
)
echo.
echo Database initialized successfully.
echo NEXT: Bind D1 in Cloudflare Pages project Settings:
echo Binding name: SIANKAI_TRAFFIC_DB
 echo D1 database: siankai-traffic
 echo Then run DEPLOY_SIANKAI.cmd again.
pause
