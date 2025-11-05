import os
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import Agent, JobContext, JobProcess, RoomInputOptions, RunContext, WorkerOptions
from livekit.agents.llm import function_tool
from livekit.plugins import cartesia, groq, noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from pinecone import Pinecone

load_dotenv(".env")


class GogginsRAG:
    def __init__(self, index_name: str = "book-rag-index", namespace: str = "book_content"):
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY not found")
        self.index = Pinecone(api_key=api_key).Index(index_name)
        self.namespace = namespace
    
    def query(self, query_text: str, top_k: int = 5) -> str:
        try:
            results = self.index.search(
                namespace=self.namespace,
                query={"top_k": top_k * 2, "inputs": {"text": query_text}},
                rerank={"model": "bge-reranker-v2-m3", "top_n": top_k, "rank_fields": ["content"]}
            )

            if not (hasattr(results, 'result') and hasattr(results.result, 'hits')):
                return "Error: Unexpected response structure from Pinecone."

            hits = results.result.hits

            if not hits:
                return "No relevant information found."

            top_hits = hits[:top_k]

            context_parts = []
            for hit in top_hits:
                fields = hit.get('fields', hit.get('metadata', {}))
                content = fields.get('content', '')
                page_num = fields.get('page_num', 'N/A')
                context_parts.append(f"[Page {page_num}]: {content}")

            return "\n\n".join(context_parts) if context_parts else "No highly relevant information found."
        except Exception as e:
            return "Error retrieving information."
    
    async def async_query(self, query_text: str, top_k: int = 5) -> str:
        return self.query(query_text, top_k)

try:
    rag = GogginsRAG()
except Exception as e:
    rag = None

class GogginsAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are David Goggins from "Can't Hurt Me."

Keep your responses SHORT and DIRECT. No fluff, no long explanations. Get to the point fast.

When relevant to the user's question, use the query_goggins_book tool to find relevant context from the book, then use that context in your answer.

When the user first asks about finding gyms or fitness locations, ask them what city they're in and use set_user_location to store it.

Speak in Goggins' direct, no-excuses voice. Be concise and punchy."""
        )
        # Per-session state for storing lightweight values like user location
        self.session_state = {}

    @function_tool
    async def query_goggins_book(self, context: RunContext, question: str):
        if rag is None:
            return "RAG unavailable. Using general knowledge."
        try:
            rag_result = await rag.async_query(question, top_k=5)
            return f"From 'Can't Hurt Me': {rag_result}"
        except Exception as e:
            return "Error retrieving book info."

    @function_tool
    async def set_user_location(self, context: RunContext, city: str, state: str = ""):
        """Set the user's location based on city and state they mention"""
        import googlemaps

        api_key = os.getenv("GOOGLE_PLACES_API_KEY")
        if not api_key:
            return "API key not configured"

        try:
            gmaps = googlemaps.Client(key=api_key)
            location_query = f"{city}, {state}" if state else city

            # Geocode the location
            geocode_result = gmaps.geocode(location_query)

            if geocode_result:
                location = geocode_result[0]['geometry']['location']
                lat_lng = f"{location['lat']},{location['lng']}"

                # Store in agent session state
                self.session_state["user_location"] = lat_lng
                self.session_state["user_city"] = city

                return f"Got it! Set your location to {city}. Ready to find gyms nearby!"
            else:
                return "Couldn't find that location. Try again?"

        except Exception as e:
            return f"Error setting location: {str(e)}"

    @function_tool
    async def find_fitness_locations(self, context: RunContext, location_type: str, radius_miles: int = 5):
        """Find fitness locations using Google Places API"""
        import googlemaps
        from math import radians, sin, cos, sqrt, atan2

        api_key = os.getenv("GOOGLE_PLACES_API_KEY")
        if not api_key:
            return "Google Places API key not configured."

        # Get user's location from context or use default
        user_location = self.session_state.get("user_location")

        if not user_location:
            return "I need your location first. What city are you in?"

        # Map location types to Google Places types
        place_type_map = {
            "gym": "gym",
            "running_trail": "park",
            "park": "park",
            "pool": "swimming_pool",
            "cycling_path": "park"
        }

        place_type = place_type_map.get(location_type, "gym")

        try:
            gmaps = googlemaps.Client(key=api_key)
            radius_meters = int(radius_miles * 1609.34)

            places_result = gmaps.places_nearby(
                location=user_location,
                radius=radius_meters,
                type=place_type
            )

            if not places_result.get('results'):
                return f"No {location_type}s found within {radius_miles} miles. Time to expand your search or make your own gym!"

            locations = []
            for place in places_result['results'][:5]:
                name = place.get('name', 'Unknown')

                place_lat = place['geometry']['location']['lat']
                place_lng = place['geometry']['location']['lng']
                user_lat, user_lng = map(float, user_location.split(','))

                # Haversine formula
                R = 3959
                lat1, lon1, lat2, lon2 = map(radians, [user_lat, user_lng, place_lat, place_lng])
                dlat = lat2 - lat1
                dlon = lon2 - lon1
                a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                c = 2 * atan2(sqrt(a), sqrt(1-a))
                distance = R * c

                rating = place.get('rating', 'N/A')
                locations.append(f"{name} ({distance:.1f} mi, rating: {rating})")

            return f"Found {len(locations)} {location_type}s: {', '.join(locations)}. No excuses - get after it!"

        except Exception as e:
            return f"Error finding locations: {str(e)}"


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load(
        min_speech_duration=0.15, min_silence_duration=0.80,
        prefix_padding_duration=0.10, activation_threshold=0.60
    )


async def entrypoint(ctx: JobContext):
    ctx.log_context_fields = {"room": ctx.room.name}
    
    session = agents.AgentSession(
        llm=groq.LLM(
            model="llama-3.3-70b-versatile",
            tool_choice="auto",  # Let the model decide when to use tools
            parallel_tool_calls=False  # Disable parallel calls to avoid function calling issues
        ),
        stt=groq.STT(model="whisper-large-v3-turbo", detect_language=True),
        tts=cartesia.TTS(
            model="sonic-3",
            voice="98aad370-73d7-4873-8674-3ee6de6e6904"
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )
    
    await session.start(
        agent=GogginsAssistant(),
        room=ctx.room,
        room_input_options=RoomInputOptions(noise_cancellation=noise_cancellation.BVC()),
    )
    
    await ctx.connect()


if __name__ == "__main__":
    agents.cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        agent_name="goggins-agent"
    ))