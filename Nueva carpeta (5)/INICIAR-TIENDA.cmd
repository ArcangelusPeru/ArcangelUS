@echo off
cd /d "%~dp0"
node --preserve-symlinks --preserve-symlinks-main start.cjs --local
pause
