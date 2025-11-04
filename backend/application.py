import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from livekit import api

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

logger.info("Starting Flask application...")
logger.info(f"PORT environment variable: {os.getenv('PORT', '8080')}")
logger.info(f"LIVEKIT_API_KEY present: {bool(os.getenv('LIVEKIT_API_KEY'))}")
logger.info(f"LIVEKIT_API_SECRET present: {bool(os.getenv('LIVEKIT_API_SECRET'))}")

app = Flask(__name__)

CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

def _validate_room_name(room: str) -> tuple[bool, str]:
    """Validate room name format and length."""
    if not isinstance(room, str) or not all(c.isalnum() or c in '-_.' for c in room):
        return False, 'Invalid room name'
    if len(room) > 100:
        return False, 'Room name too long'
    return True, ''


def _validate_identity(identity: str) -> tuple[bool, str]:
    """Validate identity format and length."""
    if not isinstance(identity, str) or not all(c.isalnum() or c in '-_' for c in identity):
        return False, 'Invalid identity'
    if len(identity) > 100:
        return False, 'Identity too long'
    return True, ''


@app.route('/token', methods=['POST'])
def generate_token():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request body'}), 400
        
        room = data.get('room', 'goggins-room')
        valid, error_msg = _validate_room_name(room)
        if not valid:
            return jsonify({'error': error_msg}), 400
        
        identity = data.get('identity')
        if identity:
            valid, error_msg = _validate_identity(identity)
            if not valid:
                return jsonify({'error': error_msg}), 400
        else:
            identity = 'user-' + os.urandom(8).hex()
        
        api_key = os.getenv('LIVEKIT_API_KEY')
        api_secret = os.getenv('LIVEKIT_API_SECRET')
        livekit_url = os.getenv('LIVEKIT_URL')
        
        if not api_key or not api_secret:
            return jsonify({'error': 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set'}), 500
        
        token = api.AccessToken(api_key, api_secret) \
            .with_identity(identity) \
            .with_name(identity) \
            .with_grants(api.VideoGrants(
                room_join=True,
                room=room,
                can_update_own_metadata=True,
            )) \
            .with_room_config(
                api.RoomConfiguration(
                    agents=[
                        api.RoomAgentDispatch(
                            agent_name="goggins-agent",
                            metadata=f'{{"user_id": "{identity}"}}'
                        )
                    ],
                ),
            ).to_jwt()
        
        logger.info(f"Token generated for room: {room}, identity: {identity}")
        
        response = {
            'participant_token': token,
        }
        if livekit_url:
            response['server_url'] = livekit_url
        
        return jsonify(response)
    except Exception as e:
        logger.error(f"Token generation error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
@app.route('/', methods=['GET'])
def health():
    """Health check endpoint for AWS App Runner."""
    return 'ok', 200

application = app

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug_mode, threaded=True)