import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import psycopg2
from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from psycopg2 import extras
from pydantic import BaseModel

DB_CONFIG = {
	"host": os.getenv("PG_HOST", "localhost"),
	"user": os.getenv("PG_USER", "postgres"),
	"password": os.getenv("PG_PASSWORD", "xx090202"),
	"dbname": os.getenv("PG_DATABASE", "kaguya2"),
	"port": int(os.getenv("PG_PORT", "5432")),
}


class DeviceCreate(BaseModel):
	device_id: str
	remark: Optional[str] = ""


class DeviceRemark(BaseModel):
	remark: str


class DeviceService:
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
			allow_methods=["GET", "OPTIONS", "PUT", "POST", "DELETE"],
			allow_headers=["*"],
		)

	def ensure_table(self, db) -> None:
		create_sql = """
		CREATE TABLE IF NOT EXISTS device_list (
			device_id TEXT PRIMARY KEY,
			remark TEXT NOT NULL DEFAULT ''
		);
		"""
		with db.cursor() as cur:
			cur.execute(create_sql)

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

	def _register_routes(self) -> None:
		app = self.app
		get_db = self.get_db

		@app.get("/")
		def list_devices() -> List[Dict[str, str]]:
			"""获取设备列表"""
			try:
				db = get_db()
				with db.cursor(cursor_factory=extras.RealDictCursor) as cur:
					cur.execute(
						"SELECT device_id, remark FROM device_list ORDER BY device_id ASC"
					)
					rows = cur.fetchall()
					return [{"device_id": r["device_id"], "remark": r["remark"]} for r in rows]
			except Exception as e:
				raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")

		@app.post("/update")
		def create_device(payload: DeviceCreate) -> Dict[str, Any]:
			"""新增设备"""
			if not payload.device_id:
				raise HTTPException(status_code=400, detail="device_id 不能为空")
			try:
				db = get_db()
				with db.cursor() as cur:
					cur.execute(
						"""
						INSERT INTO device_list (device_id, remark)
						VALUES (%s, %s)
						ON CONFLICT (device_id) DO NOTHING
						RETURNING device_id, remark
						""",
						(payload.device_id, payload.remark or ""),
					)
					row = cur.fetchone()
					if row is None:
						raise HTTPException(status_code=409, detail="设备已存在")
					return {
						"success": True,
						"data": {"device_id": row[0], "remark": row[1]},
					}
			except HTTPException:
				raise
			except Exception as e:
				raise HTTPException(status_code=500, detail=f"新增失败: {str(e)}")

		@app.delete("/delete/{device_id}")
		def delete_device(device_id: str) -> Dict[str, Any]:
			"""删除设备"""
			if not device_id:
				raise HTTPException(status_code=400, detail="device_id 不能为空")
			try:
				db = get_db()
				with db.cursor() as cur:
					cur.execute(
						"DELETE FROM device_list WHERE device_id = %s RETURNING device_id",
						(device_id,),
					)
					row = cur.fetchone()
					if row is None:
						raise HTTPException(status_code=404, detail="设备不存在")
					return {"success": True, "message": "删除成功"}
			except HTTPException:
				raise
			except Exception as e:
				raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")

		@app.put("/remark/{device_id}")
		def update_remark(device_id: str, payload: DeviceRemark) -> Dict[str, Any]:
			"""修改设备备注"""
			if not device_id:
				raise HTTPException(status_code=400, detail="device_id 不能为空")
			try:
				db = get_db()
				with db.cursor() as cur:
					cur.execute(
						"""
						UPDATE device_list
						SET remark = %s
						WHERE device_id = %s
						RETURNING device_id, remark
						""",
						(payload.remark, device_id),
					)
					row = cur.fetchone()
					if row is None:
						raise HTTPException(status_code=404, detail="设备不存在")
					return {
						"success": True,
						"data": {"device_id": row[0], "remark": row[1]},
					}
			except HTTPException:
				raise
			except Exception as e:
				raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")

		@app.get("/check")
		def check_device(device: str = Query("", min_length=1)) -> Dict[str, Any]:
			"""检查设备是否存在"""
			if not device:
				raise HTTPException(status_code=400, detail="device 不能为空")
			try:
				db = get_db()
				with db.cursor() as cur:
					cur.execute(
						"SELECT 1 FROM device_list WHERE device_id = %s LIMIT 1",
						(device,),
					)
					exists = cur.fetchone() is not None
					return {"exists": exists}
			except Exception as e:
				raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")


api = DeviceService()
app = api.app


if __name__ == "__main__":
	import uvicorn

	uvicorn.run(app, host="0.0.0.0", port=9003)
