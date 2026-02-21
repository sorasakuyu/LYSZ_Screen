from fastapi import FastAPI, HTTPException, Path
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import psycopg2
from psycopg2 import extras

DB_CONFIG = {
    "host": os.getenv("PG_HOST", "localhost"),
    "user": os.getenv("PG_USER", "screen"),
    "password": os.getenv("PG_PASSWORD", "JKWLmykskJ6GB6iL"),
    "dbname": os.getenv("PG_DATABASE", "screen"),
    "port": int(os.getenv("PG_PORT", "5432")),
}

class AddRequest(BaseModel):
    content: str
    defination: Optional[str] = None
    theme: Optional[str] = None

# 新增编辑请求模型（支持部分字段更新）
class UpdateRequest(BaseModel):
    content: Optional[str] = None
    defination: Optional[str] = None
    theme: Optional[str] = None


class RenminDaily:
    """可复用的人民日报服务封装，可在其他程序中导入使用。"""

    def __init__(self, db_config: Dict[str, Any] = None, public_dir: str = "public", db=None) -> None:
        self.db_config = db_config or DB_CONFIG
        self.public_dir = public_dir
        self._external_db = db
        self.app = FastAPI(lifespan=self._lifespan)
        self._configure_app()
        self._register_routes()

    def _configure_app(self) -> None:
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # 新增 PUT/DELETE 方法
            allow_headers=["*"],
        )
        self.app.mount("/public", StaticFiles(directory=self.public_dir), name="public")

    def ensure_table(self, db) -> None:
        create_sql = """
        CREATE TABLE IF NOT EXISTS renmindaily (
            id SERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            defination TEXT NOT NULL,
            theme TEXT NOT NULL DEFAULT ''
        );
        """
        alter_sql = "ALTER TABLE renmindaily ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT ''"
        with db.cursor() as cur:
            cur.execute(create_sql)
            cur.execute(alter_sql)

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
        print("PostgreSQL 数据库连接成功！")
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

        @app.get("/", include_in_schema=False)
        def get_random_renmin():
            """随机返回一条数据，包含 id、content、defination、theme"""
            try:
                db = get_db()
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    sql = """
                        SELECT id, content, defination, theme
                        FROM renmindaily
                        ORDER BY RANDOM()
                        LIMIT 1
                    """
                    cur.execute(sql)
                    row = cur.fetchone()
                    if not row:
                        raise HTTPException(status_code=404, detail="表中暂无数据")
                    return {
                        "id": row["id"],
                        "content": row["content"],
                        "defination": row["defination"],
                        "theme": row["theme"],
                    }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")

        @app.post("/add", status_code=201)
        def add_renmin(payload: AddRequest):
            """新增数据，兼容可选 defination 与 theme。"""
            defn = payload.defination or ""
            thm = payload.theme or ""
            try:
                db = get_db()
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    sql = "INSERT INTO renmindaily (content, defination, theme) VALUES (%s, %s, %s) RETURNING id"
                    cur.execute(sql, (payload.content, defn, thm))
                    row = cur.fetchone()
                    new_id = row["id"]
                    return {
                        "id": new_id,
                        "content": payload.content,
                        "defination": defn,
                        "theme": thm,
                    }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"新增失败: {str(e)}")

        @app.get("/list")
        def get_all_renmin():
            """获取表中所有数据，返回列表形式，每条包含 id、content、defination、theme"""
            try:
                db = get_db()
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    sql = """
                        SELECT id, content, defination, theme
                        FROM renmindaily
                        ORDER BY id ASC
                    """
                    cur.execute(sql)
                    rows = cur.fetchall()
                    # 格式化返回结果
                    result = [
                        {
                            "id": row["id"],
                            "content": row["content"],
                            "defination": row["defination"],
                            "theme": row["theme"]
                        }
                        for row in rows
                    ]
                    return {
                        "total": len(result),
                        "data": result
                    }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"查询所有数据失败: {str(e)}")

        @app.put("/update/{item_id}")
        def update_renmin(
            item_id: int = Path(..., gt=0, description="要编辑的记录ID"),
            payload: UpdateRequest = None
        ):
            """编辑指定ID的记录，支持部分字段更新（传什么更什么）"""
            # 校验是否有更新字段
            update_fields = {k: v for k, v in payload.dict().items() if v is not None}
            if not update_fields:
                raise HTTPException(status_code=400, detail="未提供任何需要更新的字段")
            
            try:
                db = get_db()
                # 先检查记录是否存在
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    cur.execute("SELECT id FROM renmindaily WHERE id = %s", (item_id,))
                    if not cur.fetchone():
                        raise HTTPException(status_code=404, detail=f"ID为{item_id}的记录不存在")
                    
                    # 构建更新SQL
                    set_clause = ", ".join([f"{k} = %s" for k in update_fields.keys()])
                    sql = f"UPDATE renmindaily SET {set_clause} WHERE id = %s RETURNING id, content, defination, theme"
                    params = list(update_fields.values()) + [item_id]
                    
                    cur.execute(sql, params)
                    updated_row = cur.fetchone()
                    
                    return {
                        "msg": "更新成功",
                        "data": {
                            "id": updated_row["id"],
                            "content": updated_row["content"],
                            "defination": updated_row["defination"],
                            "theme": updated_row["theme"]
                        }
                    }
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")

        @app.delete("/delete/{item_id}")
        def delete_renmin(
            item_id: int = Path(..., gt=0, description="要删除的记录ID")
        ):
            """删除指定ID的记录"""
            try:
                db = get_db()
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    # 先检查记录是否存在
                    cur.execute("SELECT id FROM renmindaily WHERE id = %s", (item_id,))
                    if not cur.fetchone():
                        raise HTTPException(status_code=404, detail=f"ID为{item_id}的记录不存在")
                    
                    # 执行删除
                    cur.execute("DELETE FROM renmindaily WHERE id = %s", (item_id,))
                    if cur.rowcount == 0:
                        raise HTTPException(status_code=500, detail="删除操作执行失败")
                    
                    return {"msg": f"ID为{item_id}的记录已成功删除"}
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


# 可在其他程序中导入 RenminDaily 并复用 app 实例
api = RenminDaily()
app = api.app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9001)