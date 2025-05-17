"""
Module for transcribing spoken content in videos.
"""

import os
import logging
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any

import whisper
from moviepy.editor import VideoFileClip

logger = logging.getLogger(__name__)

class Transcriber:
    """
    Class for transcribing spoken content in videos.
    
    Uses OpenAI's Whisper model for speech-to-text conversion.
    """
    
    def __init__(self, model_size: str = "base"):
        """
        Initialize the Transcriber.
        
        Args:
            model_size: Whisper model size ('tiny', 'base', 'small', 'medium', 'large')
        """
        self.model_size = model_size
        self.model = None  # Lazy loading
    
    def transcribe(self, video_path: Path) -> str:
        """
        Transcribe the audio content of a video.
        
        Args:
            video_path: Path to the video file
            
        Returns:
            Transcribed text
        """
        logger.info(f"Transcribing video: {video_path}")
        
        # Extract audio from video
        audio_path = self._extract_audio(video_path)
        
        # Load model if not already loaded
        if self.model is None:
            logger.info(f"Loading Whisper model: {self.model_size}")
            self.model = whisper.load_model(self.model_size)
        
        # Transcribe audio
        try:
            logger.info("Starting transcription...")
            result = self.model.transcribe(str(audio_path))
            transcription = result["text"]
            logger.info(f"Transcription complete: {len(transcription)} characters")
            
            # Clean up temporary audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
            
            return transcription
        except Exception as e:
            logger.error(f"Error during transcription: {e}")
            # Clean up temporary audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
            raise
    
    def _extract_audio(self, video_path: Path) -> str:
        """
        Extract audio from video file.
        
        Args:
            video_path: Path to the video file
            
        Returns:
            Path to the extracted audio file
        """
        try:
            # Create a temporary file for the audio
            temp_audio = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            temp_audio_path = temp_audio.name
            temp_audio.close()
            
            logger.info(f"Extracting audio to: {temp_audio_path}")
            
            # Extract audio using moviepy
            video = VideoFileClip(str(video_path))
            video.audio.write_audiofile(temp_audio_path, 
                                        codec='pcm_s16le',
                                        logger=None)  # Suppress moviepy output
            
            return temp_audio_path
        except Exception as e:
            logger.error(f"Error extracting audio: {e}")
            # Clean up temporary file if it exists
            if os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)
            raise
