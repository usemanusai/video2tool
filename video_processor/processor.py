"""
Main video processing module.
"""

import os
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import cv2
from moviepy.editor import VideoFileClip

from video_processor.transcriber import Transcriber
from video_processor.visual_analyzer import VisualAnalyzer
from video_processor.enhanced_visual_analyzer import EnhancedVisualAnalyzer
from video_processor.summarizer import Summarizer

logger = logging.getLogger(__name__)

class VideoProcessor:
    """
    Main class for processing video content.

    This class orchestrates the video processing workflow:
    1. Validates the video file
    2. Extracts audio for transcription
    3. Analyzes visual elements
    4. Generates a comprehensive summary
    """

    def __init__(self, temp_dir: str = "./temp", use_enhanced_analyzer: bool = True):
        """
        Initialize the VideoProcessor.

        Args:
            temp_dir: Directory for temporary files
            use_enhanced_analyzer: Whether to use the enhanced visual analyzer
        """
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(exist_ok=True)

        self.transcriber = Transcriber()

        # Use enhanced visual analyzer if specified
        if use_enhanced_analyzer:
            self.visual_analyzer = EnhancedVisualAnalyzer()
        else:
            self.visual_analyzer = VisualAnalyzer()

        self.summarizer = Summarizer()

        self.supported_formats = [".mp4", ".avi", ".mov", ".mkv", ".webm"]

    def process_video(self, video_path: str) -> Dict[str, Any]:
        """
        Process a video file and extract information.

        Args:
            video_path: Path to the video file

        Returns:
            Dictionary containing processed information:
            - transcription: Full transcription of spoken content
            - visual_elements: Detected UI/UX elements
            - summary: Comprehensive summary of video content
            - metadata: Video metadata (duration, resolution, etc.)
        """
        logger.info(f"Processing video: {video_path}")

        # Validate video file
        video_path = Path(video_path)
        if not self._validate_video(video_path):
            raise ValueError(f"Invalid video file: {video_path}")

        # Extract video metadata
        metadata = self._extract_metadata(video_path)
        logger.info(f"Video metadata: {metadata}")

        # Transcribe audio
        transcription = self.transcriber.transcribe(video_path)
        logger.info(f"Transcription complete: {len(transcription)} characters")

        # Analyze visual elements
        visual_analysis = self.visual_analyzer.analyze(video_path)

        # Handle different output formats from different analyzers
        if isinstance(visual_analysis, dict):
            # Enhanced analyzer returns a dictionary with multiple sections
            visual_elements = visual_analysis.get("visual_elements", [])
            screen_flow = visual_analysis.get("screen_flow", {})
            heatmap = visual_analysis.get("heatmap", {})

            logger.info(f"Enhanced visual analysis complete")
            logger.info(f"Detected {len(visual_elements.get('text_content', []))} text elements")
            logger.info(f"Detected {sum(visual_elements.get('ui_element_counts', {}).values())} UI elements")
            logger.info(f"Detected {len(screen_flow.get('screens', []))} unique screens")
        else:
            # Basic analyzer returns a list of elements
            visual_elements = visual_analysis
            screen_flow = {}
            heatmap = {}

            logger.info(f"Basic visual analysis complete: {len(visual_elements)} elements detected")

        # Generate summary
        summary = self.summarizer.summarize(
            transcription=transcription,
            visual_elements=visual_elements,
            metadata=metadata,
            screen_flow=screen_flow if screen_flow else None,
            heatmap=heatmap if heatmap else None
        )
        logger.info("Summary generation complete")

        result = {
            "transcription": transcription,
            "visual_elements": visual_elements,
            "summary": summary,
            "metadata": metadata
        }

        # Add enhanced analysis results if available
        if screen_flow:
            result["screen_flow"] = screen_flow

        if heatmap:
            result["heatmap"] = heatmap

        return result

    def _validate_video(self, video_path: Path) -> bool:
        """
        Validate that the file is a supported video format and can be opened.

        Args:
            video_path: Path to the video file

        Returns:
            True if valid, False otherwise
        """
        if not video_path.exists():
            logger.error(f"Video file does not exist: {video_path}")
            return False

        if video_path.suffix.lower() not in self.supported_formats:
            logger.error(f"Unsupported video format: {video_path.suffix}")
            return False

        try:
            # Try to open the video file
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                logger.error(f"Failed to open video file: {video_path}")
                return False
            cap.release()
            return True
        except Exception as e:
            logger.error(f"Error validating video file: {e}")
            return False

    def _extract_metadata(self, video_path: Path) -> Dict[str, Any]:
        """
        Extract metadata from the video file.

        Args:
            video_path: Path to the video file

        Returns:
            Dictionary containing video metadata
        """
        try:
            cap = cv2.VideoCapture(str(video_path))

            # Get basic properties
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            # Calculate duration
            duration_seconds = frame_count / fps if fps > 0 else 0

            cap.release()

            # Get file size
            file_size_bytes = video_path.stat().st_size
            file_size_mb = file_size_bytes / (1024 * 1024)

            return {
                "filename": video_path.name,
                "format": video_path.suffix.lower()[1:],
                "width": width,
                "height": height,
                "fps": fps,
                "frame_count": frame_count,
                "duration_seconds": duration_seconds,
                "file_size_mb": file_size_mb
            }
        except Exception as e:
            logger.error(f"Error extracting video metadata: {e}")
            return {
                "filename": video_path.name,
                "format": video_path.suffix.lower()[1:],
                "error": str(e)
            }
