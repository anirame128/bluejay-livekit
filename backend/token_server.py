import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from livekit import api

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
CORS(app, origins=[frontend_url, 'http://localhost:3000', 'http://127.0.0.1:3000'])


@app.route('/token', methods=['POST'])
def generate_token():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request body'}), 400
        
        room = data.get('room', 'goggins-room')
        if not isinstance(room, str) or not all(c.isalnum() or c in '-_' for c in room):
            return jsonify({'error': 'Invalid room name'}), 400
        if len(room) > 100:
            return jsonify({'error': 'Room name too long'}), 400
        
        identity = data.get('identity')
        if identity:
            if not isinstance(identity, str) or not all(c.isalnum() or c in '-_' for c in identity):
                return jsonify({'error': 'Invalid identity'}), 400
            if len(identity) > 100:
                return jsonify({'error': 'Identity too long'}), 400
        else:
            identity = 'user-' + os.urandom(8).hex()
        
        api_key = os.getenv('LIVEKIT_API_KEY')
        api_secret = os.getenv('LIVEKIT_API_SECRET')
        
        if not api_key or not api_secret:
            return jsonify({'error': 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set'}), 500
        
        token_builder = api.AccessToken(api_key, api_secret) \
            .with_identity(identity) \
            .with_name(identity) \
            .with_grants(api.VideoGrants(
                room_join=True,
                room=room,
                can_publish=True,
                can_subscribe=True,
            ))
        
        token = token_builder.to_jwt()
        return jsonify({'token': token})
    
    except ValueError:
        return jsonify({'error': 'Invalid input'}), 400
    except Exception as e:
        logger.error(f"Token generation error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)

