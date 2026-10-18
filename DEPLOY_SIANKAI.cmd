@echo off
setlocal
cd /d "%~dp0"
title SIANKAI Cloudflare Pages Deployment
if not exist "public\index.html" (
  echo ERROR: public\index.html not found. Extract the full ZIP first.
  pause
  exit /b 1
)
if not exist "public\admin.html" (
  echo ERROR: public\admin.html not found.
  pause
  exit /b 1
)
if not exist "functions\_middleware.js" (
  echo ERROR: V7 landing page middleware is missing.
  pause
  exit /b 1
)
if not exist "functions\api\traffic-stats.js" (
  echo ERROR: V7 traffic API is missing.
  pause
  exit /b 1
)
if not exist "lib\traffic.js" (
  echo ERROR: V7 analytics module is missing.
  pause
  exit /b 1
)
if not exist "functions\api\pixel-config.js" (
  echo ERROR: Cloudflare Function is missing.
  pause
  exit /b 1
)
where npx.cmd >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js / npx not installed or not in PATH.
  echo Install Node.js LTS and retry.
  pause
  exit /b 1
)
echo.
echo Deploying SIANKAI V7 - Sales + Admin + site-wide Traffic Intelligence
 echo Project: siankaiss-web  Branch: production
 echo.
call npx.cmd wrangler pages deploy public --project-name siankaiss-web --branch production
if errorlevel 1 (
  echo.
  echo DEPLOY FAILED: Check the error above. The previous deployment remains.
  pause
  exit /b 1
)
echo.
echo DEPLOY COMMAND COMPLETED. Test the site and Admin before sharing.
echo Site: https://siankaiss-web.pages.dev
echo Admin: https://siankaiss-web.pages.dev/admin.html
echo IMPORTANT: Traffic reports require the SIANKAI_TRAFFIC_DB D1 binding and schema.sql.
echo.
pause
