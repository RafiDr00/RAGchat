"""
LLM Service - Fortune 500 Grade AI Integration
Supports: OpenAI, Ollama (local), Fallback responses
"""
import os
import logging
from typing import Optional, List, Dict
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# OpenAI integration
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI not installed. Using fallback LLM.")


class LLMService:
    def __init__(self):
        self.openai_client = None
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "llama2")
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        
        # Initialize OpenAI if available and configured
        openai_key = os.getenv("OPENAI_API_KEY", "")
        if OPENAI_AVAILABLE and openai_key and not openai_key.startswith("sk_test"):
            try:
                self.openai_client = OpenAI(api_key=openai_key)
                logger.info(f"OpenAI initialized with model: {self.openai_model}")
            except Exception as e:
                logger.error(f"OpenAI initialization failed: {e}")
    
    def generate_rag_answer(
        self, 
        question: str, 
        context_chunks: List[Dict],
        max_tokens: int = 500
    ) -> str:
        """Generate RAG-grounded answer using retrieved context"""
        
        if not context_chunks:
            return "No relevant information found in the uploaded documents."
        
        # Build context from retrieved chunks
        context_parts = []
        for i, chunk in enumerate(context_chunks[:5], 1):
            source = chunk.get("doc", "Unknown")
            text = chunk.get("text", "")[:500]
            context_parts.append(f"[Source {i}: {source}]\n{text}")
        
        context = "\n\n".join(context_parts)
        
        system_prompt = """You are a document-grounded assistant. You MUST answer ONLY using the provided context.

CRITICAL RULES:
1. Answer ONLY from the provided context - do NOT use your training knowledge
2. If the context doesn't contain the answer, say: "The uploaded documents don't contain information about this."
3. Be concise and direct - no fluff
4. Quote relevant parts when helpful
5. Cite sources as [Source X] where X is the source number

OUTPUT FORMAT:
- Start with a direct answer (1-2 sentences)
- Add bullet points for details if needed
- End with source citations if you referenced specific chunks

If the context is insufficient or irrelevant to the question, explicitly state that."""

        user_prompt = f"""CONTEXT FROM UPLOADED DOCUMENTS:
---
{context}
---

QUESTION: {question}

Answer using ONLY the context above. If the context doesn't contain relevant information, say so clearly."""

        # Try OpenAI first
        if self.openai_client:
            try:
                response = self.openai_client.chat.completions.create(
                    model=self.openai_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=max_tokens,
                    temperature=0.3
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                logger.error(f"OpenAI RAG generation failed: {e}")
        
        # Try Ollama
        ollama_response = self._try_ollama(f"{system_prompt}\n\n{user_prompt}")
        if ollama_response:
            return ollama_response
        
        # Fallback: Return context summary
        return self._format_context_as_answer(context_chunks)
    
    def generate_llm_only_answer(self, question: str, max_tokens: int = 500) -> str:
        """Generate answer using only LLM knowledge (no RAG)"""
        
        system_prompt = """You are a helpful assistant. Answer questions based on your training knowledge.
Be accurate and concise. If you're unsure, acknowledge uncertainty."""

        user_prompt = f"Question: {question}"

        # Try OpenAI first
        if self.openai_client:
            try:
                response = self.openai_client.chat.completions.create(
                    model=self.openai_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=max_tokens,
                    temperature=0.7
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                logger.error(f"OpenAI generation failed: {e}")
        
        # Try Ollama
        ollama_response = self._try_ollama(f"{system_prompt}\n\n{user_prompt}")
        if ollama_response:
            return ollama_response
        
        # Fallback response
        return self._get_fallback_answer(question)
    
    def _try_ollama(self, prompt: str) -> Optional[str]:
        """Try to get response from local Ollama"""
        try:
            import requests
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.ollama_model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=30
            )
            if response.status_code == 200:
                return response.json().get("response", "").strip()
        except Exception as e:
            logger.debug(f"Ollama unavailable: {e}")
        return None
    
    def _format_context_as_answer(self, chunks: List[Dict]) -> str:
        """Format retrieved chunks as a well-organized, synthesized answer"""
        if not chunks:
            return "No relevant information found."
        
        # Synthesize answer with clear structure
        answer_parts = []
        answer_parts.append("Based on the retrieved documents:\n")
        
        # Group chunks by topic/document if possible
        seen_sources = set()
        main_points = []
        
        for i, chunk in enumerate(chunks[:5], 1):
            text = chunk.get("text", "").strip()
            source = chunk.get("doc", "Unknown")
            
            # Clean and truncate text intelligently
            # Try to end at sentence boundary
            if len(text) > 400:
                truncate_at = text.rfind('.', 0, 400)
                if truncate_at > 200:
                    text = text[:truncate_at + 1]
                else:
                    text = text[:400] + "..."
            
            # Format as bullet point with source citation
            main_points.append(f"• {text.replace(chr(10), ' ').replace(chr(13), ' ')}")
            
            # Track sources
            if source not in seen_sources:
                seen_sources.add(source)
        
        # Add main points
        answer_parts.extend(main_points)
        
        # Add sources footer
        if seen_sources:
            answer_parts.append(f"\n📄 Sources: {', '.join(sorted(seen_sources))}")
        
        return "\n\n".join(answer_parts)
    
    def _get_fallback_answer(self, question: str) -> str:
        """Intelligent fallback when no LLM is available"""
        question_lower = question.lower()
        
        if any(word in question_lower for word in ["who is", "ceo", "founder", "owner", "lead"]):
            return "I don't have access to leadership information. Please check the uploaded documents for details."
        
        elif any(word in question_lower for word in ["what is", "what are", "define", "explain"]):
            return "For detailed definitions, please refer to the uploaded documents or enable an LLM backend."
        
        elif any(word in question_lower for word in ["how do", "how to", "tutorial", "guide", "steps"]):
            return "For step-by-step instructions, please consult the uploaded documentation."
        
        elif any(word in question_lower for word in ["compare", "difference", "versus", "better"]):
            return "Comparison analysis requires reviewing the source documents. Please check your uploaded resources."
        
        else:
            return "I'm operating in fallback mode without an LLM. Please configure OpenAI or Ollama for full functionality."
    
    def get_status(self) -> Dict:
        """Return LLM service status"""
        return {
            "openai_available": self.openai_client is not None,
            "openai_model": self.openai_model if self.openai_client else None,
            "ollama_url": self.ollama_url,
            "ollama_model": self.ollama_model,
            "mode": "openai" if self.openai_client else "ollama" if self._check_ollama() else "fallback"
        }
    
    def _check_ollama(self) -> bool:
        """Check if Ollama is available"""
        try:
            import requests
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=2)
            return response.status_code == 200
        except:
            return False
