"""
Module for summarizing video content.
"""

import logging
from typing import Dict, List, Any, Union, Optional

from utils.openrouter_client import OpenRouterClient
import config

logger = logging.getLogger(__name__)

class Summarizer:
    """
    Class for summarizing video content based on transcription and visual analysis.
    """

    def __init__(self):
        """Initialize the Summarizer."""
        self.ai_client = OpenRouterClient()

    def summarize(self,
                  transcription: str,
                  visual_elements: Union[List[Dict[str, Any]], Dict[str, Any]],
                  metadata: Dict[str, Any],
                  screen_flow: Optional[Dict[str, Any]] = None,
                  heatmap: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate a comprehensive summary of video content.

        Args:
            transcription: Transcribed text from the video
            visual_elements: Detected visual elements
            metadata: Video metadata
            screen_flow: Screen flow analysis (optional)
            heatmap: Interaction heatmap data (optional)

        Returns:
            Dictionary containing summary information
        """
        logger.info("Generating video content summary")

        # Prepare input for AI processing
        prompt = self._create_summary_prompt(
            transcription,
            visual_elements,
            metadata,
            screen_flow,
            heatmap
        )

        # Process with AI
        summary_text = self._process_with_ai(prompt)

        # Extract structured information
        structured_summary = self._structure_summary(summary_text)

        return structured_summary

    def _create_summary_prompt(self,
                              transcription: str,
                              visual_elements: Union[List[Dict[str, Any]], Dict[str, Any]],
                              metadata: Dict[str, Any],
                              screen_flow: Optional[Dict[str, Any]] = None,
                              heatmap: Optional[Dict[str, Any]] = None) -> str:
        """
        Create a prompt for the AI to summarize the video content.

        Args:
            transcription: Transcribed text from the video
            visual_elements: Detected visual elements
            metadata: Video metadata
            screen_flow: Screen flow analysis (optional)
            heatmap: Interaction heatmap data (optional)

        Returns:
            Formatted prompt for AI processing
        """
        # Format visual elements for the prompt
        visual_elements_text = ""

        # Handle different formats of visual_elements
        if isinstance(visual_elements, dict):
            # Enhanced analyzer format
            if "ui_element_counts" in visual_elements:
                ui_counts = visual_elements["ui_element_counts"]
                visual_elements_text += "UI Elements:\n"
                for element_type, count in ui_counts.items():
                    visual_elements_text += f"- {element_type}: {count} instances\n"

            if "text_content" in visual_elements:
                text_content = visual_elements["text_content"]
                visual_elements_text += "\nDetected Text:\n"
                for text in text_content[:20]:  # Limit to first 20 text elements
                    visual_elements_text += f"- \"{text}\"\n"
                if len(text_content) > 20:
                    visual_elements_text += f"- ... and {len(text_content) - 20} more text elements\n"

            if "screen_types" in visual_elements:
                screen_types = visual_elements["screen_types"]
                visual_elements_text += "\nDetected Screen Types:\n"
                for screen_type, count in screen_types.items():
                    visual_elements_text += f"- {screen_type}: {count} occurrences\n"

            if "persistent_elements" in visual_elements:
                persistent_elements = visual_elements["persistent_elements"]
                visual_elements_text += "\nPersistent UI Elements:\n"
                for element_type, clusters in persistent_elements.items():
                    for i, cluster in enumerate(clusters):
                        stability = cluster.get("stability", 0) * 100
                        visual_elements_text += f"- {element_type} #{i+1}: {stability:.1f}% stability\n"
        else:
            # Basic analyzer format (list of element sets)
            for element_set in visual_elements:
                if "ui_element_counts" in element_set:
                    ui_counts = element_set["ui_element_counts"]
                    visual_elements_text += "UI Elements:\n"
                    for element_type, count in ui_counts.items():
                        visual_elements_text += f"- {element_type}: {count} instances\n"

                if "text_content" in element_set:
                    text_content = element_set["text_content"]
                    visual_elements_text += "\nDetected Text:\n"
                    for text in text_content[:20]:  # Limit to first 20 text elements
                        visual_elements_text += f"- \"{text}\"\n"
                    if len(text_content) > 20:
                        visual_elements_text += f"- ... and {len(text_content) - 20} more text elements\n"

        # Format metadata
        metadata_text = "Video Metadata:\n"
        for key, value in metadata.items():
            metadata_text += f"- {key}: {value}\n"

        # Format screen flow information if available
        screen_flow_text = ""
        if screen_flow and isinstance(screen_flow, dict):
            screen_flow_text += "\nScreen Flow Analysis:\n"

            # Add screen information
            if "screens" in screen_flow and screen_flow["screens"]:
                screen_flow_text += "Detected Screens:\n"
                for screen in screen_flow["screens"]:
                    screen_type = screen.get("type", "unknown")
                    avg_duration = screen.get("avg_duration", 0)
                    screen_flow_text += f"- {screen_type}: avg. {avg_duration:.1f}s duration\n"

            # Add common paths
            if "common_paths" in screen_flow and screen_flow["common_paths"]:
                screen_flow_text += "\nCommon Navigation Paths:\n"
                for path in screen_flow["common_paths"][:5]:  # Limit to top 5
                    path_str = path.get("path", "")
                    count = path.get("count", 0)
                    screen_flow_text += f"- {path_str}: {count} occurrences\n"

        # Format heatmap information if available
        heatmap_text = ""
        if heatmap and isinstance(heatmap, dict):
            heatmap_text += "\nInteraction Hotspots:\n"

            # Add hotspot information
            if "hotspots" in heatmap and heatmap["hotspots"]:
                for i, hotspot in enumerate(heatmap["hotspots"][:5]):  # Limit to top 5
                    x = hotspot.get("x", 0)
                    y = hotspot.get("y", 0)
                    intensity = hotspot.get("intensity", 0)
                    heatmap_text += f"- Hotspot #{i+1}: position ({x}, {y}), intensity {intensity}\n"

        # Create the prompt
        prompt = f"""
{config.VIDEO_ANALYSIS_PROMPT}

VIDEO METADATA:
{metadata_text}

TRANSCRIPTION:
{transcription[:4000]}...  # Truncated for brevity

VISUAL ELEMENTS:
{visual_elements_text}
{screen_flow_text}
{heatmap_text}

Based on the above information, provide a comprehensive analysis of the software shown in this video.
Focus specifically on:

1. User Interface Components:
   - What UI elements are visible (buttons, forms, navigation, etc.)?
   - How are they arranged and what is their purpose?

2. User Workflows:
   - What tasks can users perform with this software?
   - What is the sequence of steps for key workflows?
   - What is the navigation flow between different screens?

3. Data Structures:
   - What types of data does the software handle?
   - How is data organized and related?

4. System Architecture:
   - What components or modules make up the system?
   - How do they interact with each other?

5. Key Features:
   - What are the main capabilities of the software?
   - What problems does it solve for users?

Format your response as a structured analysis that could be used by developers to understand and recreate this software.
"""
        return prompt

    def _process_with_ai(self, prompt: str) -> str:
        """
        Process the prompt with AI to generate a summary.

        Args:
            prompt: Formatted prompt

        Returns:
            AI-generated summary text
        """
        try:
            logger.info("Sending prompt to AI for summary generation")
            response = self.ai_client.generate_completion(
                prompt=prompt,
                system_prompt=config.SYSTEM_PROMPT_TEMPLATE.format(
                    task_type="analyze video content and extract software specifications"
                ),
                max_tokens=2000
            )
            return response
        except Exception as e:
            logger.error(f"Error generating summary with AI: {e}")
            return "Error generating summary. Please try again."

    def _structure_summary(self, summary_text: str) -> Dict[str, Any]:
        """
        Convert the AI-generated summary into a structured format.

        Args:
            summary_text: AI-generated summary text

        Returns:
            Structured summary as a dictionary
        """
        # This is a simplified implementation
        # A more sophisticated version would parse the AI output more carefully

        # Split the summary into sections based on headings
        sections = {}
        current_section = "overview"
        sections[current_section] = []

        for line in summary_text.split("\n"):
            line = line.strip()
            if not line:
                continue

            # Check if this is a heading
            if line.startswith("#") or (line.isupper() and len(line) < 50):
                current_section = line.lower().strip("#").strip().replace(" ", "_")
                sections[current_section] = []
            else:
                sections[current_section].append(line)

        # Convert lists of lines to text blocks
        for section, lines in sections.items():
            sections[section] = "\n".join(lines)

        # Add the full text as well
        sections["full_text"] = summary_text

        return sections
