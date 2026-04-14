"""
Phase 5.5: Server-Sent Events for cross-role status notifications.
Surveyors get notified when auditors return/approve submissions.
Auditors get notified when new submissions arrive.
"""

import json
import time
from datetime import datetime
from flask import Blueprint, Response, stream_with_context, jsonify, g
from middleware.auth import require_auth
from repositories.submission_repo import SubmissionRepo

events_bp = Blueprint('events', __name__)

# In-memory event queue (in production, use Redis pub/sub)
_event_store: list[dict] = []


def publish_event(event_type: str, submission_id: str, target_email: str,
                  message: str, new_status: str = None):
    """Publish a notification event to the in-memory store."""
    _event_store.append({
        'id': len(_event_store) + 1,
        'type': event_type,
        'submission_id': submission_id,
        'target_email': target_email,
        'message': message,
        'new_status': new_status,
        'created_at': datetime.utcnow().isoformat(),
    })

    # Cap store at 1000 events
    if len(_event_store) > 1000:
        _event_store[:] = _event_store[-500:]


@events_bp.route('/stream', methods=['GET'])
@require_auth
def event_stream():
    """SSE endpoint — clients connect and receive real-time notifications."""
    user_email = g.current_user.get('email')

    def generate():
        last_id = len(_event_store)
        while True:
            # Check for new events since last check
            new_events = [
                e for e in _event_store[last_id:]
                if e['target_email'] == user_email or e['target_email'] == '*'
            ]

            for event in new_events:
                data = json.dumps({
                    'type': event['type'],
                    'submission_id': event['submission_id'],
                    'message': event['message'],
                    'new_status': event.get('new_status'),
                    'created_at': event['created_at'],
                })
                yield f"id: {event['id']}\nevent: {event['type']}\ndata: {data}\n\n"

            last_id = len(_event_store)

            # Heartbeat every 15 seconds to keep connection alive
            yield f": heartbeat {datetime.utcnow().isoformat()}\n\n"
            time.sleep(5)

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',  # Disable nginx buffering
        }
    )


@events_bp.route('/recent', methods=['GET'])
@require_auth
def get_recent_events():
    """Fetch recent events for the current user (fallback for non-SSE clients)."""
    user_email = g.current_user.get('email')
    user_events = [
        e for e in _event_store[-50:]
        if e['target_email'] == user_email or e['target_email'] == '*'
    ]
    return jsonify({'events': user_events}), 200
