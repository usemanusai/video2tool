"""
Enhanced module for analyzing visual elements in videos.

This module provides improved UI element detection, screen flow analysis,
and heatmap generation capabilities.
"""

import os
import logging
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict

import cv2
import numpy as np
import pytesseract
from PIL import Image
from sklearn.cluster import DBSCAN

logger = logging.getLogger(__name__)

class EnhancedVisualAnalyzer:
    """
    Enhanced class for analyzing visual elements in videos.

    Features:
    - Improved UI element detection using template matching and contour analysis
    - Screen flow analysis to detect navigation patterns
    - Heatmap generation for interaction hotspots
    """

    def __init__(self,
                 sample_rate: int = 1,  # Sample every n seconds
                 confidence_threshold: float = 0.6,
                 template_dir: Optional[str] = None):
        """
        Initialize the EnhancedVisualAnalyzer.

        Args:
            sample_rate: How often to sample frames (in seconds)
            confidence_threshold: Minimum confidence for element detection
            template_dir: Directory containing UI element templates
        """
        self.sample_rate = sample_rate
        self.confidence_threshold = confidence_threshold
        self.template_dir = Path(template_dir) if template_dir else None

        # Load UI element templates if directory is provided
        self.templates = {}
        if self.template_dir and self.template_dir.exists():
            self._load_templates()

        # Initialize screen flow tracking
        self.screen_transitions = []
        self.previous_screen = None

        # Initialize interaction heatmap
        self.interaction_points = []

    def analyze(self, video_path: Path) -> Dict[str, Any]:
        """
        Analyze visual elements in a video.

        Args:
            video_path: Path to the video file

        Returns:
            Dictionary containing detected visual elements, screen flow, and heatmap
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

            # Detect screen type
            screen_type = self._detect_screen_type(frame, ui_elements, text_elements)

            # Track screen flow
            self._track_screen_flow(timestamp, screen_type, frame)

            # Track potential interaction points
            self._track_interaction_points(ui_elements)

            # Combine results
            frame_elements = {
                "timestamp": timestamp,
                "ui_elements": ui_elements,
                "text_elements": text_elements,
                "screen_type": screen_type
            }

            visual_elements.append(frame_elements)

        # Aggregate results across frames
        aggregated_elements = self._aggregate_elements(visual_elements)

        # Generate screen flow analysis
        screen_flow = self._analyze_screen_flow()

        # Generate interaction heatmap
        heatmap = self._generate_heatmap(frames[0][1].shape[:2] if frames else (720, 1280))

        return {
            "visual_elements": aggregated_elements,
            "screen_flow": screen_flow,
            "heatmap": heatmap
        }

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

    def _load_templates(self):
        """Load UI element templates from the template directory."""
        if not self.template_dir:
            return

        try:
            # Load templates for common UI elements
            ui_element_types = ["button", "checkbox", "dropdown", "text_field", "toggle", "slider"]

            for element_type in ui_element_types:
                element_dir = self.template_dir / element_type
                if not element_dir.exists():
                    continue

                self.templates[element_type] = []

                for template_file in element_dir.glob("*.png"):
                    template = cv2.imread(str(template_file), cv2.IMREAD_GRAYSCALE)
                    if template is not None:
                        self.templates[element_type].append(template)

            logger.info(f"Loaded {sum(len(templates) for templates in self.templates.values())} UI element templates")

        except Exception as e:
            logger.error(f"Error loading templates: {e}")

    def _detect_ui_elements(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect UI elements in a frame using multiple techniques.

        Args:
            frame: Video frame as numpy array

        Returns:
            List of detected UI elements
        """
        ui_elements = []

        try:
            # Convert to grayscale
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # Method 1: Template matching (if templates are available)
            if self.templates:
                template_elements = self._detect_with_templates(gray)
                ui_elements.extend(template_elements)

            # Method 2: Contour detection
            contour_elements = self._detect_with_contours(gray, frame)

            # Method 3: Color-based segmentation for buttons and UI elements
            color_elements = self._detect_with_color_segmentation(frame)

            # Merge results and remove duplicates
            all_elements = ui_elements + contour_elements + color_elements
            ui_elements = self._remove_duplicate_elements(all_elements)

        except Exception as e:
            logger.error(f"Error detecting UI elements: {e}")

        return ui_elements

    def _detect_with_templates(self, gray_frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect UI elements using template matching.

        Args:
            gray_frame: Grayscale frame

        Returns:
            List of detected UI elements
        """
        elements = []

        for element_type, templates in self.templates.items():
            for template in templates:
                # Apply template matching
                result = cv2.matchTemplate(gray_frame, template, cv2.TM_CCOEFF_NORMED)

                # Find matches above threshold
                locations = np.where(result >= self.confidence_threshold)

                for pt in zip(*locations[::-1]):
                    # Get template dimensions
                    w, h = template.shape[::-1]

                    elements.append({
                        "type": element_type,
                        "position": {"x": pt[0], "y": pt[1], "width": w, "height": h},
                        "confidence": float(result[pt[1], pt[0]]),
                        "detection_method": "template_matching"
                    })

        return elements

    def _detect_with_contours(self, gray_frame: np.ndarray, color_frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect UI elements using contour detection.

        Args:
            gray_frame: Grayscale frame
            color_frame: Color frame

        Returns:
            List of detected UI elements
        """
        elements = []

        # Apply edge detection
        edges = cv2.Canny(gray_frame, 50, 150)

        # Apply morphological operations to connect edges
        kernel = np.ones((3, 3), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=1)
        edges = cv2.erode(edges, kernel, iterations=1)

        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Process contours
        for contour in contours:
            # Filter small contours
            if cv2.contourArea(contour) < 100:
                continue

            # Get bounding box
            x, y, w, h = cv2.boundingRect(contour)

            # Extract the region
            roi = color_frame[y:y+h, x:x+w]

            # Classify element type
            element_type, confidence = self._classify_ui_element(roi)

            if confidence >= self.confidence_threshold:
                elements.append({
                    "type": element_type,
                    "position": {"x": x, "y": y, "width": w, "height": h},
                    "confidence": confidence,
                    "detection_method": "contour_detection"
                })

        return elements

    def _detect_with_color_segmentation(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect UI elements using color-based segmentation.

        Args:
            frame: Color frame

        Returns:
            List of detected UI elements
        """
        elements = []

        try:
            # Convert to HSV color space
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

            # Define color ranges for common UI elements
            # Blue buttons/elements
            lower_blue = np.array([100, 50, 50])
            upper_blue = np.array([140, 255, 255])
            blue_mask = cv2.inRange(hsv, lower_blue, upper_blue)

            # Green buttons/elements
            lower_green = np.array([40, 50, 50])
            upper_green = np.array([80, 255, 255])
            green_mask = cv2.inRange(hsv, lower_green, upper_green)

            # Red buttons/elements (two ranges due to how hue wraps around)
            lower_red1 = np.array([0, 50, 50])
            upper_red1 = np.array([10, 255, 255])
            red_mask1 = cv2.inRange(hsv, lower_red1, upper_red1)

            lower_red2 = np.array([170, 50, 50])
            upper_red2 = np.array([180, 255, 255])
            red_mask2 = cv2.inRange(hsv, lower_red2, upper_red2)

            red_mask = cv2.bitwise_or(red_mask1, red_mask2)

            # Combine masks
            combined_mask = cv2.bitwise_or(blue_mask, green_mask)
            combined_mask = cv2.bitwise_or(combined_mask, red_mask)

            # Apply morphological operations
            kernel = np.ones((5, 5), np.uint8)
            combined_mask = cv2.dilate(combined_mask, kernel, iterations=1)
            combined_mask = cv2.erode(combined_mask, kernel, iterations=1)

            # Find contours
            contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            # Process contours
            for contour in contours:
                # Filter small contours
                if cv2.contourArea(contour) < 100:
                    continue

                # Get bounding box
                x, y, w, h = cv2.boundingRect(contour)

                # Determine color
                roi = frame[y:y+h, x:x+w]
                hsv_roi = hsv[y:y+h, x:x+w]

                # Check which color mask has the most pixels in this region
                blue_count = cv2.countNonZero(cv2.bitwise_and(blue_mask[y:y+h, x:x+w], blue_mask[y:y+h, x:x+w]))
                green_count = cv2.countNonZero(cv2.bitwise_and(green_mask[y:y+h, x:x+w], green_mask[y:y+h, x:x+w]))
                red_count = cv2.countNonZero(cv2.bitwise_and(red_mask[y:y+h, x:x+w], red_mask[y:y+h, x:x+w]))

                color = "unknown"
                if blue_count > green_count and blue_count > red_count:
                    color = "blue"
                elif green_count > blue_count and green_count > red_count:
                    color = "green"
                elif red_count > blue_count and red_count > green_count:
                    color = "red"

                # Classify based on shape and color
                element_type = "button" if (0.5 <= w/h <= 4.0) else "container"

                elements.append({
                    "type": element_type,
                    "color": color,
                    "position": {"x": x, "y": y, "width": w, "height": h},
                    "confidence": 0.7,  # Placeholder confidence
                    "detection_method": "color_segmentation"
                })

        except Exception as e:
            logger.error(f"Error in color segmentation: {e}")

        return elements

    def _classify_ui_element(self, element_image: np.ndarray) -> Tuple[str, float]:
        """
        Classify a UI element based on its appearance.

        Args:
            element_image: Image of the UI element

        Returns:
            Tuple of (element_type, confidence)
        """
        if element_image.size == 0:
            return "unknown", 0.0

        try:
            # Get dimensions
            h, w = element_image.shape[:2]
            aspect_ratio = w / h

            # Convert to grayscale if needed
            if len(element_image.shape) == 3:
                gray = cv2.cvtColor(element_image, cv2.COLOR_BGR2GRAY)
            else:
                gray = element_image

            # Calculate features
            mean_color = np.mean(element_image, axis=(0, 1)) if len(element_image.shape) == 3 else np.mean(element_image)
            std_color = np.std(element_image, axis=(0, 1)) if len(element_image.shape) == 3 else np.std(element_image)

            # Edge density
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.count_nonzero(edges) / (h * w) if h * w > 0 else 0

            # Classify based on features
            if aspect_ratio > 5:
                return "text_field", 0.8
            elif aspect_ratio < 0.5:
                return "scrollbar", 0.7
            elif 0.9 < aspect_ratio < 1.1 and edge_density > 0.1:
                return "button", 0.9
            elif edge_density < 0.05 and std_color < 30:
                return "container", 0.6
            elif 2.0 < aspect_ratio < 4.0 and edge_density > 0.2:
                return "dropdown", 0.7
            elif aspect_ratio < 0.3:
                return "slider", 0.6
            elif std_color > 50:
                return "image", 0.7
            else:
                return "container", 0.5

        except Exception as e:
            logger.error(f"Error classifying UI element: {e}")
            return "unknown", 0.5

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

    def _detect_screen_type(self, frame: np.ndarray, ui_elements: List[Dict[str, Any]],
                           text_elements: List[Dict[str, Any]]) -> str:
        """
        Detect the type of screen based on UI elements and text.

        Args:
            frame: Video frame
            ui_elements: Detected UI elements
            text_elements: Detected text elements

        Returns:
            Screen type classification
        """
        # Extract text content
        text_content = " ".join([element["text"].lower() for element in text_elements])

        # Count UI element types
        element_counts = defaultdict(int)
        for element in ui_elements:
            element_counts[element["type"]] += 1

        # Classify based on content and UI elements
        if "login" in text_content or "sign in" in text_content:
            return "login_screen"
        elif "register" in text_content or "sign up" in text_content:
            return "registration_screen"
        elif element_counts["text_field"] > 3 and "submit" in text_content:
            return "form_screen"
        elif element_counts["button"] > 5:
            return "menu_screen"
        elif "dashboard" in text_content or "overview" in text_content:
            return "dashboard_screen"
        elif element_counts["container"] > 5 and element_counts["button"] < 3:
            return "content_screen"
        elif element_counts["image"] > 3:
            return "gallery_screen"
        else:
            return "unknown_screen"

    def _track_screen_flow(self, timestamp: float, screen_type: str, frame: np.ndarray):
        """
        Track screen transitions for flow analysis.

        Args:
            timestamp: Frame timestamp
            screen_type: Detected screen type
            frame: Video frame
        """
        # If this is a new screen type or first screen
        if self.previous_screen is None or screen_type != self.previous_screen["type"]:
            # Save a thumbnail of the screen
            thumbnail = cv2.resize(frame, (160, 90))
            _, buffer = cv2.imencode(".jpg", thumbnail)
            thumbnail_bytes = buffer.tobytes()

            # Record the transition
            if self.previous_screen is not None:
                self.screen_transitions.append({
                    "from_screen": self.previous_screen["type"],
                    "to_screen": screen_type,
                    "from_timestamp": self.previous_screen["timestamp"],
                    "to_timestamp": timestamp,
                    "duration": timestamp - self.previous_screen["timestamp"]
                })

            # Update previous screen
            self.previous_screen = {
                "type": screen_type,
                "timestamp": timestamp,
                "thumbnail": thumbnail_bytes
            }

    def _track_interaction_points(self, ui_elements: List[Dict[str, Any]]):
        """
        Track potential interaction points for heatmap generation.

        Args:
            ui_elements: Detected UI elements
        """
        for element in ui_elements:
            if element["type"] in ["button", "checkbox", "dropdown", "text_field"]:
                pos = element["position"]
                center_x = pos["x"] + pos["width"] // 2
                center_y = pos["y"] + pos["height"] // 2

                self.interaction_points.append((center_x, center_y))

    def _remove_duplicate_elements(self, elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Remove duplicate UI elements based on position overlap.

        Args:
            elements: List of detected UI elements

        Returns:
            Deduplicated list of UI elements
        """
        if not elements:
            return []

        # Sort by confidence
        sorted_elements = sorted(elements, key=lambda x: x.get("confidence", 0), reverse=True)

        # Track processed elements
        result = []
        processed_regions = []

        for element in sorted_elements:
            pos = element["position"]
            current_rect = (pos["x"], pos["y"], pos["x"] + pos["width"], pos["y"] + pos["height"])

            # Check for overlap with processed regions
            is_duplicate = False
            for rect in processed_regions:
                # Calculate overlap
                overlap_x = max(0, min(current_rect[2], rect[2]) - max(current_rect[0], rect[0]))
                overlap_y = max(0, min(current_rect[3], rect[3]) - max(current_rect[1], rect[1]))
                overlap_area = overlap_x * overlap_y

                current_area = (current_rect[2] - current_rect[0]) * (current_rect[3] - current_rect[1])

                # If significant overlap, consider it a duplicate
                if current_area > 0 and overlap_area / current_area > 0.5:
                    is_duplicate = True
                    break

            if not is_duplicate:
                result.append(element)
                processed_regions.append(current_rect)

        return result

    def _aggregate_elements(self, frame_elements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Aggregate elements across frames to identify persistent UI components.

        Args:
            frame_elements: List of elements detected in each frame

        Returns:
            Aggregated visual elements data
        """
        # Count element types across all frames
        ui_element_counts = defaultdict(int)
        ui_element_positions = defaultdict(list)
        text_content = set()
        screen_types = defaultdict(int)

        for frame in frame_elements:
            # Process UI elements
            for ui_element in frame.get("ui_elements", []):
                element_type = ui_element["type"]
                ui_element_counts[element_type] += 1

                # Track positions for heatmap
                pos = ui_element["position"]
                center_x = pos["x"] + pos["width"] // 2
                center_y = pos["y"] + pos["height"] // 2
                ui_element_positions[element_type].append((center_x, center_y))

            # Process text elements
            for text_element in frame.get("text_elements", []):
                text_content.add(text_element["text"])

            # Track screen types
            screen_type = frame.get("screen_type", "unknown_screen")
            screen_types[screen_type] += 1

        # Find persistent UI elements (appear in multiple frames)
        persistent_elements = {}
        for element_type, positions in ui_element_positions.items():
            if len(positions) < 2:
                continue

            # Cluster positions to find stable elements
            if len(positions) >= 5:  # Need enough points for clustering
                try:
                    # Convert to numpy array
                    positions_array = np.array(positions)

                    # Apply DBSCAN clustering
                    clustering = DBSCAN(eps=20, min_samples=2).fit(positions_array)

                    # Count elements in each cluster
                    cluster_counts = defaultdict(int)
                    for label in clustering.labels_:
                        if label >= 0:  # Ignore noise points (label -1)
                            cluster_counts[label] += 1

                    # Add persistent elements (clusters with multiple points)
                    persistent_elements[element_type] = [
                        {"count": count, "stability": count / len(positions)}
                        for label, count in cluster_counts.items()
                        if count >= 2
                    ]
                except Exception as e:
                    logger.error(f"Error clustering element positions: {e}")

        # Create aggregated result
        return {
            "ui_element_counts": dict(ui_element_counts),
            "text_content": list(text_content),
            "screen_types": dict(screen_types),
            "persistent_elements": persistent_elements,
            "frame_count": len(frame_elements)
        }

    def _analyze_screen_flow(self) -> Dict[str, Any]:
        """
        Analyze screen flow to detect navigation patterns.

        Returns:
            Screen flow analysis data
        """
        if not self.screen_transitions:
            return {"transitions": [], "screens": []}

        # Count transitions between screen types
        transition_counts = defaultdict(int)
        for transition in self.screen_transitions:
            from_screen = transition["from_screen"]
            to_screen = transition["to_screen"]
            transition_key = f"{from_screen}->{to_screen}"
            transition_counts[transition_key] += 1

        # Identify common paths
        common_paths = [
            {"path": key, "count": count}
            for key, count in transition_counts.items()
            if count >= 2
        ]

        # Identify unique screens
        unique_screens = set()
        for transition in self.screen_transitions:
            unique_screens.add(transition["from_screen"])
            unique_screens.add(transition["to_screen"])

        # Calculate screen durations
        screen_durations = defaultdict(list)
        for transition in self.screen_transitions:
            screen_durations[transition["from_screen"]].append(transition["duration"])

        # Calculate average durations
        avg_durations = {}
        for screen, durations in screen_durations.items():
            avg_durations[screen] = sum(durations) / len(durations) if durations else 0

        return {
            "transitions": self.screen_transitions,
            "screens": [{"type": screen, "avg_duration": avg_durations.get(screen, 0)} for screen in unique_screens],
            "common_paths": common_paths
        }

    def _generate_heatmap(self, frame_size: Tuple[int, int]) -> Dict[str, Any]:
        """
        Generate a heatmap of interaction hotspots.

        Args:
            frame_size: Size of the video frame (height, width)

        Returns:
            Heatmap data
        """
        if not self.interaction_points:
            return {"heatmap": None, "hotspots": []}

        try:
            # Create a blank heatmap
            height, width = frame_size
            heatmap = np.zeros((height, width), dtype=np.uint8)

            # Add interaction points to the heatmap
            for x, y in self.interaction_points:
                if 0 <= x < width and 0 <= y < height:
                    # Add a Gaussian blob at each point
                    cv2.circle(heatmap, (x, y), 20, 255, -1)

            # Apply Gaussian blur to create a smooth heatmap
            heatmap = cv2.GaussianBlur(heatmap, (51, 51), 0)

            # Normalize the heatmap
            if np.max(heatmap) > 0:
                heatmap = (heatmap / np.max(heatmap) * 255).astype(np.uint8)

            # Apply a colormap
            heatmap_colored = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

            # Find hotspots (local maxima)
            hotspots = []
            threshold = 200  # Minimum intensity to be considered a hotspot
            for y in range(1, height - 1):
                for x in range(1, width - 1):
                    if heatmap[y, x] > threshold:
                        # Check if it's a local maximum
                        neighborhood = heatmap[y-1:y+2, x-1:x+2]
                        if heatmap[y, x] >= np.max(neighborhood):
                            intensity = int(heatmap[y, x])
                            hotspots.append({"x": x, "y": y, "intensity": intensity})

            # Sort hotspots by intensity
            hotspots = sorted(hotspots, key=lambda x: x["intensity"], reverse=True)

            # Limit to top 10 hotspots
            hotspots = hotspots[:10]

            # Encode the heatmap as base64
            _, buffer = cv2.imencode(".png", heatmap_colored)
            import base64
            heatmap_base64 = base64.b64encode(buffer).decode("utf-8")

            return {
                "heatmap": heatmap_base64,
                "hotspots": hotspots
            }

        except Exception as e:
            logger.error(f"Error generating heatmap: {e}")
            return {"heatmap": None, "hotspots": []}
