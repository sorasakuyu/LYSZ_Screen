from fastapi import FastAPI
import os
import psycopg2

from renmin_daily import RenminDaily
from days_master import DaysMaster


DB_CONFIG = {
    "host": os.getenv("PG_HOST", "localhost"),
    "user": os.getenv("PG_USER", "kaguya"),
    "password": os.getenv("PG_PASSWORD", "Mb7cp5MLTPKNWy4y"),
    "dbname": os.getenv("PG_DATABASE", "kaguya"),
    "port": int(os.getenv("PG_PORT", "5432")),
}


def create_db_connection():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = True
    return conn


if __name__ == "__main__":
    renmin_db = create_db_connection()
    days_db = create_db_connection()

    renmin_daily_api = RenminDaily(db=renmin_db, db_config=DB_CONFIG)
    days_master_api = DaysMaster(db=days_db, db_config=DB_CONFIG)

    app = FastAPI()
    app.mount("/renmin", renmin_daily_api.app)
    app.mount("/days", days_master_api.app)

    import uvicorn

    try:
        uvicorn.run(app, host="0.0.0.0", port=9000)
    finally:
        try:
            renmin_db.close()
        except Exception:
            pass
        try:
            days_db.close()
        except Exception:
            pass