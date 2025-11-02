import os
import sys
from dotenv import load_dotenv
from pinecone import Pinecone


def load_env():
    """Load environment variables from .env file."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)
    
    env_paths = [
        os.path.join(backend_dir, ".env"),
        os.path.join(script_dir, ".env"),
        ".env"
    ]
    
    loaded = False
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            loaded = True
            break
    
    if not loaded:
        load_dotenv()
    
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        raise ValueError("PINECONE_API_KEY environment variable not set.")
    return api_key


def search_index(query_text: str, index_name: str = "book-rag-index", namespace: str = "book_content", top_k: int = 5):
    """Search the Pinecone index and return results."""
    api_key = load_env()
    
    print(f"Connecting to Pinecone index '{index_name}'...")
    pc = Pinecone(api_key=api_key)
    index = pc.Index(index_name)
    
    print(f"Searching for: '{query_text}'")
    print(f"Retrieving top {top_k} results...\n")
    
    # Search with reranking (best practice per AGENTS.md)
    results = index.search(
        namespace=namespace,
        query={
            "top_k": top_k * 2,  # Get more candidates for reranking
            "inputs": {
                "text": query_text
            }
        },
        rerank={
            "model": "bge-reranker-v2-m3",
            "top_n": top_k,
            "rank_fields": ["content"]
        }
    )
    
    # Access results (with reranking, use dict-style access)
    hits = results['result']['hits']
    
    if not hits:
        print("No results found.")
        return
    
    print(f"Found {len(hits)} results:\n")
    print("=" * 80)
    
    for i, hit in enumerate(hits, 1):
        score = hit['_score']
        content = hit['fields']['content']
        page_num = hit['fields'].get('page_num', 'N/A')
        chunk_index = hit['fields'].get('chunk_index', 'N/A')
        
        print(f"\nResult {i} (Score: {score:.4f})")
        print(f"Page: {page_num}, Chunk: {chunk_index}")
        print("-" * 80)
        # Show first 300 characters
        preview = content[:300] + "..." if len(content) > 300 else content
        print(preview)
        print()


def main():
    """Main function for interactive or command-line querying."""
    if len(sys.argv) > 1:
        # Command-line mode: python query_index.py "your query here"
        query = " ".join(sys.argv[1:])
        search_index(query)
    else:
        # Interactive mode
        print("Pinecone Index Query Tool")
        print("=" * 80)
        print("Enter a query to search the indexed book content.")
        print("Type 'quit' or 'exit' to stop.\n")
        
        while True:
            query = input("Query: ").strip()
            
            if not query:
                continue
            
            if query.lower() in ['quit', 'exit', 'q']:
                print("Goodbye!")
                break
            
            try:
                search_index(query)
                print("\n" + "=" * 80 + "\n")
            except Exception as e:
                print(f"Error: {e}\n")


if __name__ == "__main__":
    main()

