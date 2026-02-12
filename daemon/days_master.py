from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import psycopg2
from psycopg2 import extras
from datetime import datetime, date

DB_CONFIG = {
    "host": os.getenv("PG_HOST", "localhost"),
    "user": os.getenv("PG_USER", "screen"),
    "password": os.getenv("PG_PASSWORD", "JKWLmykskJ6GB6iL"),
    "dbname": os.getenv("PG_DATABASE", "screen"),
    "port": int(os.getenv("PG_PORT", "5432")),
}


class DaysMasterCreate(BaseModel):
    content: str
    time: date  # 仅日期，如 "2026-02-08"


class DaysMasterUpdate(BaseModel):
    content: Optional[str] = None
    time: Optional[date] = None


class DaysMaster:
    def __init__(self, db_config: Dict[str, Any] = None, public_dir: str = "public", db=None) -> None:
        self.db_config = db_config or DB_CONFIG
        self.public_dir = public_dir
        self._external_db = db  # if provided, lifespan will reuse it
        self.app = FastAPI(lifespan=self._lifespan)
        self._configure_app()
        self._register_routes()

    def _configure_app(self) -> None:
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=["*"],
        )
        self.app.mount("/public", StaticFiles(directory=self.public_dir), name="public")

    def ensure_table(self, db) -> None:
        sql = """
        CREATE TABLE IF NOT EXISTS days_master (
            id BIGSERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            time TIMESTAMPTZ NOT NULL
        );
        """
        with db.cursor() as cur:
            cur.execute(sql)

    @asynccontextmanager
    async def _lifespan(self, app: FastAPI):
        created_local = False
        db = self._external_db
        if db is None:
            db = psycopg2.connect(**self.db_config)
            db.autocommit = True
            created_local = True
        self.ensure_table(db)
        app.state.db = db
        print("PostgreSQL 数据库连接成功并已确保表存在！")
        try:
            yield
        finally:
            if created_local:
                try:
                    db.close()
                except Exception:
                    pass

    def get_db(self):
        db = getattr(self.app.state, "db", None)
        if db is None or getattr(db, "closed", 1) != 0:
            db = psycopg2.connect(**self.db_config)
            db.autocommit = True
            self.app.state.db = db
        else:
            try:
                with db.cursor() as cur:
                    cur.execute("SELECT 1")
            except Exception:
                db = psycopg2.connect(**self.db_config)
                db.autocommit = True
                self.app.state.db = db
        return db

    @staticmethod
    def serialize_row(row: dict) -> dict:
        t = row.get("time")
        if isinstance(t, datetime):
            row["time"] = t.date().isoformat()
        elif isinstance(t, date):
            row["time"] = t.isoformat()
        return {"id": row["id"], "content": row["content"], "time": row["time"]}

    def _register_routes(self) -> None:
        app = self.app
        get_db = self.get_db
        serialize_row = self.serialize_row

        @app.get("/")
        def get_all_daysmaster() -> List[dict]:
            """返回所有倒数日，按结束时间升序"""
            try:
                db = get_db()
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT id, content, time
                        FROM days_master
                        ORDER BY time ASC
                        """
                    )
                    rows = cur.fetchall()
                    return [serialize_row(r) for r in rows]
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")

        @app.get("/list")
        def list_daysmaster() -> List[dict]:
            """列出所有倒数日，按结束日期升序"""
            try:
                db = get_db()
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    cur.execute("SELECT id, content, time FROM days_master ORDER BY time ASC")
                    rows = cur.fetchall()
                    return [serialize_row(r) for r in rows]
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")

        @app.get("/{item_id}")
        def get_daysmaster(item_id: int):
            """获取指定 id 的倒数日"""
            try:
                db = get_db()
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    cur.execute("SELECT id, content, time FROM days_master WHERE id = %s", (item_id,))
                    row = cur.fetchone()
                    if not row:
                        raise HTTPException(status_code=404, detail="未找到该倒数日")
                    return serialize_row(row)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")

        @app.post("/")
        def create_daysmaster(payload: DaysMasterCreate):
            """新增倒数日"""
            try:
                db = get_db()
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO days_master(content, time) VALUES (%s, %s) RETURNING id, content, time",
                        (payload.content, payload.time),
                    )
                    row = cur.fetchone()
                    return serialize_row(row)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"新增失败: {str(e)}")

        @app.put("/{item_id}")
        def update_daysmaster(item_id: int, payload: DaysMasterUpdate):
            """编辑倒数日（只更新提供的字段）"""
            try:
                sets = []
                values = []
                if payload.content is not None:
                    sets.append("content = %s")
                    values.append(payload.content)
                if payload.time is not None:
                    sets.append("time = %s")
                    values.append(payload.time)
                if not sets:
                    raise HTTPException(status_code=400, detail="未提供需更新的字段")

                sql = f"UPDATE days_master SET {', '.join(sets)} WHERE id = %s RETURNING id, content, time"
                values.append(item_id)

                db = get_db()
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    cur.execute(sql, tuple(values))
                    row = cur.fetchone()
                    if not row:
                        raise HTTPException(status_code=404, detail="未找到该倒数日")
                    return serialize_row(row)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")

        @app.delete("/{item_id}")
        def delete_daysmaster(item_id: int):
            """删除倒数日"""
            try:
                db = get_db()
                with db.cursor() as cur:
                    cur.execute("DELETE FROM days_master WHERE id = %s", (item_id,))
                    if cur.rowcount == 0:
                        raise HTTPException(status_code=404, detail="未找到该倒数日")
                return {"status": "ok", "deleted_id": item_id}
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


# 可在其他程序中导入 DaysMaster 并复用 app 实例
api = DaysMaster()
app = api.app


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)