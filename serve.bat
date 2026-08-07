@echo off
setlocal

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8001"
set "HOST=%~2"
if "%HOST%"=="" set "HOST=127.0.0.1"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-generated-images.ps1"
python dev_server.py %PORT% %HOST%
