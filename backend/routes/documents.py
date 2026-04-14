"""
Document upload and management routes.
Phase 7.3: Transition to Supabase Storage.
"""

import os
import uuid
import hashlib
from flask import Blueprint, request, jsonify, send_file, g, current_app, Response
from middleware.auth import require_auth
from supabase import create_client, Client

documents_bp = Blueprint('documents', __name__)

ALLOWED_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

def get_supabase_client() -> Client:
    """Initialize Supabase client from config."""
    url = current_app.config.get("SUPABASE_URL")
    key = current_app.config.get("SUPABASE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not configured in environment.")
    return create_client(url, key)

@documents_bp.route('/upload', methods=['POST'])
@require_auth
def upload_document():
    """Upload a document to Supabase Storage and return metadata with integrity hash."""
    file = request.files.get('file')
    if not file or not file.filename:
        return jsonify({'error': 'No file provided'}), 400

    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        return jsonify({
            'error': f'Invalid file type: {file.content_type}',
            'allowed': list(ALLOWED_TYPES),
        }), 400

    # Read file data
    file_data = file.read()

    # Validate size
    if len(file_data) > MAX_FILE_SIZE:
        return jsonify({
            'error': f'File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB',
        }), 400

    # Generate doc ID and compute hash
    doc_id = f"doc_{uuid.uuid4().hex[:16]}"
    _, ext = os.path.splitext(file.filename)
    storage_filename = f"{doc_id}{ext}"
    
    file_hash = f"sha256:{hashlib.sha256(file_data).hexdigest()}"

    try:
        supabase = get_supabase_client()
        # Upload to 'documents' bucket
        supabase.storage.from_("documents").upload(
            path=storage_filename,
            file=file_data,
            file_options={"content-type": file.content_type}
        )
    except Exception as e:
        return jsonify({'error': f'Failed to upload to Supabase: {str(e)}'}), 500

    return jsonify({
        'doc_id': doc_id,
        'name': file.filename,
        'type': file.content_type,
        'size': len(file_data),
        'hash': file_hash,
        'uploaded_by': g.current_user['email'],
        'storage': {
            'provider': 'SUPABASE',
            'ref': storage_filename,
        },
    }), 201


@documents_bp.route('/<doc_id>', methods=['GET'])
@require_auth
def download_document(doc_id):
    """Download a document from Supabase Storage."""
    try:
        supabase = get_supabase_client()
        # We don't guarantee knowing the exact extension (so we could list files matching prefix)
        # However, listing files is costly. Alternatively, our frontend could pass the full storage ref.
        # But assuming the user wants to fetch by just doc_id, we can list the directory contents:
        files = supabase.storage.from_("documents").list()
        
        target_file = None
        for file in files:
            if file.get('name', '').startswith(doc_id):
                target_file = file['name']
                break
                
        if not target_file:
            return jsonify({'error': 'Document not found'}), 404

        # Download bytes
        response = supabase.storage.from_("documents").download(target_file)
        
        return Response(
            response,
            mimetype="application/octet-stream",
            headers={"Content-Disposition": f"attachment;filename={target_file}"}
        )
        
    except Exception as e:
        return jsonify({'error': f'Failed to download from Supabase: {str(e)}'}), 500


@documents_bp.route('/<doc_id>/verify', methods=['POST'])
@require_auth
def verify_document(doc_id):
    """Verify document integrity by comparing stored hash after pulling from Supabase."""
    expected_hash = request.json.get('hash')
    if not expected_hash:
        return jsonify({'error': 'Expected hash not provided'}), 400

    try:
        supabase = get_supabase_client()
        files = supabase.storage.from_("documents").list()
        
        target_file = None
        for file in files:
            if file.get('name', '').startswith(doc_id):
                target_file = file['name']
                break
                
        if not target_file:
            return jsonify({'error': 'Document not found'}), 404

        # Re-download and verify
        file_data = supabase.storage.from_("documents").download(target_file)
        actual_hash = f"sha256:{hashlib.sha256(file_data).hexdigest()}"

        match = actual_hash == expected_hash
        return jsonify({
            'doc_id': doc_id,
            'expected': expected_hash,
            'actual': actual_hash,
            'verified': match,
        })
    except Exception as e:
        return jsonify({'error': f'Verification failed: {str(e)}'}), 500
