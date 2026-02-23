from fastapi import FastAPI
import os
import psycopg2

from renmin_daily import RenminDaily
from days_master import DaysMaster
from config import ConfigService
from video import VideoService
from notice import NoticeText
from picture import NoticePicture
from device import DeviceService


DB_CONFIG = {
    "host": os.getenv("PG_HOST", "localhost"),
    "user": os.getenv("PG_USER", "postgres"),
    "password": os.getenv("PG_PASSWORD", "EdbzFZGzs8ZDiMZ4"),
    "dbname": os.getenv("PG_DATABASE", "kaguya2"),
    "port": int(os.getenv("PG_PORT", "5432")),
}


def create_app() -> FastAPI:
    renmin_daily_api = RenminDaily(db_config=DB_CONFIG)
    days_master_api = DaysMaster(db_config=DB_CONFIG)
    config_api = ConfigService(db_config=DB_CONFIG)
    video_api = VideoService(db_config=DB_CONFIG)
    notice_text_api = NoticeText(db_config=DB_CONFIG)
    notice_picture_api = NoticePicture(db_config=DB_CONFIG)
    device_api = DeviceService(db_config=DB_CONFIG)

    app = FastAPI()
    app.mount("/renmin", renmin_daily_api.app)
    app.mount("/days", days_master_api.app)
    app.mount("/config", config_api.app)
    app.mount("/video", video_api.app)
    app.mount("/notice", notice_text_api.app)
    app.mount("/picture", notice_picture_api.app)
    app.mount("/device", device_api.app)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=9000)