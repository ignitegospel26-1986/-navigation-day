@echo off
rem Ensure Node is on PATH for spawned dev servers (harness inherits a stale PATH).
set "PATH=C:\Program Files\nodejs;%PATH%"
call npm run dev
