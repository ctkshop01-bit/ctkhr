@echo off
setlocal
title 考勤系统-局域网共享正式版
cd /d d:\HR
set PATH=d:\HR\.tools\node-v20.20.2-win-x64;%PATH%
set PORT=5175
set HOST=0.0.0.0
set OPEN_BROWSER=1

echo.
echo ==========================================
echo 正在打包并启动考勤系统（局域网共享数据版）
echo 本机访问地址: http://localhost:%PORT%/
echo 其他电脑访问地址: http://你的IPv4:%PORT%/
echo.
echo 下面会先生成正式版文件，再启动共享数据服务
echo 如果端口被占用，会自动切换到下一个可用端口
echo 请不要关闭此窗口
echo ==========================================
echo.

ipconfig | findstr /i "IPv4"
echo.

echo [1/2] 正在打包正式版...
call npm run build
if errorlevel 1 goto build_failed

echo.
echo [2/2] 正在启动共享数据服务...
echo 首次使用时，请在主机电脑浏览器中导入当前旧数据作为共享主数据
call npm run serve:shared
goto end

:build_failed
echo.
echo 打包失败，请检查上面的错误信息。

:end
pause
endlocal
