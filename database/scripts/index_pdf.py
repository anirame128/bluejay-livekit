import os
import re
import time
from typing import Any, Dict, List

from dotenv import load_dotenv
from pinecone import Pinecone
from pinecone.exceptions import PineconeException
from pypdf import PdfReader


def extract_text_from_pdf(pdf_path: str) -> List[Dict[str, Any]]:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    try:
        reader = PdfReader(pdf_path)
        pages_data = []
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text().strip()
            if text:
                pages_data.append({"page_num": page_num, "text": text})
        return pages_data
    except Exception as e:
        raise RuntimeError(f"Error reading PDF {pdf_path}") from e


def _split_text_into_chunks(text: str, chunk_size: int, overlap: int) -> List[str]:
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = start + chunk_size
        
        if end >= text_len:
            chunk = text[start:].strip()
            if chunk:
                chunks.append(chunk)
            break
        
        sentence_pattern = r'[.!?]\s+'
        matches = list(re.finditer(sentence_pattern, text[start:end + overlap]))
        
        if matches:
            split_pos = start + matches[-1].end()
        elif (para_match := re.search(r'\n\s*\n', text[start:end + overlap])):
            split_pos = start + para_match.end()
        elif (word_boundary := text.rfind(' ', start, end + overlap)) > start:
            split_pos = word_boundary + 1
        else:
            split_pos = end
        
        chunk = text[start:split_pos].strip()
        if chunk:
            chunks.append(chunk)
        
        start = max(split_pos - overlap, split_pos)
    
    return chunks


def chunk_text(
    pages_data: List[Dict[str, Any]],
    chunk_size: int = 1000,
    overlap: int = 200,
    source_file: str = "book.pdf"
) -> List[Dict[str, Any]]:
    chunks = []
    chunk_id = 1
    
    for page_data in pages_data:
        page_chunks = _split_text_into_chunks(
            page_data["text"], chunk_size, overlap
        )
        for idx, chunk_text in enumerate(page_chunks, start=1):
            chunks.append({
                "_id": f"chunk_{chunk_id}",
                "content": chunk_text.strip(),
                "page_num": page_data["page_num"],
                "chunk_index": idx,
                "source_file": source_file
            })
            chunk_id += 1
    
    return chunks


def exponential_backoff_retry(func, max_retries=5):
    for attempt in range(max_retries):
        try:
            return func()
        except PineconeException as e:
            status_code = getattr(e, 'status', None)
            if status_code and (status_code >= 500 or status_code == 429):
                if attempt < max_retries - 1:
                    delay = min(2 ** attempt, 60)
                    time.sleep(delay)
                else:
                    raise
            else:
                raise


def batch_upsert(index, namespace, records, batch_size=96):
    total = len(records)
    for i in range(0, total, batch_size):
        batch = records[i:i + batch_size]
        exponential_backoff_retry(
            lambda: index.upsert_records(namespace, batch)
        )
        time.sleep(0.1)


def index_pdf(
    pdf_path: str = "../data/book.pdf",
    index_name: str = "book-rag-index",
    namespace: str = "book_content"
):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)
    
    env_paths = [
        os.path.join(backend_dir, ".env"),
        os.path.join(script_dir, ".env"),
        ".env"
    ]
    
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            break
    else:
        load_dotenv()
    
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        raise ValueError("PINECONE_API_KEY environment variable not set. Check your .env file or set it as an environment variable.")

    pages = extract_text_from_pdf(pdf_path)
    chunks = chunk_text(pages, chunk_size=1000, overlap=200, source_file="book.pdf")
    pc = Pinecone(api_key=api_key)
    index = pc.Index(index_name)
    batch_upsert(index, namespace, chunks, batch_size=96)
    time.sleep(5)


if __name__ == "__main__":
    try:
        index_pdf()
    except Exception as e:
        pass

