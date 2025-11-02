"""
LiveKit Token Server

Simple Flask server to generate LiveKit access tokens for the frontend.
Run with: python token_server.py
"""
import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from livekit import api

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env in backend folder or parent
load_dotenv()
load_dotenv('.env')  # Try backend/.env
load_dotenv('../.env')  # Try project root .env

app = Flask(__name__)

# CORS configuration - restrict to frontend domain in production
# For development, allow localhost. For production, set FRONTEND_URL env var
frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
CORS(app, origins=[frontend_url, 'http://localhost:3000', 'http://127.0.0.1:3000'])


@app.route('/token', methods=['POST'])
def generate_token():
    """Generate a LiveKit access token for the frontend."""
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request body'}), 400
        
        # Input validation
        room = data.get('room', 'goggins-room')
        # Sanitize room name - alphanumeric, hyphens, underscores only
        if not isinstance(room, str) or not all(c.isalnum() or c in '-_' for c in room):
            return jsonify({'error': 'Invalid room name'}), 400
        if len(room) > 100:  # Prevent overly long room names
            return jsonify({'error': 'Room name too long'}), 400
        
        identity = data.get('identity')
        if identity:
            # Sanitize identity - alphanumeric, hyphens, underscores only
            if not isinstance(identity, str) or not all(c.isalnum() or c in '-_' for c in identity):
                return jsonify({'error': 'Invalid identity'}), 400
            if len(identity) > 100:
                return jsonify({'error': 'Identity too long'}), 400
        else:
            # Generate random identity if not provided
            identity = 'user-' + os.urandom(8).hex()
        
        # Get LiveKit credentials from environment
        api_key = os.getenv('LIVEKIT_API_KEY')
        api_secret = os.getenv('LIVEKIT_API_SECRET')
        
        if not api_key or not api_secret:
            return jsonify({'error': 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set'}), 500
        
        # Generate token with room join permissions
        # Agent will be automatically dispatched when user joins (default behavior)
        # To use explicit dispatch, uncomment the with_room_config section below
        token_builder = api.AccessToken(api_key, api_secret) \
            .with_identity(identity) \
            .with_name(identity) \
            .with_grants(api.VideoGrants(
                room_join=True,
                room=room,
                can_publish=True,
                can_subscribe=True,
            ))
        
        # Optional: Explicit agent dispatch (uncomment if your agent has agent_name set)
        # agent_name = os.getenv('LIVEKIT_AGENT_NAME', 'goggins-agent')  # Default agent name
        # token_builder = token_builder.with_room_config(
        #     api.RoomConfiguration(
        #         agents=[
        #             api.RoomAgentDispatch(
        #                 agent_name=agent_name,
        #                 metadata=''
        #             )
        #         ]
        #     )
        # )
        
        token = token_builder.to_jwt()
        
        return jsonify({'token': token})
    
    except ValueError as e:
        # Handle validation errors
        return jsonify({'error': 'Invalid input'}), 400
    except Exception as e:
        # Log error but don't expose details to client
        logger.error(f"Token generation error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Security: Only enable debug mode explicitly via environment variable
    if debug_mode:
        logger.warning("⚠️  Debug mode is enabled - do not use in production!")
    
    print(f'🚀 Token server running on http://localhost:{port}')
    print(f'📡 Endpoint: POST http://localhost:{port}/token')
    print(f'🔒 Debug mode: {debug_mode}')
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode)

