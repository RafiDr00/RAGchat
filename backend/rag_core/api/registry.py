import sqlite3
import json
import os
from typing import Optional, Dict
from loguru import logger
from config import settings

class TaskRegistry:
    """
    Persistent SQLite-based registry for background ingestion tasks.
    replaces volatile in-memory storage for industrial reliability.
    """
    
    def __init__(self):
        self.db_path = os.path.join(settings.QDRANT_PATH, "tasks.db")
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ingestion_tasks (
                    task_id TEXT PRIMARY KEY,
                    status TEXT,
                    progress INTEGER,
                    meta TEXT
                )
            """)
        logger.info(f"TaskRegistry: Persistence active at {self.db_path}")

    def register(self, task_id: str, status: str = "queued", progress: int = 0, meta: dict = None):
        meta_json = json.dumps(meta or {})
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO ingestion_tasks (task_id, status, progress, meta) VALUES (?, ?, ?, ?)",
                (task_id, status, progress, meta_json)
            )

    def update(self, task_id: str, status: str = None, progress: int = None):
        updates = []
        params = []
        if status:
            updates.append("status = ?")
            params.append(status)
        if progress is not None:
            updates.append("progress = ?")
            params.append(progress)
        
        if not updates:
            return
            
        params.append(task_id)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(f"UPDATE ingestion_tasks SET {', '.join(updates)} WHERE task_id = ?", params)

    def get(self, task_id: str) -> Optional[Dict]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM ingestion_tasks WHERE task_id = ?", (task_id,))
            row = cursor.fetchone()
            if row:
                data = dict(row)
                data['meta'] = json.loads(data['meta'])
                return data
        return None

    def clear(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM ingestion_tasks")
