import os

from RealmDB import RealmsDB

# Initialize the DB with a project-specific credential
db_root = RealmsDB("udhbha_registry")

# Helpers to access collections
def get_users_collection():
    return db_root.auth.users

def get_submissions_collection():
    return db_root.registry.submissions

def get_auditor_submissions_collection():
    return db_root.auditor.submissions

def get_audit_reports_collection():
    return db_root.auditor.reports

def get_registrar_records_collection():
    return db_root.registrar.records

def get_transparency_bundles_collection():
    return db_root.public.transparency

def to_dict(data):
    """Recursively convert RealmDB jmap objects to standard Python dicts/lists."""
    if hasattr(data, 'toJson'):
        return to_dict(data.toJson())
    if isinstance(data, list):
        return [to_dict(item) for item in data]
    if isinstance(data, dict):
        return {k: to_dict(v) for k, v in data.items()}
    return data
