@echo off
setlocal

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8000"

python server.py %PORT%
