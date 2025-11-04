import os
import logging
import asyncio
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from livekit import api

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)

# Fixed CORS configuration to allow your frontend
CORS(app, resources={
    r"/*": {
        "origins": "*",  # Allow all origins, or specify ["https://bluejay-livekit.vercel.app"] for security
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

async def dispatch_agent(livekit_url, api_key, api_secret, room_name, agent_name, identity):
    """Explicitly dispatch the agent via API to ensure it wakes up"""
    try:
        lkapi = api.LiveKitAPI(url=livekit_url, api_key=api_key, api_secret=api_secret)
        dispatch = await lkapi.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name=agent_name,
                room=room_name,
                metadata='{"user_id": "' + identity + '"}'
            )
        )
        logger.info(f"Agent dispatch created: {dispatch}")
        await lkapi.aclose()
        return True
    except Exception as e:
        logger.error(f"Failed to dispatch agent via API: {e}")
        # Don't fail the token generation if dispatch fails - token-based dispatch should still work
        return False

@app.route('/token', methods=['POST'])
def generate_token():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request body'}), 400
        
        room = data.get('room', 'goggins-room')
        # Allow alphanumeric, hyphens, underscores, and dots (for timestamp-based room names)
        if not isinstance(room, str) or not all(c.isalnum() or c in '-_.' for c in room):
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
        livekit_url = os.getenv('LIVEKIT_URL')
        if not api_key or not api_secret:
            return jsonify({'error': 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set'}), 500
        
        # Token generation with explicit agent dispatch in token
        # This ensures the agent connects immediately when the user joins
        # Based on LiveKit docs: https://docs.livekit.io/home/get-started/authentication/#creating-a-token-with-room-configuration
        token = api.AccessToken(api_key, api_secret) \
            .with_identity(identity) \
            .with_name(identity) \
            .with_grants(api.VideoGrants(
                room_join=True,
                room=room,
            )) \
            .with_room_config(
                api.RoomConfiguration(
                    agents=[
                        api.RoomAgentDispatch(
                            agent_name="goggins-agent",  # Must match agent_name in WorkerOptions
                            metadata='{"user_id": "' + identity + '"}'
                        )
                    ],
                ),
            ).to_jwt()
        
        # Also explicitly dispatch via API to ensure agent wakes up (backup mechanism)
        # This is especially important when agent is sleeping (scaled to zero)
        # According to LiveKit docs: https://docs.livekit.io/agents/worker/agent-dispatch/#via-api
        if livekit_url:
            try:
                # Run async dispatch - this will wake up the agent if it's sleeping
                asyncio.run(dispatch_agent(livekit_url, api_key, api_secret, room, "goggins-agent", identity))
                logger.info(f"Agent dispatch triggered for room: {room}")
            except Exception as e:
                logger.warning(f"Could not dispatch agent via API (non-blocking): {e}")
                # Continue anyway - token-based dispatch should still work
        else:
            logger.warning("LIVEKIT_URL not set - skipping explicit API dispatch")
        
        return jsonify({'token': token})
    except ValueError:
        return jsonify({'error': 'Invalid input'}), 400
    except Exception as e:
        logger.error(f"Token generation error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

application = app

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)