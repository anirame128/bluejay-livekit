# David Goggins Voice Agent - RAG-Enabled LiveKit Application

A RAG-enabled voice agent built with LiveKit that embodies the personality and wisdom of David Goggins from "Can't Hurt Me." This agent can have real-time voice conversations, answer questions from the book using Retrieval-Augmented Generation (RAG), and help users find nearby fitness locations.

## Overview

This application consists of three main components:
- **Backend**: Flask server for LiveKit token generation (deployed on Google Cloud Run)
- **LiveKit Agent**: Voice agent with RAG capabilities (deployed on LiveKit Cloud)
- **Frontend**: React-based UI with real-time transcription (local/web deployment)

### Frontend Features

The React frontend includes all required components:
- **"Start Call" button**: Initiates connection to LiveKit room
- **Live transcript display**: Updates in real-time as participants speak, showing both user and agent speech
- **"End Call" button**: Disconnects from the call and returns to initial state

**Note**: PDF upload functionality is optional per requirements and not implemented in this version. The PDF is pre-indexed into Pinecone during setup.

### The Story

The voice agent channels David Goggins' no-excuses, motivational personality from his book "Can't Hurt Me." Users can:
- Have conversations with the agent about mental toughness, discipline, and overcoming adversity
- Ask specific questions about content from the book, which the agent answers using RAG
- Find nearby gyms, running trails, and fitness locations through tool calls

The agent automatically queries the book's content before every response to ensure answers are grounded in Goggins' actual teachings and experiences.

## System Architecture

### End-to-End Flow

1. **User initiates call** via React frontend
2. **Frontend requests token** from backend Flask server (GCP Cloud Run)
3. **Backend generates LiveKit token** and dispatches agent
4. **User connects** to LiveKit room via WebSocket
5. **Agent joins room** (LiveKit Cloud deployment)
6. **Voice conversation begins**:
   - Speech-to-Text: Groq Whisper Large V3 Turbo (via Groq plugin)
   - LLM: Groq Llama 3.3 70B Versatile (via Groq plugin)
   - Text-to-Speech: Custom David Goggins voice clone (Cartesia plugin - custom voices require plugin)
7. **For each user question**, agent:
   - Queries Pinecone vector database for relevant book passages
   - Reranks results using BGE reranker
   - Uses retrieved context in LLM response
   - Responds with Goggins' voice and personality
8. **Tool calls** (e.g., finding gyms) use Google Places API
9. **Real-time transcription** displayed on frontend using LiveKit hooks

### Technology Stack

- **LiveKit**: Real-time voice communication and agent framework
- **LiveKit Cloud**: Server hosting (as required)
- **LiveKit Inference**: Unified model gateway for STT, LLM, and TTS
- **Pinecone**: Vector database for RAG (Serverless, AWS us-east-1)
- **React**: Frontend framework with LiveKit React components
- **Flask**: Backend token server
- **Google Cloud Run**: Backend hosting (bonus: deployed on cloud instead of locally)

## RAG Integration

### How RAG Works

The RAG system enables the agent to answer questions about specific content from David Goggins' "Can't Hurt Me" book:

1. **PDF Processing**: The book PDF (`database/data/book.pdf`) is processed into chunks
2. **Embedding**: Text chunks are embedded using Pinecone's integrated inference model (`llama-text-embed-v2`)
3. **Vector Storage**: Embeddings are stored in Pinecone with metadata (page numbers, chunk indices)
4. **Query Flow**:
   - User asks a question about the book
   - Query is embedded using the same model
   - Vector similarity search retrieves top-k relevant chunks (top_k=10, then reranked to top_k=5)
   - BGE reranker (`bge-reranker-v2-m3`) improves relevance
   - Retrieved chunks with page numbers are passed to LLM as context
   - Agent responds using the retrieved information

### Vector Database Configuration

- **Index**: `book-rag-index`
- **Type**: Dense embeddings
- **Model**: `llama-text-embed-v2` (Pinecone integrated inference)
- **Dimensions**: 1024
- **Metric**: Cosine similarity
- **Capacity Mode**: Serverless
- **Region**: AWS us-east-1
- **Namespace**: `book_content`
- **Record Count**: 717 chunks

### Chunking Strategy

- **Chunk Size**: 1000 characters
- **Overlap**: 200 characters
- **Strategy**: 
  - Prefers splitting at sentence boundaries
  - Falls back to paragraph boundaries
  - Finally splits at word boundaries
  - Preserves page numbers for citation

### Reranking

- **Model**: `bge-reranker-v2-m3`
- **Process**: Initial search returns 10 candidates, reranked to top 5
- **Purpose**: Improves precision for chapter-specific questions

## Tools and Frameworks Used

### AI/ML Tools
- **Claude Code**: Primary coding assistant for development
- **Cursor with MCP Server**: Integrated development environment with MCP server support for:
  - LiveKit documentation access
  - Pinecone documentation access
- **Claude Chat**: Planning and deployment guidance for Google Cloud Run

### Infrastructure
- **LiveKit Cloud**: Agent hosting with LiveKit Inference
- **Google Cloud Run**: Backend Flask server hosting
- **Pinecone**: Vector database (Serverless)
- **Google Places API**: Fitness location search

### Model Providers
- **Groq**: STT inference (Whisper Large V3 Turbo) and LLM inference (Llama 3.3 70B Versatile) via Groq plugin
- **Cartesia**: TTS inference (Custom David Goggins voice clone) via Cartesia plugin
- **Note**: Custom Cartesia voices require the plugin (not available via LiveKit Inference). Groq models can also be used via LiveKit Inference, but this implementation uses plugins for direct API access.

### Voice Clone

The agent uses a custom voice clone created with the Cartesia API:
- **Voice ID**: `98aad370-73d7-4873-8674-3ee6de6e6904`
- **Model**: Cartesia Sonic 3
- **Source**: David Goggins voice recording snippet
- **Purpose**: Provides authentic, motivational voice aligned with Goggins' personality

## Setup Instructions

### Prerequisites

- Python 3.12+ (for agent, Dockerfile uses 3.13)
- Python 3.11+ (for backend)
- Node.js 18+ (for frontend)
- LiveKit Cloud account
- Pinecone account
- Google Cloud Platform account (for backend deployment)
- Google Places API key

### Environment Variables

#### Backend (`backend/`)
```bash
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-livekit-url.livekit.cloud
PORT=8080  # Optional, defaults to 8080
```

#### LiveKit Agent (`livekit-voice-agent/`)
```bash
PINECONE_API_KEY=your_pinecone_api_key
GOOGLE_PLACES_API_KEY=your_google_places_api_key
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
```

#### Database Scripts (`database/`)
```bash
PINECONE_API_KEY=your_pinecone_api_key
```

#### Frontend (`frontend/`)
Create `.env` file:
```bash
REACT_APP_LIVEKIT_URL=wss://your-livekit-url.livekit.cloud
REACT_APP_TOKEN_SERVER_URL=http://localhost:8080  # or your deployed backend URL
```

### Local Development Setup

#### 1. Index the PDF

First, index the book PDF into Pinecone:

```bash
cd database
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python scripts/index_pdf.py
```

This will:
- Extract text from `database/data/book.pdf`
- Chunk the text (1000 chars, 200 char overlap)
- Embed using Pinecone's integrated inference
- Upload to Pinecone index `book-rag-index`

#### 2. Set Up Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python application.py
```

Backend runs on `http://localhost:8080`

#### 3. Set Up LiveKit Agent

```bash
cd livekit-voice-agent
# Using UV (recommended)
uv sync
uv run agent.py start

# Or using pip
pip install -r requirements.txt  # If you create requirements.txt
python agent.py start
```

#### 4. Set Up Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

### Deployment

#### Backend (Google Cloud Run)

1. Build Docker image:
```bash
cd backend
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/bluejay-backend
```

2. Deploy to Cloud Run:
```bash
gcloud run deploy bluejay-backend \
  --image gcr.io/YOUR_PROJECT_ID/bluejay-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars LIVEKIT_API_KEY=xxx,LIVEKIT_API_SECRET=xxx,LIVEKIT_URL=xxx
```

#### LiveKit Agent (LiveKit Cloud)

1. Configure `livekit.toml`:
```toml
[project]
subdomain = "your-subdomain"

[agent]
id = "your-agent-id"
```

2. Deploy using LiveKit CLI:
```bash
lk agent deploy
```

Or deploy via LiveKit Cloud dashboard.

#### Frontend

Deploy to any static hosting service (Vercel, Netlify, etc.):

```bash
cd frontend
npm run build
# Deploy the build/ directory
```

Update `REACT_APP_TOKEN_SERVER_URL` to point to your deployed backend.

## Design Decisions and Assumptions

### Trade-offs and Limitations

1. **RAG Query Frequency**: The agent queries RAG before every response, which adds latency but ensures all answers are grounded in the book. This is intentional to maintain fidelity to Goggins' teachings.

2. **Chunk Size**: 1000 characters with 200 overlap balances context preservation with retrieval precision. Smaller chunks might miss context; larger chunks might include irrelevant information.

3. **Reranking**: Two-stage retrieval (initial search + reranking) improves accuracy but adds latency. For voice conversations, this trade-off is acceptable.

4. **Voice Clone**: Custom voice clone provides authentic experience but requires Cartesia API access. Alternative: use default Cartesia voices.

5. **Tool Call Dependency**: Finding fitness locations requires user to provide city first. This adds a conversation step but ensures accurate results.

### Hosting Assumptions

1. **Backend**: Assumes Google Cloud Run for serverless scalability. Can be deployed to any container platform (AWS ECS, Azure Container Apps, etc.).

2. **Agent**: Requires LiveKit Cloud for agent hosting. Alternative: self-hosted LiveKit server with agent deployment.

3. **Vector DB**: Pinecone Serverless chosen for simplicity and integrated inference. Alternatives: self-hosted Chroma, Weaviate, or Qdrant.

4. **Frontend**: Assumes static hosting. Can run locally or deploy to any web server.

### RAG Assumptions

1. **Vector DB Choice**: Pinecone Serverless for:
   - Integrated embedding inference (no separate embedding service needed)
   - Managed infrastructure
   - Built-in reranking support
   - Pay-per-use pricing
   - **Note**: While the requirements suggest using existing RAG frameworks (LangChain/LlamaIndex), a custom RAG implementation was chosen for:
     - Tighter integration with LiveKit agent
     - Minimal dependencies
     - Direct control over retrieval and reranking
     - Better performance for voice conversations

2. **Chunking Strategy**: 
   - Page-based chunking preserves page numbers for citation (essential for chapter-specific questions)
   - Sentence-aware splitting maintains readability
   - 1000 character chunks with 200 character overlap ensures context continuity
   - This strategy ensures proper RAG setup (not just keyword search or summarization)

3. **Frameworks**: 
   - Direct Pinecone SDK integration for simplicity
   - Custom RAG class (`GogginsRAG`) for tight integration with LiveKit agent
   - Integrated inference model (`llama-text-embed-v2`) via Pinecone
   - BGE reranker for improved precision on chapter-specific questions

### LiveKit Agent Design

1. **Pipeline Configuration**:
   - **STT**: Groq Whisper Large V3 Turbo (via Groq plugin) - configurable
   - **LLM**: Groq Llama 3.3 70B Versatile (via Groq plugin) - configurable
   - **TTS**: Custom Cartesia voice (via Cartesia plugin) - configurable
   - **Note**: Models are accessed via plugins for direct API control. Groq models can alternatively be used via LiveKit Inference, but custom Cartesia voices require the plugin.
   - **VAD**: Silero VAD (configurable) - lightweight, multilingual
   - **Turn Detection**: MultilingualModel (handles multiple languages)
   - **Noise Cancellation**: BVC (improves audio quality)

2. **Agent State Management**:
   - Session state for user location (lightweight, per-session)
   - No persistent storage (stateless design)

3. **Error Handling**:
   - Graceful degradation when RAG unavailable
   - Fallback to general knowledge if vector search fails
   - Tool call error messages maintain agent personality

4. **Deployment**:
   - Agent deployed on LiveKit Cloud (as required)
   - Backend deployed on Google Cloud Run (bonus: cloud deployment)

## Project Structure

```
bluejay-livekit/
├── backend/              # Flask token server
│   ├── application.py   # Token generation endpoint
│   ├── Dockerfile       # Container definition
│   └── requirements.txt
├── livekit-voice-agent/ # LiveKit agent
│   ├── agent.py        # Main agent code with RAG
│   ├── livekit.toml    # LiveKit Cloud config
│   ├── Dockerfile      # Container definition
│   └── pyproject.toml  # Python dependencies
├── database/            # PDF indexing scripts
│   ├── scripts/
│   │   └── index_pdf.py # PDF processing and indexing
│   ├── data/
│   │   └── book.pdf    # Source PDF
│   └── requirements.txt
└── frontend/            # React UI
    ├── src/
    │   ├── App.js      # Main app component
    │   ├── components/
    │   │   ├── MainInterface.js
    │   │   ├── TranscriptBox.js
    │   │   ├── CallButton.js
    │   │   └── ...
    │   └── utils/
    │       └── config.js
    └── package.json
```

## Testing the RAG System

To verify RAG is working correctly, ask the agent:
- "What happened in chapter 3?"
- "Tell me about Goggins' Navy SEAL training"
- "What does Goggins say about mental toughness?"
- "What was the 40% rule?"

The agent should respond with specific details from the book, including page numbers when relevant.

## Future Improvements

1. **Caching**: Cache common RAG queries to reduce latency
2. **Streaming RAG**: Stream retrieved context to LLM for faster responses
3. **Multi-turn RAG**: Maintain conversation context across turns
4. **PDF Upload**: Allow users to upload their own PDFs via frontend
5. **Analytics**: Track RAG query performance and accuracy

## License

This project is for demonstration purposes.

## Contact

For questions or issues, please contact the repository maintainer.
