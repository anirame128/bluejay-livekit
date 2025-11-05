import logging
import os
import traceback
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import Agent, JobContext, JobProcess, RoomInputOptions, RunContext, WorkerOptions
from livekit.agents.llm import function_tool
from livekit.plugins import groq, noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from pinecone import Pinecone

logger = logging.getLogger("goggins-agent")
load_dotenv(".env")


class GogginsRAG:
    """RAG system for querying 'Can't Hurt Me' book using Pinecone."""
    
    def __init__(self, index_name: str = "book-rag-index", namespace: str = "book_content"):
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY not found")
        self.index = Pinecone(api_key=api_key).Index(index_name)
        self.namespace = namespace
    
    def query(self, query_text: str, top_k: int = 5) -> str:
        try:
            logger.info(f"Pinecone query - text: {query_text}, top_k: {top_k}, namespace: {self.namespace}")
            
            # Use Pinecone search with hybrid search format
            results = self.index.search(
                namespace=self.namespace,
                query={"top_k": top_k * 2, "inputs": {"text": query_text}},
                rerank={"model": "bge-reranker-v2-m3", "top_n": top_k, "rank_fields": ["content"]}
            )
            
            # Extract hits from SearchRecordsResponse object
            if not (hasattr(results, 'result') and hasattr(results.result, 'hits')):
                logger.error(f"Unexpected response structure: {type(results)}")
                return "Error: Unexpected response structure from Pinecone."
            
            hits = results.result.hits
            logger.info(f"Found {len(hits)} hits from Pinecone")
            
            if not hits:
                logger.warning("No hits returned from Pinecone")
                return "No relevant information found."
            
            # Reranking already applied, take top_k results
            top_hits = hits[:top_k]
            logger.info(f"Using top {len(top_hits)} hits")
            
            context_parts = []
            for hit in top_hits:
                fields = hit.get('fields', hit.get('metadata', {}))
                content = fields.get('content', '')
                page_num = fields.get('page_num', 'N/A')
                context_parts.append(f"[Page {page_num}]: {content}")
            
            logger.info(f"Created {len(context_parts)} context parts")
            
            return "\n\n".join(context_parts) if context_parts else "No highly relevant information found."
        except Exception as e:
            logger.error(f"RAG query error: {e}", exc_info=True)
            print(f"\nRAG Query Error: {e}\n")
            traceback.print_exc()
            return "Error retrieving information."
    
    async def async_query(self, query_text: str, top_k: int = 5) -> str:
        """Async wrapper for query method."""
        return self.query(query_text, top_k)


try:
    rag = GogginsRAG()
except Exception as e:
    logger.error(f"RAG init failed: {e}")
    rag = None


class GogginsAssistant(Agent):
    """David Goggins-inspired accountability partner."""
    
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are David Goggins from "Can't Hurt Me."

Before EVERY response, you MUST call the query_goggins_book tool with a relevant query, then use that context in your answer.

Speak in Goggins' direct, no-excuses voice."""
        )

    @function_tool
    async def query_goggins_book(self, context: RunContext, question: str):
        """Query 'Can't Hurt Me' for 40% rule, Hell Week, accountability mirror, cookie jar, races, SEAL training, etc."""
        if rag is None:
            logger.warning("RAG unavailable. Using general knowledge.")
            return "RAG unavailable. Using general knowledge."
        try:
            logger.info(f"RAG Query: {question}")
            rag_result = await rag.async_query(question, top_k=5)
            logger.info(f"RAG Output:\n{rag_result}")
            print(f"\n{'='*60}")
            print(f"RAG Query: {question}")
            print(f"{'='*60}")
            print(f"RAG Output:\n{rag_result}")
            print(f"{'='*60}\n")
            return f"From 'Can't Hurt Me': {rag_result}"
        except Exception as e:
            logger.error(f"RAG error: {e}")
            print(f"\nRAG Error: {e}\n")
            return "Error retrieving book info."

    @function_tool
    async def find_fitness_locations(self, context: RunContext, location_type: str, radius_miles: int = 5):
        """Find nearby gym, running_trail, park, pool, or cycling_path within radius_miles."""
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
    
    session = agents.AgentSession(
        llm="openai/gpt-4.1-mini",
        stt=groq.STT(model="whisper-large-v3-turbo", detect_language=True),
        tts="cartesia/sonic-3:98aad370-73d7-4873-8674-3ee6de6e6904",
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