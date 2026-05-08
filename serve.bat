@echo off
setlocal

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8000"
set "HOST=%~2"
if "%HOST%"=="" set "HOST=127.0.0.1"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-generated-images.ps1"
python server.py %PORT% %HOST%
