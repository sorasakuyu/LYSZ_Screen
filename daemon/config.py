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


class ConfigService:
    def __init__(self, db_config: Dict[str, Any] = None, db=None) -> None:
        self.db_config = db_config or DB_CONFIG
        self._external_db = db
        self.app = FastAPI(lifespan=self._lifespan)
        self._configure_app()
        self._register_routes()

    def _configure_app(self) -> None:
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # 生产环境建议限定具体域名
            allow_credentials=True,
            allow_methods=["GET", "OPTIONS", "PUT", "POST"],  # 新增 PUT/POST 方法
            allow_headers=["*"],
        )

    def ensure_table(self, db) -> None:
        create_sql = """
        CREATE TABLE IF NOT EXISTS config (
            key TEXT NOT NULL UNIQUE,
            value TEXT NOT NULL
        );
        """
        insert_default_sql = """
        INSERT INTO config (key, value)
        VALUES ('mode', 'default')
        ON CONFLICT (key) DO NOTHING;
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

        @app.get("/")
        def get_config() -> Dict[str, str]:
            """获取所有配置项"""
            try:
                db = get_db()
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    cur.execute("SELECT key, value FROM config ORDER BY key ASC")
                    rows = cur.fetchall()
                    return {r["key"]: r["value"] for r in rows}
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")

        @app.put("/config/{key}")
        def update_config(
            key: str, 
            value: str = Body(..., embed=True, description="配置项对应的值")
        ) -> Dict[str, Any]:
            """更新指定key的配置值（不存在则创建）"""
            if not key or not isinstance(key, str):
                raise HTTPException(status_code=400, detail="配置key不能为空且必须为字符串")
            
            try:
                db = get_db()
                with db.cursor() as cur:
                    # 使用 UPSERT 语法：存在则更新，不存在则插入
                    cur.execute(
                        """
                        INSERT INTO config (key, value)
                        VALUES (%s, %s)
                        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
                        RETURNING key, value
                        """,
                        (key, value)
                    )
                    updated_row = cur.fetchone()
                    return {
                        "success": True,
                        "data": {"key": updated_row[0], "value": updated_row[1]},
                        "message": "配置更新成功"
                    }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")

        @app.post("/config/batch")
        def batch_update_config(
            configs: Dict[str, str] = Body(..., description="批量配置项 {key: value}")
        ) -> Dict[str, Any]:
            """批量更新配置项（不存在则创建）"""
            if not isinstance(configs, dict) or len(configs) == 0:
                raise HTTPException(status_code=400, detail="批量配置数据不能为空且必须为字典格式")
            
            try:
                db = get_db()
                updated_count = 0
                with db.cursor() as cur:
                    for key, value in configs.items():
                        if not key or not isinstance(value, str):
                            continue  # 跳过无效的配置项
                        cur.execute(
                            """
                            INSERT INTO config (key, value)
                            VALUES (%s, %s)
                            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
                            """,
                            (key, value)
                        )
                        updated_count += 1
                
                return {
                    "success": True,
                    "updated_count": updated_count,
                    "message": f"批量更新完成，共处理 {updated_count} 个配置项"
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"批量更新失败: {str(e)}")

        @app.delete("/config/{key}")
        def delete_config(key: str) -> Dict[str, Any]:
            """删除指定key的配置项（可选补充）"""
            try:
                db = get_db()
                with db.cursor() as cur:
                    cur.execute("DELETE FROM config WHERE key = %s RETURNING key", (key,))
                    deleted_row = cur.fetchone()
                    if not deleted_row:
                        raise HTTPException(status_code=404, detail=f"配置项 {key} 不存在")
                    
                    return {
                        "success": True,
                        "message": f"配置项 {key} 删除成功"
                    }
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


api = ConfigService()
app = api.app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=9002)