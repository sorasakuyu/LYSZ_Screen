from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
import os
import json
import requests
import asyncio
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# API 配置
API_KEY = "7ff913a997ea42d5bd3bd8d1840aa0e5"
API_URL = "https://ny4up3enmw.re.qweatherapi.com/v7/weather/now?location=101120911"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEATHER_FILE = os.path.join(BASE_DIR, "weather_now.json")

class WeatherService:
    """天气服务模块，每十分钟获取一次天气数据并提供API接口"""

    def __init__(self) -> None:
        self.app = FastAPI(lifespan=self._lifespan)
        self._configure_app()
        self._register_routes()

    def _configure_app(self) -> None:
        """配置应用"""
        pass

    async def _lifespan(self, app: FastAPI):
        """应用生命周期管理"""
        # 启动时立即获取一次天气数据
        asyncio.create_task(self.fetch_weather_data())
        # 启动定时任务
        asyncio.create_task(self.scheduled_fetch())
        yield

    async def scheduled_fetch(self):
        """定时获取天气数据，每十分钟执行一次"""
        while True:
            await asyncio.sleep(600)  # 10分钟
            await self.fetch_weather_data()

    async def fetch_weather_data(self):
        """获取天气数据并存储到文件"""
        try:
            headers = {
                "X-QW-Api-Key": API_KEY,
                "Accept-Encoding": "gzip, deflate, br"
            }
            response = requests.get(API_URL, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # 存储数据到文件
            with open(WEATHER_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            logger.info("天气数据获取成功并更新到文件")
        except Exception as e:
            logger.error(f"获取天气数据失败: {str(e)}")

    def _register_routes(self) -> None:
        """注册路由"""
        app = self.app

        @app.get("/now")
        async def get_weather_now():
            """获取当前天气数据"""
            try:
                if not os.path.exists(WEATHER_FILE):
                    # 如果文件不存在，立即获取数据
                    await self.fetch_weather_data()
                    # 再次检查文件是否存在
                    if not os.path.exists(WEATHER_FILE):
                        raise Exception("获取天气数据失败，文件未创建")
                
                with open(WEATHER_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return data
            except Exception as e:
                logger.error(f"读取天气数据失败: {str(e)}")
                raise HTTPException(status_code=500, detail=f"获取天气数据失败: {str(e)}")


api = WeatherService()
app = api.app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9002)
