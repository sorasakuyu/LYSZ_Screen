import os
from contextlib import asynccontextmanager
from typing import Dict, Any, List

import psycopg2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from psycopg2 import extras

DB_CONFIG = {
	"host": os.getenv("PG_HOST", "localhost"),
	"user": os.getenv("PG_USER", "kaguya"),
	"password": os.getenv("PG_PASSWORD", "Mb7cp5MLTPKNWy4y"),
	"dbname": os.getenv("PG_DATABASE", "kaguya"),
	"port": int(os.getenv("PG_PORT", "5432")),
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
			allow_methods=["GET", "OPTIONS"],
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

		@app.get("/")           
		def get_config() -> Dict[str, str]:
			try:
				db = get_db()
				with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
					cur.execute("SELECT title, context FROM notice_text ORDER BY title ASC LIMIT 1")
					row = cur.fetchone()
					return {"title": row["title"], "context": row["context"]} if row else {}
			except Exception as e:
				raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")


api = NoticeText()
app = api.app


if __name__ == "__main__":
	import uvicorn

	uvicorn.run(app, host="0.0.0.0", port=9002)
