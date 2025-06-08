@echo off
cd /d "%~dp0"

REM Run server.js on port 3000
start "NodeServer" cmd /k node server.js

REM Wait 5 seconds for server.js to start
timeout /t 5 /nobreak >nul

REM Start Python HTTP server on port 3001
start "PythonServer" cmd /k python -m http.server 3001

REM Wait a bit
timeout /t 2 /nobreak >nul

REM Open the browser to the Python server on port 3001
start "" http://localhost:3001/


