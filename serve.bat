@echo off
title RAZ OUD - 3D Scroll Hero Experience
echo Starting local web server on port 8080...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
