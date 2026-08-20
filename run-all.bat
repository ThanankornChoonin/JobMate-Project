@echo off
setlocal

set "ROOT=%~dp0"

start "JobMate Backend" /D "%ROOT%backend" cmd /k npm run dev
start "JobMate Expo Web" /D "%ROOT%" cmd /k npm run web

endlocal
exit /b 0
