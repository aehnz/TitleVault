"""
RealmDB — Lightweight File-Based JSON Database
Drop-in replacement for the original RealmDB dependency.
Provides the same API surface (insert, find, update, delete)
backed by local JSON files for persistence.

This is a BRIDGE solution — Phase 2 will replace this with SQLAlchemy/PostgreSQL.
"""

import json
import os
import uuid
from pathlib import Path
from threading import Lock


class Collection:
    """A single JSON-backed collection (equivalent to a table)."""

    def __init__(self, filepath: str):
        self._filepath = filepath
        self._lock = Lock()
        self._ensure_file()

    def _ensure_file(self):
        """Create the JSON file if it doesn't exist."""
        os.makedirs(os.path.dirname(self._filepath), exist_ok=True)
        if not os.path.exists(self._filepath):
            with open(self._filepath, 'w') as f:
                json.dump([], f)

    def _read(self) -> list:
        """Read all records from the file."""
        try:
            with open(self._filepath, 'r') as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def _write(self, data: list):
        """Write all records to the file."""
        with open(self._filepath, 'w') as f:
            json.dump(data, f, indent=2, default=str)

    def insert(self, record: dict) -> str:
        """Insert a new record. Returns the generated _id."""
        with self._lock:
            data = self._read()
            record_id = str(uuid.uuid4().hex[:16])
            record['_id'] = record_id
            data.append(record)
            self._write(data)
            return record_id

    def find(self, query: dict = None) -> list:
        """
        Find records matching the query.
        If query is None or empty, returns all records.
        Query is a simple key-value match (AND logic).
        """
        data = self._read()
        
        if not query:
            return data

        results = []
        for record in data:
            match = True
            for key, value in query.items():
                if record.get(key) != value:
                    match = False
                    break
            if match:
                results.append(record)
        return results

    def update(self, record_id: str, new_data: dict) -> bool:
        """Update a record by its _id. Returns True if updated."""
        with self._lock:
            data = self._read()
            for i, record in enumerate(data):
                if record.get('_id') == record_id:
                    new_data['_id'] = record_id  # Preserve _id
                    data[i] = new_data
                    self._write(data)
                    return True
            return False

    def delete(self, record_id: str) -> bool:
        """Delete a record by its _id. Returns True if deleted."""
        with self._lock:
            data = self._read()
            original_len = len(data)
            data = [r for r in data if r.get('_id') != record_id]
            if len(data) < original_len:
                self._write(data)
                return True
            return False

    def count(self) -> int:
        """Return the number of records."""
        return len(self._read())


class Namespace:
    """
    Dynamic namespace that creates Collections on attribute access.
    Supports nested access like: db.auth.users → Collection at data/auth/users.json
    """

    def __init__(self, base_path: str):
        self._base_path = base_path
        self._collections = {}

    def __getattr__(self, name: str):
        if name.startswith('_'):
            return super().__getattribute__(name)

        if name not in self._collections:
            # Create a sub-namespace that resolves to a collection
            sub_path = os.path.join(self._base_path, name)
            ns = _NamespaceOrCollection(sub_path)
            self._collections[name] = ns
        return self._collections[name]


class _NamespaceOrCollection:
    """
    Lazy resolver: first attribute access creates a Collection,
    allowing db.auth.users to create data/auth/users.json.
    """

    def __init__(self, base_path: str):
        self._base_path = base_path
        self._children = {}

    def __getattr__(self, name: str):
        if name.startswith('_'):
            return super().__getattribute__(name)

        if name not in self._children:
            filepath = os.path.join(self._base_path, f"{name}.json")
            self._children[name] = Collection(filepath)
        return self._children[name]


class RealmsDB:
    """
    Main database class. Creates a data directory and provides
    namespace-based collection access.
    
    Usage:
        db = RealmsDB("my_project")
        db.auth.users.insert({"email": "a@b.com"})
        users = db.auth.users.find({"email": "a@b.com"})
    """

    def __init__(self, project_name: str, data_dir: str = None):
        if data_dir is None:
            # Store data relative to this file's directory
            data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', project_name)
        
        self._data_dir = data_dir
        os.makedirs(self._data_dir, exist_ok=True)

    def __getattr__(self, name: str):
        if name.startswith('_'):
            return super().__getattribute__(name)
        return _NamespaceOrCollection(os.path.join(self._data_dir, name))
