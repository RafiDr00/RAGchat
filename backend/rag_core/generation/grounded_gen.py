from typing import List, Dict, Optional, Generator
from openai import OpenAI
from loguru import logger
from config import settings

class GroundedGenerator:
    """
    Enterprise-grade RAG Generator.
    Enforces strict grounding, source citations, and query optimization.
    """
    
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None
        
        if not self.client:
            logger.error("GroundedGenerator: OPENAI_API_KEY not found. System will fail to generate answers.")
        else:
            logger.info(f"GroundedGenerator initialized using model: {self.model}")

    def rewrite_query(self, user_query: str) -> str:
        """
        Refines the user's input into a search-optimized query.
        """
        if not self.client:
            return user_query
            
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a professional search query optimizer. Rewrite the user's request into a concise, fact-seeking query for a vector database. Remove conversational filler. Output ONLY the query text."
                    },
                    {"role": "user", "content": user_query}
                ],
                temperature=0.0,
                max_tokens=64
            )
            rewritten = response.choices[0].message.content.strip()
            logger.debug(f"Query optimization: '{user_query}' -> '{rewritten}'")
            return rewritten
        except Exception as e:
            logger.error(f"Query rewrite failure: {e}")
            return user_query

    def stream_answer(self, question: str, retrieved_chunks: List[Dict]) -> Generator[str, None, None]:
        """
        Streams a grounded answer with real-time token delivery.
        """
        if not retrieved_chunks:
            yield "The provided documents do not contain sufficient information to answer this question."
            return

        if not self.client:
            yield "Generation Error: LLM service currently unavailable."
            return

        context_str = self._format_context(retrieved_chunks)
        system_prompt = self._get_system_prompt()
        user_content = f"CONTEXT BLOCKS:\n\n{context_str}\n\nUSER QUESTION: {question}"

        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.1,
                max_tokens=1024,
                stream=True
            )
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"SSE Streaming failure: {e}")
            yield "\n\n[System Interruption: Stream connection lost]"

    def generate_answer(self, question: str, retrieved_chunks: List[Dict]) -> str:
        """
        Blocking generation for standard API requests.
        """
        if not retrieved_chunks:
            return "The provided documents do not contain sufficient information to answer this question."

        if not self.client:
            return "Generation Error: LLM service currently unavailable."

        context_str = self._format_context(retrieved_chunks)
        system_prompt = self._get_system_prompt()
        user_content = f"CONTEXT BLOCKS:\n\n{context_str}\n\nUSER QUESTION: {question}"

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.1,
                max_tokens=1024
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Generation failure: {e}")
            return "Unable to synchronize answer generation."

    def _format_context(self, chunks: List[Dict]) -> str:
        """Formats retrieved hits into a structured context string."""
        blocks = []
        for i, chunk in enumerate(chunks):
            doc = chunk.get("doc_name", "Unknown Source")
            idx = chunk.get("chunk_index", i)
            text = chunk.get("text", "")
            blocks.append(f"--- BLOCK [{doc}:{idx}] ---\n{text}")
        return "\n\n".join(blocks)

    def _get_system_prompt(self) -> str:
        return """You are RAGchat Enterprise Auditor. 
Your mandate is to provide factual answers based EXCLUSIVELY on the provided context.

STRICT PROTOCOL:
1. ONLY utilize information from the provided CONTEXT BLOCKS.
2. If the answer is not present, respond with: "The provided documents do not contain sufficient information to answer this question."
3. NO HALLUCINATION. Do not supplement with external knowledge.
4. MANDATORY CITATIONS: Every factual statement must be cited using the format [doc_name:chunk_index] immediately after the claim.
5. STYLE: Professional, concise, and auditor-neutral."""
