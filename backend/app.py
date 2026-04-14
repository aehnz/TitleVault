"""
UDHBHA Property Registry — Backend API Server
Phase 2: App Factory Pattern with SQLAlchemy, Blueprint routing, and layered architecture.
"""

import os
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from config import Config

# Create migrate instance (initialized with app in factory)
migrate = Migrate()


def create_app(config_class=Config):
    """Application factory — creates and configures the Flask app."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # --- CORS ---
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],
            "allow_headers": ["Content-Type", "Authorization"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "supports_credentials": True
        }
    })

    # --- Database ---
    from models import db
    db.init_app(app)
    migrate.init_app(app, db)

    # --- Register Blueprints ---
    from routes.auth import auth_bp
    from routes.submissions import submissions_bp
    from routes.audit import audit_bp
    from routes.registrar import registrar_bp
    from routes.blockchain import blockchain_bp
    from routes.public import public_bp
    from routes.documents import documents_bp
    from routes.events import events_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(submissions_bp, url_prefix='/api/submissions')
    app.register_blueprint(audit_bp, url_prefix='/api/audit-reports')
    app.register_blueprint(registrar_bp, url_prefix='/api/registrar')
    app.register_blueprint(blockchain_bp, url_prefix='/api/blockchain')
    app.register_blueprint(public_bp, url_prefix='/api/public')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(events_bp, url_prefix='/api/events')

    # --- Legacy compatibility routes ---
    # These map old URL patterns to the new blueprint structure
    # so the existing frontend doesn't break during the transition
    _register_compat_routes(app)

    # Create tables if they don't exist (dev convenience — use migrations in prod)
    with app.app_context():
        db.create_all()

    return app


def _register_compat_routes(app):
    """
    Register backward-compatible routes that map old URL patterns
    to the new blueprint structure. This lets the existing frontends
    work without changes during the Phase 2 transition.
    """
    from flask import request, redirect

    # Old: GET /api/registrar-records → New: GET /api/registrar/records
    @app.route('/api/registrar-records', methods=['GET', 'POST'])
    def compat_registrar_records():
        if request.method == 'GET':
            return redirect('/api/registrar/records', code=307)
        return redirect('/api/registrar/records', code=307)

    @app.route('/api/registrar-records/<submission_id>', methods=['GET'])
    def compat_registrar_record(submission_id):
        return redirect(f'/api/registrar/records/{submission_id}', code=307)

    # Old: GET/POST /api/transparency-bundles → New: /api/registrar/transparency-bundles
    @app.route('/api/transparency-bundles', methods=['GET', 'POST'])
    def compat_transparency_bundles():
        if request.method == 'GET':
            return redirect('/api/registrar/transparency-bundles', code=307)
        return redirect('/api/registrar/transparency-bundles', code=307)

    @app.route('/api/transparency-bundles/<submission_id>', methods=['GET'])
    def compat_transparency_bundle(submission_id):
        return redirect(f'/api/registrar/transparency-bundles/{submission_id}', code=307)


# --- Entry Point ---
if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=app.config['DEBUG'], port=port)
