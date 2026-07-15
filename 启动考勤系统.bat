@echo off
setlocal
title 考勤系统启动器（正式版）
cd /d d:\HR
set PATH=d:\HR\.tools\node-v20.20.2-win-x64;%PATH%
set PORT=5175
set HOST=0.0.0.0
set OPEN_BROWSER=1

echo.
echo ==============================
echo 正在打包并启动企业员工考勤管理系统正式版...
echo 本机访问地址: http://localhost:%PORT%/
echo 其他电脑访问地址: 请使用你的局域网IP:%PORT%
echo 如果端口被占用，会自动切换到下一个可用端口
echo ==============================
echo.

echo [1/2] 正在打包正式版...
call npm run build
if errorlevel 1 goto build_failed

echo.
echo [2/2] 正在启动正式版服务...
call npm run serve:dist
goto end

:build_failed
echo.
echo 打包失败，请检查上面的错误信息。

:end
pause
endlocal
