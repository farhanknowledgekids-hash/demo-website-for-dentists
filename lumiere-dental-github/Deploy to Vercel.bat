@echo off
setlocal
title Deploy Lumiere Dental to Vercel
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is needed. Download it from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

echo.
echo  ==============================================
echo   Deploying Lumiere Dental to Vercel
echo  ==============================================
echo.

rem Copy the built site to a folder named lumiere-dental, so the Vercel project gets that name.
set "SITE=%TEMP%\lumiere-dental"
if exist "%SITE%" rmdir /s /q "%SITE%"
robocopy "%~dp0dist" "%SITE%" /E /NFL /NDL /NJH /NJS /NP >nul
if exist "%SITE%\index.single.html" del "%SITE%\index.single.html"
if exist "%~dp0vercel-status.txt" del "%~dp0vercel-status.txt"

rem Step 1: log in (opens your browser - click Confirm there). Quick if you are already logged in.
echo  Step 1: Log in to Vercel.
echo  A browser page opens: click Confirm / Authorize, then come back to this window.
echo.
echo LOGIN > "%~dp0vercel-status.txt"
rem already logged in? (stdin from nul so it can never sit waiting for input)
call npx --yes vercel whoami <nul >nul 2>nul
if not errorlevel 1 goto loggedin
call npx --yes vercel login
if errorlevel 1 (
  echo LOGIN_FAILED > "%~dp0vercel-status.txt"
  echo.
  echo  Login did not finish. Run this file again to retry.
  pause
  exit /b 1
)

rem Step 2: deploy to production.
:loggedin
echo DEPLOYING > "%~dp0vercel-status.txt"
echo.
echo  Step 2: Uploading the website... (takes about a minute)
echo.
cd /d "%SITE%"
call npx --yes vercel deploy --prod --yes <nul > "%~dp0vercel-deploy-log.txt" 2>&1
set "RESULT=%errorlevel%"
type "%~dp0vercel-deploy-log.txt"

if not "%RESULT%"=="0" (
  echo DEPLOY_FAILED > "%~dp0vercel-status.txt"
  echo.
  echo  The deploy failed. The details are saved in vercel-deploy-log.txt.
  pause
  exit /b 1
)

powershell -NoProfile -Command "$t = Get-Content -Raw '%~dp0vercel-deploy-log.txt'; $m = [regex]::Matches($t, 'https://[a-z0-9-]+\.vercel\.app'); if ($m.Count) { $u = $m[$m.Count-1].Value; Set-Content -Path '%~dp0vercel-url.txt' -Value $u; Write-Host ''; Write-Host ' LIVE WEBSITE:' $u -ForegroundColor Green; Start-Process $u }"
echo DONE > "%~dp0vercel-status.txt"

echo.
echo  Done. Share the address above with anyone. Bookings go to your Google Sheet.
echo  The address is also saved in vercel-url.txt in this folder.
echo.
pause
