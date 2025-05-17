"""
Module for analyzing visual elements in videos.
"""

import os
import logging
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Tuple

import cv2
import numpy as np
import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)

class VisualAnalyzer:
    """
    Class for analyzing visual elements in videos.
    
    Detects UI components, text, and other visual elements.
    """
    
    def __init__(self, 
                 sample_rate: int = 1,  # Sample every n seconds
                 confidence_threshold: float = 0.6):
        """
        Initialize the VisualAnalyzer.
        
        Args:
            sample_rate: How often to sample frames (in seconds)
            confidence_threshold: Minimum confidence for element detection
        """
        self.sample_rate = sample_rate
        self.confidence_threshold = confidence_threshold
    
    def analyze(self, video_path: Path) -> List[Dict[str, Any]]:
        """
        Analyze visual elements in a video.
        
        Args:
            video_path: Path to the video file
            
        Returns:
            List of detected visual elements with metadata
        """
        logger.info(f"Analyzing visual elements in: {video_path}")
        
        # Extract frames from video
        frames = self._extract_frames(video_path)
        logger.info(f"Extracted {len(frames)} frames for analysis")
        
        # Process each frame
        visual_elements = []
        for i, (timestamp, frame) in enumerate(frames):
            logger.info(f"Processing frame {i+1}/{len(frames)} at {timestamp:.2f}s")
            
            # Detect UI elements
            ui_elements = self._detect_ui_elements(frame)
            
            # Extract text
            text_elements = self._extract_text(frame)
            
            # Combine results
            frame_elements = {
                "timestamp": timestamp,
                "ui_elements": ui_elements,
                "text_elements": text_elements
            }
            
            visual_elements.append(frame_elements)
        
        # Aggregate results across frames
        aggregated_elements = self._aggregate_elements(visual_elements)
        
        return aggregated_elements
    
    def _extract_frames(self, video_path: Path) -> List[Tuple[float, np.ndarray]]:
        """
        Extract frames from the video at regular intervals.
        
        Args:
            video_path: Path to the video file
            
        Returns:
            List of (timestamp, frame) tuples
        """
        frames = []
        
        try:
            cap = cv2.VideoCapture(str(video_path))
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps
            
            # Calculate frame indices to sample
            sample_interval = int(fps * self.sample_rate)
            frame_indices = range(0, frame_count, sample_interval)
            
            for frame_idx in frame_indices:
                # Set position
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                
                # Read frame
                ret, frame = cap.read()
                if not ret:
                    continue
                
                # Calculate timestamp
                timestamp = frame_idx / fps
                
                frames.append((timestamp, frame))
            
            cap.release()
            
        except Exception as e:
            logger.error(f"Error extracting frames: {e}")
            if 'cap' in locals():
                cap.release()
        
        return frames
    
    def _detect_ui_elements(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect UI elements in a frame.
        
        Args:
            frame: Video frame as numpy array
            
        Returns:
            List of detected UI elements
        """
        ui_elements = []
        
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Apply edge detection
            edges = cv2.Canny(gray, 50, 150)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Process contours
            for contour in contours:
                # Filter small contours
                if cv2.contourArea(contour) < 100:
                    continue
                
                # Get bounding box
                x, y, w, h = cv2.boundingRect(contour)
                
                # Classify element type (simplified)
                element_type = self._classify_ui_element(frame[y:y+h, x:x+w])
                
                ui_elements.append({
                    "type": element_type,
                    "position": {"x": x, "y": y, "width": w, "height": h},
                    "confidence": 0.7  # Placeholder confidence
                })
        
        except Exception as e:
            logger.error(f"Error detecting UI elements: {e}")
        
        return ui_elements
    
    def _classify_ui_element(self, element_image: np.ndarray) -> str:
        """
        Classify a UI element based on its appearance.
        
        Args:
            element_image: Image of the UI element
            
        Returns:
            Element type classification
        """
        # This is a simplified placeholder implementation
        # In a real implementation, this would use a trained model
        
        h, w = element_image.shape[:2]
        aspect_ratio = w / h
        
        if aspect_ratio > 5:
            return "text_field"
        elif aspect_ratio < 0.5:
            return "scrollbar"
        elif 0.9 < aspect_ratio < 1.1:
            return "button"
        else:
            return "container"
    
    def _extract_text(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Extract text from a frame using OCR.
        
        Args:
            frame: Video frame as numpy array
            
        Returns:
            List of detected text elements
        """
        text_elements = []
        
        try:
            # Convert to PIL Image
            pil_image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            
            # Use pytesseract for OCR
            ocr_data = pytesseract.image_to_data(pil_image, output_type=pytesseract.Output.DICT)
            
            # Process OCR results
            for i in range(len(ocr_data["text"])):
                # Filter empty text and low confidence
                if int(ocr_data["conf"][i]) < 60 or not ocr_data["text"][i].strip():
                    continue
                
                text_elements.append({
                    "text": ocr_data["text"][i],
                    "position": {
                        "x": ocr_data["left"][i],
                        "y": ocr_data["top"][i],
                        "width": ocr_data["width"][i],
                        "height": ocr_data["height"][i]
                    },
                    "confidence": int(ocr_data["conf"][i]) / 100
                })
        
        except Exception as e:
            logger.error(f"Error extracting text: {e}")
        
        return text_elements
    
    def _aggregate_elements(self, frame_elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Aggregate elements across frames to identify persistent UI components.
        
        Args:
            frame_elements: List of elements detected in each frame
            
        Returns:
            Aggregated list of visual elements
        """
        # This is a simplified implementation
        # A real implementation would use more sophisticated tracking and merging
        
        # Group elements by type
        ui_elements_by_type = {}
        text_content = set()
        
        for frame in frame_elements:
            # Process UI elements
            for ui_element in frame["ui_elements"]:
                element_type = ui_element["type"]
                if element_type not in ui_elements_by_type:
                    ui_elements_by_type[element_type] = []
                ui_elements_by_type[element_type].append(ui_element)
            
            # Process text elements
            for text_element in frame["text_elements"]:
                text_content.add(text_element["text"])
        
        # Count element types
        ui_element_counts = {
            element_type: len(elements)
            for element_type, elements in ui_elements_by_type.items()
        }
        
        # Create aggregated result
        return [
            {
                "ui_element_counts": ui_element_counts,
                "text_content": list(text_content),
                "frame_count": len(frame_elements)
            }
        ]
