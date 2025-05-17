"""
Module for chunking content for API processing.
"""

import logging
import re
from typing import List, Dict, Any, Tuple

import tiktoken

import config

logger = logging.getLogger(__name__)

class ContentChunker:
    """
    Class for chunking content to fit within API token limits.
    """
    
    def __init__(self, max_chunk_size: int = None):
        """
        Initialize the ContentChunker.
        
        Args:
            max_chunk_size: Maximum tokens per chunk
        """
        self.max_chunk_size = max_chunk_size or config.MAX_CHUNK_SIZE
    
    def chunk_text(self, text: str) -> List[str]:
        """
        Split text into chunks that fit within token limits.
        
        Args:
            text: Input text
            
        Returns:
            List of text chunks
        """
        # Count tokens in the text
        token_count = self._count_tokens(text)
        
        # If the text fits in one chunk, return it
        if token_count <= self.max_chunk_size:
            return [text]
        
        # Split the text into paragraphs
        paragraphs = self._split_into_paragraphs(text)
        
        # Group paragraphs into chunks
        chunks = []
        current_chunk = []
        current_chunk_tokens = 0
        
        for paragraph in paragraphs:
            paragraph_tokens = self._count_tokens(paragraph)
            
            # If a single paragraph is too large, split it further
            if paragraph_tokens > self.max_chunk_size:
                # Add the current chunk if it's not empty
                if current_chunk:
                    chunks.append("\n\n".join(current_chunk))
                    current_chunk = []
                    current_chunk_tokens = 0
                
                # Split the paragraph into sentences
                paragraph_chunks = self._split_paragraph(paragraph, self.max_chunk_size)
                chunks.extend(paragraph_chunks)
                continue
            
            # Check if adding this paragraph would exceed the chunk size
            if current_chunk_tokens + paragraph_tokens > self.max_chunk_size:
                # Add the current chunk and start a new one
                chunks.append("\n\n".join(current_chunk))
                current_chunk = [paragraph]
                current_chunk_tokens = paragraph_tokens
            else:
                # Add the paragraph to the current chunk
                current_chunk.append(paragraph)
                current_chunk_tokens += paragraph_tokens
        
        # Add the last chunk if it's not empty
        if current_chunk:
            chunks.append("\n\n".join(current_chunk))
        
        logger.info(f"Split text into {len(chunks)} chunks")
        return chunks
    
    def chunk_video_analysis(self, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Split video analysis into chunks that fit within token limits.
        
        Args:
            analysis: Video analysis dictionary
            
        Returns:
            List of analysis chunks
        """
        # Extract the parts that need chunking
        transcription = analysis.get("transcription", "")
        summary = analysis.get("summary", {}).get("full_text", "")
        
        # Chunk the transcription
        transcription_chunks = self.chunk_text(transcription)
        
        # Chunk the summary if needed
        summary_chunks = self.chunk_text(summary) if self._count_tokens(summary) > self.max_chunk_size else [summary]
        
        # Create analysis chunks
        analysis_chunks = []
        
        # If we have multiple transcription chunks, create one analysis per chunk
        for i, trans_chunk in enumerate(transcription_chunks):
            # Use the full summary for the first chunk, and a summary of the summary for others
            if i == 0:
                sum_chunk = summary_chunks[0]
            else:
                # Use a shorter summary for subsequent chunks
                sum_chunk = summary_chunks[0][:500] + "... [summary truncated]"
            
            # Create a chunk with the current transcription piece and appropriate summary
            chunk = analysis.copy()
            chunk["transcription"] = trans_chunk
            chunk["summary"] = {"full_text": sum_chunk}
            chunk["chunk_index"] = i
            chunk["total_chunks"] = len(transcription_chunks)
            
            analysis_chunks.append(chunk)
        
        logger.info(f"Split video analysis into {len(analysis_chunks)} chunks")
        return analysis_chunks
    
    def _count_tokens(self, text: str) -> int:
        """
        Count the number of tokens in a text.
        
        Args:
            text: Input text
            
        Returns:
            Token count
        """
        try:
            encoding = tiktoken.encoding_for_model("gpt-4")
            return len(encoding.encode(text))
        except Exception as e:
            logger.error(f"Error counting tokens: {e}")
            # Fallback: estimate 1 token per 4 characters
            return len(text) // 4
    
    def _split_into_paragraphs(self, text: str) -> List[str]:
        """
        Split text into paragraphs.
        
        Args:
            text: Input text
            
        Returns:
            List of paragraphs
        """
        # Split on double newlines
        paragraphs = re.split(r"\n\s*\n", text)
        
        # Filter out empty paragraphs
        return [p.strip() for p in paragraphs if p.strip()]
    
    def _split_paragraph(self, paragraph: str, max_tokens: int) -> List[str]:
        """
        Split a paragraph into smaller chunks.
        
        Args:
            paragraph: Input paragraph
            max_tokens: Maximum tokens per chunk
            
        Returns:
            List of paragraph chunks
        """
        # Split into sentences
        sentences = re.split(r"(?<=[.!?])\s+", paragraph)
        
        chunks = []
        current_chunk = []
        current_chunk_tokens = 0
        
        for sentence in sentences:
            sentence_tokens = self._count_tokens(sentence)
            
            # If a single sentence is too large, split it further
            if sentence_tokens > max_tokens:
                # Add the current chunk if it's not empty
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                    current_chunk = []
                    current_chunk_tokens = 0
                
                # Split the sentence into words and group them
                words = sentence.split()
                current_sentence_chunk = []
                current_sentence_tokens = 0
                
                for word in words:
                    word_tokens = self._count_tokens(word)
                    
                    if current_sentence_tokens + word_tokens > max_tokens:
                        # Add the current sentence chunk and start a new one
                        chunks.append(" ".join(current_sentence_chunk))
                        current_sentence_chunk = [word]
                        current_sentence_tokens = word_tokens
                    else:
                        # Add the word to the current sentence chunk
                        current_sentence_chunk.append(word)
                        current_sentence_tokens += word_tokens
                
                # Add the last sentence chunk if it's not empty
                if current_sentence_chunk:
                    chunks.append(" ".join(current_sentence_chunk))
                
                continue
            
            # Check if adding this sentence would exceed the chunk size
            if current_chunk_tokens + sentence_tokens > max_tokens:
                # Add the current chunk and start a new one
                chunks.append(" ".join(current_chunk))
                current_chunk = [sentence]
                current_chunk_tokens = sentence_tokens
            else:
                # Add the sentence to the current chunk
                current_chunk.append(sentence)
                current_chunk_tokens += sentence_tokens
        
        # Add the last chunk if it's not empty
        if current_chunk:
            chunks.append(" ".join(current_chunk))
        
        return chunks
