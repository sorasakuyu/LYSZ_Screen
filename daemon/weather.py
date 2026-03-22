from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
import os
import json
import asyncio
import logging
import httpx

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

API_KEY = "7ff913a997ea42d5bd3bd8d1840aa0e5"
API_URL_NOW = "https://ny4up3enmw.re.qweatherapi.com/v7/weather/now?location=101120911"
API_URL_3D = "https://ny4up3enmw.re.qweatherapi.com/v7/weather/3d?location=101120911"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEATHER_FILE_NOW = os.path.join(BASE_DIR, "weather_now.json")
WEATHER_FILE_3D = os.path.join(BASE_DIR, "weather_3d.json")
FETCH_INTERVAL = 600

class WeatherService:
    """天气服务模块，每十分钟获取一次天气数据并提供API接口"""

    def __init__(self) -> None:
        self.app = FastAPI(lifespan=self._lifespan)
        self._configure_app()
        self._register_routes()
        self._http_client = None

    def _configure_app(self) -> None:
        """配置应用"""
        pass

    async def _lifespan(self, app: FastAPI):
        """应用生命周期管理"""
        self._http_client = httpx.AsyncClient(timeout=15.0)
        
        async def run_scheduled_fetch():
            while True:
                try:
                    logger.info("开始获取天气数据...")
                    await asyncio.gather(
                        self.fetch_weather_data(),
                        self.fetch_weather_3d_data()
                    )
                    logger.info(f"天气数据获取完成，下次更新将在 {FETCH_INTERVAL} 秒后")
                except Exception as e:
                    logger.error(f"定时获取天气数据时发生错误: {str(e)}")
                
                await asyncio.sleep(FETCH_INTERVAL)
        
        task = asyncio.create_task(run_scheduled_fetch())
        
        yield
        
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        
        if self._http_client:
            await self._http_client.aclose()

    async def fetch_weather_data(self):
        """获取当前天气数据并存储到文件"""
        try:
            headers = {
                "X-QW-Api-Key": API_KEY,
                "Accept-Encoding": "gzip, deflate, br"
            }
            response = await self._http_client.get(API_URL_NOW, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            with open(WEATHER_FILE_NOW, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            logger.info("当前天气数据获取成功并更新到文件")
        except Exception as e:
            logger.error(f"获取当前天气数据失败: {str(e)}")
    
    async def fetch_weather_3d_data(self):
        """获取3天天气预报数据并存储到文件"""
        try:
            headers = {
                "X-QW-Api-Key": API_KEY,
                "Accept-Encoding": "gzip, deflate, br"
            }
            response = await self._http_client.get(API_URL_3D, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            with open(WEATHER_FILE_3D, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            logger.info("3天天气预报数据获取成功并更新到文件")
        except Exception as e:
            logger.error(f"获取3天天气预报数据失败: {str(e)}")

    def _register_routes(self) -> None:
        """注册路由"""
        app = self.app

        @app.get("/now")
        async def get_weather_now():
            """获取当前天气数据"""
            try:
                if not os.path.exists(WEATHER_FILE_NOW):
                    await self.fetch_weather_data()
                    if not os.path.exists(WEATHER_FILE_NOW):
                        raise Exception("获取天气数据失败，文件未创建")
                
                with open(WEATHER_FILE_NOW, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return data
            except Exception as e:
                logger.error(f"读取天气数据失败: {str(e)}")
                raise HTTPException(status_code=500, detail=f"获取天气数据失败: {str(e)}")
        
        @app.get("/3d")
        async def get_weather_3d():
            """获取3天天气预报数据"""
            try:
                if not os.path.exists(WEATHER_FILE_3D):
                    await self.fetch_weather_3d_data()
                    if not os.path.exists(WEATHER_FILE_3D):
                        raise Exception("获取3天天气预报数据失败，文件未创建")
                
                with open(WEATHER_FILE_3D, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return data
            except Exception as e:
                logger.error(f"读取3天天气预报数据失败: {str(e)}")
                raise HTTPException(status_code=500, detail=f"获取3天天气预报数据失败: {str(e)}")


api = WeatherService()
app = api.app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9002)
