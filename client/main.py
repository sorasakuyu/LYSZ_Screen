import webbrowser
import tkinter as tk
import sys
import platform
import time


def open_fullscreen(url):
    """在浏览器中全屏打开指定URL"""
    try:
        # 创建一个tkinter窗口用于检测屏幕信息
        root = tk.Tk()
        root.withdraw()  # 隐藏窗口

        # 获取屏幕尺寸
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()

        # 不同操作系统可能需要不同的处理方式
        current_os = platform.system()

        # 尝试打开浏览器
        webbrowser.open(url)

        # 等待一段时间，让浏览器有时间启动
        time.sleep(2)

        # 对于Windows系统，尝试使用pyautogui模拟F11按键实现全屏
        if current_os == "Windows":
            try:
                import pyautogui
                pyautogui.hotkey('f11')
            except ImportError:
                print("警告: 未安装pyautogui库，无法自动触发全屏模式。请手动按F11进入全屏。")
                print("你可以通过运行 'pip install pyautogui' 来安装此库。")
        elif current_os == "Darwin":  # macOS
            print("提示: 在macOS上，你可能需要手动按Command+Control+F进入全屏。")
        else:  # Linux 等其他系统
            print("提示: 在Linux上，你可能需要手动按F11进入全屏。")

        print(f"浏览器已启动并尝试打开 {url}")
        print(f"屏幕分辨率: {screen_width}x{screen_height}")

    except Exception as e:
        print(f"发生错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    TARGET_URL = "https://kaguya.lysz.sorasaku.vip/"
    open_fullscreen(TARGET_URL)