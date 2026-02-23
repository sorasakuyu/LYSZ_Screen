import os
import shutil
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

import psycopg2
from fastapi import FastAPI, HTTPException, UploadFile, File, Body, Form
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

VIDEO_ROOT = os.getenv("VIDEO_ROOT", r"/media/zhngjah/Data/lysz/BigScreen/Data/Video")
VIDEO_PUBLIC_BASE = os.getenv("VIDEO_PUBLIC_BASE", "http://localhost/video/")
VIDEO_THUMB_SUBDIR = os.getenv("VIDEO_THUMB_SUBDIR", "thumbs")
VIDEO_PREVIEW_TIME = float(os.getenv("VIDEO_PREVIEW_TIME", "1"))
VIDEO_PREVIEW_EXT = os.getenv("VIDEO_PREVIEW_EXT", ".jpg")
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


def _build_public_url(filename: str) -> str:
	base = VIDEO_PUBLIC_BASE
	if not base.endswith("/"):
		base += "/"
	rel_path = str(filename).replace("\\", "/").lstrip("/")
	return f"{base}{rel_path}"


def _thumb_dir() -> str:
	return os.path.join(VIDEO_ROOT, VIDEO_THUMB_SUBDIR)


def _ensure_thumb_dir(create_if_missing: bool = False) -> str:
	path = _thumb_dir()
	if os.path.isdir(path):
		return path
	if create_if_missing:
		os.makedirs(path, exist_ok=True)
		return path
	raise HTTPException(status_code=500, detail=f"预览图目录不存在: {path}")


def _preview_filename(video_filename: str) -> str:
	stem, _ = os.path.splitext(os.path.basename(video_filename))
	return f"{stem}{VIDEO_PREVIEW_EXT}"


def _generate_preview(video_path: str, preview_path: str) -> None:
	try:
		try:
			from moviepy import VideoFileClip
		except Exception:
			from moviepy.editor import VideoFileClip
	except Exception as exc:
		raise HTTPException(status_code=500, detail=f"moviepy 导入失败: {exc}") from exc

	with VideoFileClip(video_path) as clip:
		duration = getattr(clip, "duration", None) or 0
		frame_time = VIDEO_PREVIEW_TIME
		if duration > 0:
			frame_time = min(frame_time, max(0.0, duration - 0.1))
		clip.save_frame(preview_path, t=frame_time)

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
			allow_methods=["GET", "POST", "PUT", "OPTIONS"],
			allow_headers=["*"],
		)

	def ensure_table(self, db) -> None:
		create_sql = """
		CREATE TABLE IF NOT EXISTS video (
			url TEXT NOT NULL,
			device TEXT NOT NULL DEFAULT 'default'
		);
		"""
		drop_pk_sql = """
		ALTER TABLE video
		DROP CONSTRAINT IF EXISTS video_pkey
		"""
		add_unique_sql = """
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1
				FROM pg_constraint
				WHERE conname = 'video_device_url_key'
			) THEN
				ALTER TABLE video
				ADD CONSTRAINT video_device_url_key UNIQUE (device, url);
			END IF;
		END $$;
		"""
		alter_device_sql = """
		ALTER TABLE video
		ADD COLUMN IF NOT EXISTS device TEXT NOT NULL DEFAULT 'default'
		"""
		drop_is_file_sql = """
		ALTER TABLE video
		DROP COLUMN IF EXISTS is_file
		"""
		with db.cursor() as cur:
			cur.execute(create_sql)
			cur.execute(alter_device_sql)
			cur.execute(drop_pk_sql)
			cur.execute(drop_is_file_sql)
			cur.execute(add_unique_sql)

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
		return None

	def _register_routes(self) -> None:
		app = self.app
		get_db = self.get_db

		class VideoUrlUpdate(BaseModel):
			device: str
			filename: str

		@app.get("/")
		def get_video(device: str = "default") -> Dict[str, Optional[str]]:
			try:
				db = get_db()
				with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
					cur.execute(
						"""
						SELECT url
						FROM video
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

		@app.put("/", summary="修改视频URL", response_description="返回修改后的URL")
		def update_video_url(payload: VideoUrlUpdate) -> Dict[str, str]:
			"""
			修改视频URL（只需传入文件名）
			返回格式: {"url": "http://localhost/Video/filename.mp4"}
			"""
			if not payload.filename or not payload.filename.strip():
				raise HTTPException(status_code=400, detail="文件名不能为空")

			safe_name = os.path.basename(payload.filename.strip())
			if not safe_name:
				raise HTTPException(status_code=400, detail="文件名不能为空")

			full_url = _build_public_url(safe_name)
			try:
				db = get_db()
				with db.cursor() as cur:
					cur.execute(
						"""
						DELETE FROM video
						WHERE device = %s
						""",
						(payload.device,),
					)
					cur.execute(
						"""
						INSERT INTO video (url, device)
						VALUES (%s, %s)
						""",
						(full_url, payload.device),
					)
				return {"url": full_url}
			except Exception as e:
				raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")

		@app.get("/files", summary="获取视频列表", response_description="返回视频列表")
		def list_videos() -> Dict[str, List[Dict[str, str]]]:
			"""
			获取视频目录下所有视频的文件名、预览图和视频链接
			返回格式: {"items": [{"filename": "a.mp4", "url": "http://localhost/Video/a.mp4", "preview": "http://localhost/Video/a.jpg"}]}
			"""
			video_dir = _ensure_video_dir()
			thumb_dir = _ensure_thumb_dir(create_if_missing=True)
			items: List[Dict[str, str]] = []
			for filename in sorted(os.listdir(video_dir)):
				if not _is_video_file(filename):
					continue
				file_path = os.path.join(video_dir, filename)
				if not os.path.isfile(file_path):
					continue
				preview_name = _preview_filename(filename)
				preview_path = os.path.join(thumb_dir, preview_name)
				if not os.path.isfile(preview_path):
					_generate_preview(file_path, preview_path)
				items.append(
					{
						"filename": filename,
						"url": _build_public_url(filename),
						"preview": _build_public_url(f"{VIDEO_THUMB_SUBDIR}/{preview_name}") if preview_name else "",
					}
				)
			return {"items": items}

		@app.post("/upload", summary="上传视频到视频目录", response_description="返回上传后的文件名")
		async def upload_video(
			device: str = Form(..., description="视频归属标识"),
			file: UploadFile = File(..., description="上传的视频文件"),
		) -> Dict[str, str]:
			"""
			上传视频到视频目录
			返回格式: {"filename": "上传后的文件名"}
			"""
			if not file.filename:
				raise HTTPException(status_code=400, detail="文件名不能为空")

			safe_name = os.path.basename(file.filename)
			if not _is_video_file(safe_name):  # ← 改这里：_is_image_file → _is_video_file
				raise HTTPException(status_code=400, detail="仅支持视频格式")  # ← 改这里：图片 → 视频

			video_dir = _ensure_video_dir(create_if_missing=True)
			target_path = os.path.join(video_dir, safe_name)
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

api = VideoService()
app = api.app


if __name__ == "__main__":
	import uvicorn

	uvicorn.run(app, host="0.0.0.0", port=9003)
