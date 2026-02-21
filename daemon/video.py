import os
import shutil
from contextlib import asynccontextmanager
from typing import Dict, Any, List

import psycopg2
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from psycopg2 import extras

DB_CONFIG = {
	"host": os.getenv("PG_HOST", "localhost"),
	"user": os.getenv("PG_USER", "kaguya"),
	"password": os.getenv("PG_PASSWORD", "Mb7cp5MLTPKNWy4y"),
	"dbname": os.getenv("PG_DATABASE", "kaguya"),
	"port": int(os.getenv("PG_PORT", "5432")),
}

VIDEO_ROOT = os.getenv("VIDEO_ROOT", r"E:\Desktop\openlist\Video")
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm", ".m4v"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}


def _ensure_video_dir(create_if_missing: bool = False) -> str:
	if os.path.isdir(VIDEO_ROOT):
		return VIDEO_ROOT
	if create_if_missing:
		os.makedirs(VIDEO_ROOT, exist_ok=True)
		return VIDEO_ROOT
	raise HTTPException(status_code=500, detail=f"视频目录不存在: {VIDEO_ROOT}")


def _is_video_file(filename: str) -> bool:
	_, ext = os.path.splitext(filename)
	return ext.lower() in ALLOWED_VIDEO_EXTENSIONS


def _is_image_file(filename: str) -> bool:
	_, ext = os.path.splitext(filename)
	return ext.lower() in ALLOWED_IMAGE_EXTENSIONS

class VideoService:
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
			allow_methods=["GET", "POST", "OPTIONS"],
			allow_headers=["*"],
		)

	def ensure_table(self, db) -> None:
		create_sql = """
		CREATE TABLE IF NOT EXISTS video (
			url TEXT NOT NULL
		);
		"""
		insert_default_sql = """
		INSERT INTO video (url)
		VALUES ('url')
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
		def get_video() -> Dict[str, str]:
			try:
				db = get_db()
				with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
					cur.execute("SELECT url FROM video ORDER BY url ASC")
					rows = cur.fetchall()
					return {"url": r["url"] for r in rows}
			except Exception as e:
				raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")

		@app.put("/", summary="修改视频URL", response_description="返回修改后的URL")
		def update_video_url(filename: str = Body(..., embed=True, description="视频文件名")) -> Dict[str, str]:
			"""
			修改视频URL（只需传入文件名）
			返回格式: {"url": "http://localhost/video/filename.mp4"}
			"""
			if not filename or not filename.strip():
				raise HTTPException(status_code=400, detail="文件名不能为空")

			safe_name = os.path.basename(filename.strip())
			if not safe_name:
				raise HTTPException(status_code=400, detail="文件名不能为空")

			full_url = f"http://localhost/video/{safe_name}"
			try:
				db = get_db()
				with db.cursor() as cur:
					cur.execute("DELETE FROM video")
					cur.execute("INSERT INTO video (url) VALUES (%s)", (full_url,))
				return {"url": full_url}
			except Exception as e:
				raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")

		@app.get("/files", summary="获取视频文件名", response_description="返回文件名列表")
		def list_videos() -> Dict[str, List[str]]:
			"""
			获取视频目录下所有视频的文件名
			返回格式: {"items": ["filename1.mp4", "filename2.mkv"]}
			"""
			video_dir = _ensure_video_dir()
			items: List[str] = []
			for filename in sorted(os.listdir(video_dir)):
				if not _is_video_file(filename):
					continue
				file_path = os.path.join(video_dir, filename)
				if not os.path.isfile(file_path):
					continue
				items.append(filename)
			return {"items": items}

		@app.post("/upload", summary="上传图片到视频目录", response_description="返回上传后的文件名")
		async def upload_image(file: UploadFile = File(..., description="上传的图片文件")) -> Dict[str, str]:
			"""
			上传图片到视频目录
			返回格式: {"filename": "上传后的文件名"}
			"""
			if not file.filename:
				raise HTTPException(status_code=400, detail="文件名不能为空")

			safe_name = os.path.basename(file.filename)
			if not _is_image_file(safe_name):
				raise HTTPException(status_code=400, detail="仅支持图片格式")

			video_dir = _ensure_video_dir(create_if_missing=True)
			target_path = os.path.join(video_dir, safe_name)
			if os.path.exists(target_path):
				raise HTTPException(status_code=409, detail="文件已存在")

			try:
				with open(target_path, "wb") as target:
					shutil.copyfileobj(file.file, target)
			except Exception as exc:
				raise HTTPException(status_code=500, detail=f"上传失败: {str(exc)}") from exc
			finally:
				await file.close()

			return {"filename": safe_name}

api = VideoService()
app = api.app


if __name__ == "__main__":
	import uvicorn

	uvicorn.run(app, host="0.0.0.0", port=9003)
