@echo off
setlocal

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8000"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-generated-images.ps1"
python server.py %PORT%
