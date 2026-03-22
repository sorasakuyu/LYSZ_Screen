@echo off
chcp 65001 > nul
title 定时删除天气文件脚本 - 每600秒执行一次
echo ================================================
echo     定时删除文件脚本已启动
echo     目标文件：weather_now.json、weather_3d.json
echo     执行间隔：600秒（10分钟）
echo     监控目录：%cd%
echo     启动时间：%date% %time%
echo     按 Ctrl+C 可终止脚本运行
echo ================================================
echo.

:: 无限循环执行
:LOOP
    :: 记录当前执行时间
    set "EXEC_TIME=%date% %time%"
    echo [执行时间] %EXEC_TIME%
    
    :: 删除weather_now.json
    if exist "weather_now.json" (
        del /f /q "weather_now.json" > nul
        echo [成功] 删除 weather_now.json
    ) else (
        echo [提示] 未找到 weather_now.json，无需删除
    )
    
    :: 删除weather_3d.json（注意：你原脚本写的是weather_3d,json，这里修正为正确的.json后缀）
    if exist "weather_3d.json" (
        del /f /q "weather_3d.json" > nul
        echo [成功] 删除 weather_3d.json
    ) else (
        echo [提示] 未找到 weather_3d.json，无需删除
    )
    
    echo.
    echo [等待] 即将等待600秒，下次执行时间约为：
    timeout /t 600 /nobreak > nul
    
:: 回到循环开头
goto LOOP