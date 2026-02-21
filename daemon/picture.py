import os
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional

import psycopg2
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from psycopg2 import extras

DB_CONFIG = {
    "host": os.getenv("PG_HOST", "localhost"),
    "user": os.getenv("PG_USER", "kaguya"),
    "password": os.getenv("PG_PASSWORD", "Mb7cp5MLTPKNWy4y"),
    "dbname": os.getenv("PG_DATABASE", "kaguya"),
    "port": int(os.getenv("PG_PORT", "5432")),
}


class NoticePicture:
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
            allow_methods=["GET", "PUT", "OPTIONS"],  # 新增PUT方法支持
            allow_headers=["*"],
        )

    def ensure_table(self, db) -> None:
        create_sql = """
        CREATE TABLE IF NOT EXISTS notice_picture (
            url TEXT NOT NULL
        );
        """
        # 修复：避免重复插入默认数据（原逻辑每次启动都会插入，导致多条重复）
        check_default_sql = "SELECT COUNT(*) FROM notice_picture;"
        insert_default_sql = """
        INSERT INTO notice_picture (url)
        VALUES ('url')
        """
        with db.cursor() as cur:
            cur.execute(create_sql)
            cur.execute(check_default_sql)
            count = cur.fetchone()[0]
            if count == 0:  # 仅表为空时插入默认数据
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

        @app.get("/", summary="获取图片URL", response_description="返回当前的图片URL")
        def get_video() -> Dict[str, Optional[str]]:
            """
            获取当前存储的图片URL（兼容原接口路径 / ）
            返回格式: {"url": "当前的图片地址"}
            """
            try:
                db = get_db()
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    # 修复：移除id依赖，取最后一条（通过ctid伪列，PostgreSQL内置行标识）
                    cur.execute("SELECT url FROM notice_picture ORDER BY ctid DESC LIMIT 1")
                    row = cur.fetchone()
                    if row:
                        return {"url": row["url"]}
                    return {"url": None}
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")

        @app.put("/", summary="修改图片URL", response_description="返回修改后的图片URL")
        def update_picture_url(new_url: str = Body(..., embed=True, description="新的图片URL")) -> Dict[str, str]:
            """
            修改图片URL（新增接口）
            - 请求体参数: new_url (必填) - 新的图片URL地址
            - 返回格式: {"url": "修改后的图片地址"}
            """
            # 验证URL非空
            if not new_url or not new_url.strip():
                raise HTTPException(status_code=400, detail="URL不能为空")
            
            clean_url = new_url.strip()
            try:
                db = get_db()
                with db.cursor() as cur:
                    # 步骤1：检查表中是否有数据
                    cur.execute("SELECT COUNT(*) FROM notice_picture")
                    count = cur.fetchone()[0]
                    
                    if count > 0:
                        # 有数据：先清空旧数据（原逻辑只有单条URL，清空后插入新的更简单）
                        cur.execute("DELETE FROM notice_picture")
                    
                    # 步骤2：插入新URL（保证表中始终只有一条数据）
                    cur.execute("INSERT INTO notice_picture (url) VALUES (%s)", (clean_url,))
                
                return {"url": clean_url}
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")


api = NoticePicture()
app = api.app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=9003)