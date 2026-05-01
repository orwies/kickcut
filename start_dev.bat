@echo off
title KickCut Development Environment
color 0A

echo ========================================================
echo          Starting KickCut Development Services          
echo ========================================================
echo.

echo [1/3] Starting Storage Server...
start "KickCut - Storage Server" cmd /k "npm run dev:storage"
timeout /t 3 /nobreak > NUL

echo [2/3] Starting Main Server...
start "KickCut - Main Server" cmd /k "npm run dev:server"
timeout /t 3 /nobreak > NUL

echo [3/3] Starting Client UI...
start "KickCut - Client" cmd /k "npm run dev:client"

echo.
echo ========================================================
echo   All services have been launched in separate windows!  
echo   You can safely close this window now.                 
echo ========================================================
echo.
pause
