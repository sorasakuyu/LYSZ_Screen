import os
from contextlib import asynccontextmanager
from typing import Dict, Any, List

import psycopg2
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from psycopg2 import extras

DB_CONFIG = {
    "host": os.getenv("PG_HOST", "localhost"),
    "user": os.getenv("PG_USER", "kaguya"),
    "password": os.getenv("PG_PASSWORD", "Mb7cp5MLTPKNWy4y"),
    "dbname": os.getenv("PG_DATABASE", "kaguya"),
    "port": int(os.getenv("PG_PORT", "5432")),
}

# 修复 Pydantic V2 警告：schema_extra → json_schema_extra
class NoticeUpdateRequest(BaseModel):
    title: str = "通知"  # 默认修改标题为"通知"的记录
    context: str  # 通知内容（必填）

    class Config:
        json_schema_extra = {  # 替换原 schema_extra
            "example": {
                "title": "通知",
                "context": "这是更新后的测试通知内容"
            }
        }


class NoticeText:
    def __init__(self, db_config: Dict[str, Any] = None, db=None) -> None:
        self.db_config = db_config or DB_CONFIG
        self._external_db = db
        self.app = FastAPI(lifespan=self._lifespan)
        self._configure_app()
        self._register_routes()

    def _configure_app(self) -> None:
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            # 新增 PUT/POST 方法（支持修改接口）
            allow_methods=["GET", "OPTIONS", "PUT", "POST"],
            allow_headers=["*"],
        )

    def ensure_table(self, db) -> None:
        create_sql = """
        CREATE TABLE IF NOT EXISTS notice_text (
            title TEXT NOT NULL UNIQUE,
            context TEXT NOT NULL
        );
        """
        insert_default_sql = """
        INSERT INTO notice_text (title, context)
        VALUES ('通知', '这是一条测试通知')
        ON CONFLICT (title) DO NOTHING;
        """
        with db.cursor() as cur:
            cur.execute(create_sql)
            cur.execute(insert_default_sql)

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

    def _register_routes(self) -> None:
        app = self.app
        get_db = self.get_db

        # 原有：获取通知内容接口
        @app.get("/", summary="获取通知内容")
        def get_config() -> Dict[str, str]:
            try:
                db = get_db()
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    cur.execute("SELECT title, context FROM notice_text ORDER BY title ASC LIMIT 1")
                    row = cur.fetchone()
                    return {"title": row["title"], "context": row["context"]} if row else {}
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")

        # 新增：修改通知内容接口（PUT 方法，语义更贴合更新）
        @app.put("/update-notice", summary="修改通知内容")
        def update_notice(notice_data: NoticeUpdateRequest = Body(...)):
            # 校验内容非空
            if not notice_data.context or notice_data.context.strip() == "":
                raise HTTPException(status_code=400, detail="通知内容不能为空")
            
            try:
                db = get_db()
                with db.cursor() as cur:
                    # UPSERT：存在则更新，不存在则插入
                    update_sql = """
                    INSERT INTO notice_text (title, context)
                    VALUES (%s, %s)
                    ON CONFLICT (title) DO UPDATE SET context = EXCLUDED.context;
                    """
                    cur.execute(update_sql, (notice_data.title.strip(), notice_data.context.strip()))
                return {"code": 200, "message": "通知内容修改成功", "data": notice_data.dict()}
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"修改失败: {str(e)}")

        # 可选：POST 方法兼容（部分前端习惯用 POST 更新）
        @app.post("/update-notice", summary="修改通知内容（POST 兼容）")
        def update_notice_post(notice_data: NoticeUpdateRequest = Body(...)):
            return update_notice(notice_data)


api = NoticeText()
app = api.app


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9002)