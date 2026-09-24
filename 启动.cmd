@echo off
chcp 65001 >nul
title 寰宇纪年 · 历史版图三维地球
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 Node.js，请先安装 Node 18 以上版本。
  pause
  exit /b 1
)

echo 正在启动本地服务器 http://127.0.0.1:3180/ ...
start "" http://127.0.0.1:3180/
node "scripts\serve.mjs" 3180
pause
