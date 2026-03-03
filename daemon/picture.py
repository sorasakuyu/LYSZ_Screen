import base64
import io
import os
import shutil
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional, List

import psycopg2
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from psycopg2 import extras
from pydantic import BaseModel

DB_CONFIG = {
    "host": os.getenv("PG_HOST", "localhost"),
    "user": os.getenv("PG_USER", "kaguya"),
    "password": os.getenv("PG_PASSWORD", "Mb7cp5MLTPKNWy4y"),
    "dbname": os.getenv("PG_DATABASE", "kaguya"),
    "port": int(os.getenv("PG_PORT", "5432")),
}

PICTURE_ROOT = os.getenv("PICTURE_ROOT", r"/media/zhngjah/Data/lysz/BigScreen/public/Data/Picture")
PICTURE_PUBLIC_BASE = os.getenv("PICTURE_PUBLIC_BASE", "http://home.kaguya.lysz.sorasaku.vip/Data/Picture/")
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
THUMBNAIL_SIZE = (200, 200)


def _ensure_picture_dir(create_if_missing: bool = False) -> str:
    if os.path.isdir(PICTURE_ROOT):
        return PICTURE_ROOT
    if create_if_missing:
        os.makedirs(PICTURE_ROOT, exist_ok=True)
        return PICTURE_ROOT
    raise HTTPException(status_code=500, detail=f"图片目录不存在: {PICTURE_ROOT}")


def _is_image_file(filename: str) -> bool:
    _, ext = os.path.splitext(filename)
    return ext.lower() in ALLOWED_IMAGE_EXTENSIONS


def _build_thumbnail(file_path: str) -> str:
    try:
        from PIL import Image
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="Pillow未安装，无法生成缩略图") from exc

    try:
        with Image.open(file_path) as img:
            img.thumbnail(THUMBNAIL_SIZE)
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA")
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
            return f"data:image/png;base64,{encoded}"
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"生成缩略图失败: {str(exc)}") from exc


def _build_public_url(filename: str) -> str:
    base = PICTURE_PUBLIC_BASE
    if not base.endswith("/"):
        base += "/"
    rel_path = str(filename).replace("\\", "/").lstrip("/")
    return f"{base}{rel_path}"


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
            allow_methods=["GET", "PUT", "POST", "OPTIONS"], 
            allow_headers=["*"],
        )

    def ensure_table(self, db) -> None:
        create_sql = """
        CREATE TABLE IF NOT EXISTS notice_picture (
            url TEXT NOT NULL,
            device TEXT NOT NULL DEFAULT 'default'
        );
        """
        alter_device_sql = """
        ALTER TABLE notice_picture
        ADD COLUMN IF NOT EXISTS device TEXT NOT NULL DEFAULT 'default'
        """
        drop_pk_sql = """
        ALTER TABLE notice_picture
        DROP CONSTRAINT IF EXISTS notice_picture_pkey
        """
        add_unique_sql = """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'notice_picture_device_key'
            ) THEN
                ALTER TABLE notice_picture
                ADD CONSTRAINT notice_picture_device_key UNIQUE (device);
            END IF;
        END $$;
        """
        drop_is_file_sql = """
        ALTER TABLE notice_picture
        DROP COLUMN IF EXISTS is_file
        """
        with db.cursor() as cur:
            cur.execute(create_sql)
            cur.execute(alter_device_sql)
            cur.execute(drop_pk_sql)
            cur.execute(add_unique_sql)
            cur.execute(drop_is_file_sql)

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
            self.ensure_table(db)
        else:
            try:
                with db.cursor() as cur:
                    cur.execute("SELECT 1")
            except Exception:
                db = psycopg2.connect(**self.db_config)
                db.autocommit = True
                self.app.state.db = db
                self.ensure_table(db)
        return db

    def _ensure_device_placeholder(self, db, device: str) -> None:
        with db.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM notice_picture
                WHERE device = %s
                LIMIT 1
                """,
                (device,),
            )
            if cur.fetchone() is None:
                cur.execute(
                    """
                    INSERT INTO notice_picture (url, device)
                    VALUES (%s, %s)
                    ON CONFLICT (device) DO NOTHING
                    """,
                    ("", device),
                )

    def _register_routes(self) -> None:
        app = self.app
        get_db = self.get_db

        class PictureUrlUpdate(BaseModel):
            device: str
            filename: str

        @app.get("/", summary="获取图片URL", response_description="返回当前的图片URL")
        def get_video(device: str = "default") -> Dict[str, Optional[str]]:
            """
            获取当前存储的图片URL（兼容原接口路径 / ）
            返回格式: {"url": "当前的图片地址"}
            """
            try:
                db = get_db()
                self._ensure_device_placeholder(db, device)
                with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT url
                        FROM notice_picture
                        WHERE device = %s
                          AND url <> ''
                          AND url LIKE 'http%%'
                        ORDER BY ctid DESC
                        LIMIT 1
                        """,
                        (device,),
                    )
                    row = cur.fetchone()
                    if row and row["url"]:
                        return {"url": row["url"]}
                    return {"url": None}
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")

        @app.put("/", summary="修改图片URL", response_description="返回修改后的图片URL")
        def update_picture_url(payload: PictureUrlUpdate) -> Dict[str, str]:
            """
            修改图片URL（新增接口）
            - 请求体参数: new_url (必填) - 新的图片URL地址
            - 返回格式: {"url": "修改后的图片地址"}
            """
            # 验证URL非空
            if not payload.filename or not payload.filename.strip():
                raise HTTPException(status_code=400, detail="文件名不能为空")

            safe_name = os.path.basename(payload.filename.strip())
            if not safe_name:
                raise HTTPException(status_code=400, detail="文件名不能为空")

            full_url = _build_public_url(safe_name)
            try:
                db = get_db()
                self._ensure_device_placeholder(db, payload.device)
                with db.cursor() as cur:
                    cur.execute(
                        """
                        DELETE FROM notice_picture
                        WHERE device = %s
                        AND url LIKE 'http%%'
                        """,
                        (payload.device,),
                    )
                    cur.execute(
                        """
                        INSERT INTO notice_picture (url, device)
                        VALUES (%s, %s)
                        ON CONFLICT (device) DO UPDATE SET url = EXCLUDED.url
                        """,
                        (full_url, payload.device),
                    )
                
                return {"url": full_url}
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")

        @app.get("/files", summary="获取图片文件及缩略图", response_description="返回文件名与缩略图")
        def list_pictures() -> Dict[str, List[Dict[str, str]]]:
            """
            获取图片目录下所有图片的文件名与缩略图
            返回格式: {"items": [{"filename": "...", "thumbnail": "data:image/png;base64,..."}]}
            """
            picture_dir = _ensure_picture_dir()
            items: List[Dict[str, str]] = []
            for filename in sorted(os.listdir(picture_dir)):
                if not _is_image_file(filename):
                    continue
                file_path = os.path.join(picture_dir, filename)
                if not os.path.isfile(file_path):
                    continue
                thumbnail = _build_thumbnail(file_path)
                items.append({"filename": filename, "thumbnail": thumbnail})
            return {"items": items}

        @app.post("/upload", summary="上传图片", response_description="返回上传后的文件名")
        async def upload_picture(
            file: UploadFile = File(..., description="上传的图片文件"),
        ) -> Dict[str, str]:
            """
            上传图片到指定目录
            返回格式: {"filename": "上传后的文件名"}
            """
            if not file.filename:
                raise HTTPException(status_code=400, detail="文件名不能为空")

            safe_name = os.path.basename(file.filename)
            if not _is_image_file(safe_name):
                raise HTTPException(status_code=400, detail="仅支持图片格式")

            picture_dir = _ensure_picture_dir(create_if_missing=True)
            target_path = os.path.join(picture_dir, safe_name)
            if not os.path.exists(target_path):
                try:
                    with open(target_path, "wb") as target:
                        shutil.copyfileobj(file.file, target)
                except Exception as exc:
                    raise HTTPException(status_code=500, detail=f"上传失败: {str(exc)}") from exc
                finally:
                    await file.close()
            else:
                await file.close()

            return {"filename": safe_name}


api = NoticePicture()
app = api.app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=9003)
