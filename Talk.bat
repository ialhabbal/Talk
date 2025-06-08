@echo off
echo Starting Node.js server from src/Server.js...
start cmd /k "cd src && node Server.js"

timeout /t 3 /nobreak >nul

echo Starting Vue frontend (npm run dev)...
start cmd /k "npm run dev"

timeout /t 5 /nobreak >nul

echo Opening http://localhost:5173 in default browser...
start http://localhost:5173

exit