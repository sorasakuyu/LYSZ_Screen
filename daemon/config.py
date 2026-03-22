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
    "client_encoding": "UTF-8",
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
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["GET", "OPTIONS", "PUT", "POST"],
            allow_headers=["*"],
        )

    def ensure_table(self, db) -> None:
        create_sql = """
        CREATE TABLE IF NOT EXISTS config (
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            device TEXT NOT NULL DEFAULT 'default'
        );
        """
        alter_device_sql = """
        ALTER TABLE config
        ADD COLUMN IF NOT EXISTS device TEXT NOT NULL DEFAULT 'default'
        """
        drop_key_unique_sql = """
        ALTER TABLE config
        DROP CONSTRAINT IF EXISTS config_key_key
        """
        drop_key_pk_sql = """
        ALTER TABLE config
        DROP CONSTRAINT IF EXISTS config_pkey
        """
        add_unique_sql = """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'config_device_key_key'
            ) THEN
                ALTER TABLE config
                ADD CONSTRAINT config_device_key_key UNIQUE (device, key);
            END IF;
        END $$;
        """
        insert_default_sql = """
        INSERT INTO config (device, key, value)
        VALUES
            ('default', 'mode', 'default'),
            ('default', 'notice_mode', 'text')
        ON CONFLICT (device, key) DO NOTHING;
        """
        with db.cursor() as cur:
            cur.execute(create_sql)
            cur.execute(alter_device_sql)
            cur.execute(drop_key_unique_sql)
            cur.execute(drop_key_pk_sql)
            cur.execute(add_unique_sql)
            cur.execute(insert_default_sql)

    @asynccontextmanager
    async def _lifespan(self, app: FastAPI):
        created_local = False
        db = self._external_db
        if db is None:
            db = psycopg2.connect(**self.db_config)
            db.set_client_encoding('UTF8')
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
            db.set_client_encoding('UTF8')
            db.autocommit = True
            self.app.state.db = db
            self.ensure_table(db)
        else:
            try:
                with db.cursor() as cur:
                    cur.execute("SELECT 1")
            except Exception:
                db = psycopg2.connect(**self.db_config)
                db.set_client_encoding('UTF8')
                db.autocommit = True
                self.app.state.db = db
                self.ensure_table(db)
        return db

    def _ensure_device_defaults(self, db, device: str) -> None:
        with db.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM config
                WHERE device = %s
                LIMIT 1
                """,
                (device,),
            )
            if cur.fetchone() is None:
                cur.execute(
                    """
                    INSERT INTO config (device, key, value)
                    VALUES
                        (%s, 'mode', 'default'),
                        (%s, 'notice_mode', 'text')
                    ON CONFLICT (device, key) DO NOTHING
                    """,
                    (device, device),
                )

    def _register_routes(self) -> None:
        app = self.app
        get_db = self.get_db

        @app.get("/")
        def get_config(device: str = "default") -> Dict[str, str]:
            """获取所有配置项"""
            try:
                db = get_db()
                self._ensure_device_defaults(db, device)
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT key, value
                        FROM config
                        WHERE device = %s
                        ORDER BY key ASC
                        """,
                        (device,),
                    )
                    rows = cur.fetchall()
                    return {r["key"]: r["value"] for r in rows}
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")

        @app.put("/config/{key}")
        def update_config(
            key: str, 
            value: str = Body(..., embed=True, description="配置项对应的值"),
            device: str = Body("default", embed=True, description="设备标识")
        ) -> Dict[str, Any]:
            """更新指定key的配置值（不存在则创建）"""
            if not key or not isinstance(key, str):
                raise HTTPException(status_code=400, detail="配置key不能为空且必须为字符串")
            
            try:
                db = get_db()
                self._ensure_device_defaults(db, device)
                with db.cursor() as cur:
                    # 使用 UPSERT 语法：存在则更新，不存在则插入
                    cur.execute(
                        """
                        INSERT INTO config (device, key, value)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (device, key) DO UPDATE SET value = EXCLUDED.value
                        RETURNING device, key, value
                        """,
                        (device, key, value)
                    )
                    updated_row = cur.fetchone()
                    return {
                        "success": True,
                        "data": {"device": updated_row[0], "key": updated_row[1], "value": updated_row[2]},
                        "message": "配置更新成功"
                    }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")

        @app.post("/config/batch")
        def batch_update_config(
            payload: Dict[str, Any] = Body(..., description="批量配置项 {device, configs}")
        ) -> Dict[str, Any]:
            """批量更新配置项（不存在则创建）"""
            device = payload.get("device", "default")
            configs = payload.get("configs")
            if not isinstance(configs, dict) or len(configs) == 0:
                raise HTTPException(status_code=400, detail="批量配置数据不能为空且必须为字典格式")
            
            try:
                db = get_db()
                self._ensure_device_defaults(db, device)
                updated_count = 0
                with db.cursor() as cur:
                    for key, value in configs.items():
                        if not key or not isinstance(value, str):
                            continue  # 跳过无效的配置项
                        cur.execute(
                            """
                            INSERT INTO config (device, key, value)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (device, key) DO UPDATE SET value = EXCLUDED.value
                            """,
                            (device, key, value)
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
        def delete_config(key: str, device: str = "default") -> Dict[str, Any]:
            """删除指定key的配置项（可选补充）"""
            try:
                db = get_db()
                self._ensure_device_defaults(db, device)
                with db.cursor() as cur:
                    cur.execute(
                        "DELETE FROM config WHERE device = %s AND key = %s RETURNING key",
                        (device, key),
                    )
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