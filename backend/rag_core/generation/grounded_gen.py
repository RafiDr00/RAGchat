import os
import logging
from typing import List, Dict, Optional
from openai import OpenAI

logger = logging.getLogger(__name__)

class GroundedGenerator:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None
        
        if not self.client:
            logger.warning("OPENAI_API_KEY not found. Generator will rely on refusal/fallback.")

    def rewrite_query(self, user_query: str) -> str:
        """
        Rewrite user question into a search-optimized fact-seeking query.
        Strip conversational fluff.
        """
        if not self.client:
            return user_query
            
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a search query optimizer. Rewrite the following user request into a concise, fact-seeking search query. Remove all conversational filler, greetings, and ambiguity. Output ONLY the query."},
                    {"role": "user", "content": user_query}
                ],
                temperature=0.0,
                max_tokens=60
            )
            rewritten = response.choices[0].message.content.strip()
            logger.info(f"Query Rewritten: '{user_query}' -> '{rewritten}'")
            return rewritten
        except Exception as e:
            logger.error(f"Query rewrite failed: {e}")
            return user_query

    def generate_answer(self, question: str, retrieved_chunks: List[Dict]) -> str:
        """
        Final RAG generation with strict grounding and citations.
        Temperature: 0.1.
        """
        if not retrieved_chunks:
            return "The provided documents do not contain sufficient information to answer this question."

        if not self.client:
            return "Generation error: No LLM configured."

        # Format Context
        context_blocks = []
        for chunk in retrieved_chunks:
            doc = chunk.get("doc_name", "unknown")
            idx = chunk.get("chunk_index", "0")
            text = chunk.get("text", "")
            context_blocks.append(f"--- SOURCE: [{doc}:{idx}] ---\n{text}")
            
        context_str = "\n\n".join(context_blocks)

        system_prompt = """You are RAGchat, a zero-hallucination document auditor.
Your goal is to answer the user's question using ONLY the provided context blocks.

STRICT GROUNDING RULES:
1. Answer ONLY using the text in the provided context blocks.
2. If the answer is not explicitly mentioned in the context, say EXACTLY: "The provided documents do not contain sufficient information to answer this question."
3. Do NOT use your own knowledge or assumptions. 
4. CITATIONS: You MUST cite the source of every factual claim using the format [doc_name:chunk_index] inline (e.g., "The user has 5 years of Python experience [resume.pdf:2].").
5. STYLE: Be factual, precise, and professional. Minimal fillers.

If multiple sources have information, combine them accurately."""

        user_content = f"CONTEXT BLOCKS:\n\n{context_str}\n\nUSER QUESTION: {question}"

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.1,
                max_tokens=800
            )
            answer = response.choices[0].message.content.strip()
            return answer
            
        except Exception as e:
            logger.error(f"Generation error: {e}")
            return "Generation failure due to service error."
