@echo off
chcp 65001 > nul
echo ==========================================
echo  로컬 웹 서버를 실행합니다...
echo  브라우저에서 http://localhost:8000 접속 중...
echo ==========================================
start http://localhost:8000
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
