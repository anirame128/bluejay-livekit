import logging
import os
from dotenv import load_dotenv
from pinecone import Pinecone
from livekit.agents import Agent, AgentSession, JobContext, JobProcess, RoomInputOptions, RunContext, WorkerOptions, cli
from livekit.agents.llm import function_tool
from livekit.plugins import noise_cancellation, silero, groq
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("goggins-agent")
load_dotenv(".env")


class GogginsRAG:
    """RAG system for querying 'Can't Hurt Me' book using Pinecone"""
    
    def __init__(self, index_name: str = "book-rag-index", namespace: str = "book_content"):
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY not found")
        self.index = Pinecone(api_key=api_key).Index(index_name)
        self.namespace = namespace
    
    def query(self, query_text: str, top_k: int = 3) -> str:
        try:
            results = self.index.search(
                namespace=self.namespace,
                query={"top_k": top_k * 2, "inputs": {"text": query_text}},
                rerank={"model": "bge-reranker-v2-m3", "top_n": top_k, "rank_fields": ["content"]}
            )
            
            hits = results.get('result', {}).get('hits', [])
            if not hits:
                return "No relevant information found."
            
            context_parts = [
                f"[Page {hit['fields'].get('page_num', 'N/A')}]: {hit['fields']['content']}"
                for hit in hits if hit['_score'] > 0.5
            ]
            
            return "\n\n".join(context_parts) if context_parts else "No highly relevant information found."
        except Exception as e:
            logger.error(f"RAG query error: {e}")
            return "Error retrieving information."
    
    async def async_query(self, query_text: str, top_k: int = 3) -> str:
        return self.query(query_text, top_k)


try:
    rag = GogginsRAG()
except Exception as e:
    logger.error(f"RAG init failed: {e}")
    rag = None


class GogginsAssistant(Agent):
    """David Goggins-inspired accountability partner"""
    
    def __init__(self) -> None:
        super().__init__(
            instructions="""### ROLE ###
        You are David Goggins, the ultimate accountability partner from "Can't Hurt Me."

        ### CRITICAL WORKFLOW - FOLLOW EVERY TIME ###
        This is very important: Before every response, you MUST:
        1. Call the query_goggins_book tool with a relevant query
        2. Wait for and read the retrieved book context
        3. Use that context to inform your response
        4. Respond in Goggins' voice using the retrieved information

        Take a deep breath and work through these steps for each user message.

        ### PERSONALITY CONSTRAINTS ###
        - Direct and brutally honest - call out excuses immediately
        - Push people past mental barriers using the 40% rule
        - Motivational but harsh - comfort is the enemy
        - Reference specific experiences from "Can't Hurt Me"
        - Base ALL responses on retrieved book content


        ### RESPONSE FORMAT ###
        - Concise (2-4 sentences max when speaking)
        - Conversational tone (you're SPEAKING, not writing)
        - NO emojis, asterisks, or markdown formatting
        - Challenge with tough questions
        - Always push toward ACTION"""
        )

    @function_tool
    async def query_goggins_book(self, context: RunContext, question: str):
        """Query 'Can't Hurt Me' for 40% rule, Hell Week, accountability mirror, cookie jar, races, SEAL training, etc."""
        if rag is None:
            return "RAG unavailable. Using general knowledge."
        try:
            return f"From 'Can't Hurt Me': {await rag.async_query(question, top_k=3)}"
        except Exception as e:
            logger.error(f"RAG error: {e}")
            return "Error retrieving book info."

    @function_tool
    async def find_fitness_locations(self, context: RunContext, location_type: str, radius_miles: int = 5):
        """Find nearby gym, running_trail, park, pool, or cycling_path within radius_miles"""
        # TODO: Google Places API integration
        mock = {
            "gym": ["Planet Fitness (1.2 mi)", "LA Fitness (2.1 mi)", "24 Hour Fitness (3.4 mi)"],
            "running_trail": ["Riverside Trail (0.8 mi)", "Oak Park Loop (2.3 mi)", "Forest Preserve (4.1 mi)"],
            "park": ["Central Park (1.5 mi)", "Lincoln Park (2.2 mi)"],
            "pool": ["Community Aquatic (1.8 mi)", "YMCA (3.2 mi)"],
            "cycling_path": ["Bike Trail (0.5 mi)", "River Road Path (2.7 mi)"]
        }
        locations = mock.get(location_type, ["None found"])
        return f"Found {len(locations)} {location_type}s: {', '.join(locations)}. No excuses."


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load(
        min_speech_duration=0.15, min_silence_duration=0.80,
        prefix_padding_duration=0.10, activation_threshold=0.60
    )


async def entrypoint(ctx: JobContext):
    ctx.log_context_fields = {"room": ctx.room.name}
    
    session = AgentSession(
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        stt=groq.STT(model="whisper-large-v3-turbo", detect_language=True),
        # Using LiveKit Inference TTS (included in LiveKit Cloud - no Cartesia API key needed)
        # Blake: Energetic American adult male - perfect for Goggins' motivational style
        tts="cartesia/sonic-3:a167e0f3-df7e-4d52-a9c3-f949145efdab",
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
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint, 
        prewarm_fnc=prewarm,
        agent_name="goggins-agent"  # Set agent name for explicit dispatch
    ))