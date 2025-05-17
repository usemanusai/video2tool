"""
Module for extracting software requirements from video analysis.
"""

import logging
import re
from typing import Dict, List, Any

from utils.openrouter_client import OpenRouterClient
import config

logger = logging.getLogger(__name__)

class RequirementExtractor:
    """
    Class for extracting software requirements from video analysis.
    """
    
    def __init__(self):
        """Initialize the RequirementExtractor."""
        self.ai_client = OpenRouterClient()
    
    def extract_requirements(self, video_analysis: Dict[str, Any]) -> Dict[str, List[str]]:
        """
        Extract software requirements from video analysis.
        
        Args:
            video_analysis: Dictionary containing video analysis results
            
        Returns:
            Dictionary of requirement types and their lists
        """
        logger.info("Extracting software requirements from video analysis")
        
        # Create prompt for requirement extraction
        prompt = self._create_extraction_prompt(video_analysis)
        
        # Process with AI
        extraction_text = self._process_with_ai(prompt)
        
        # Parse the extraction results
        requirements = self._parse_requirements(extraction_text)
        
        return requirements
    
    def _create_extraction_prompt(self, video_analysis: Dict[str, Any]) -> str:
        """
        Create a prompt for extracting requirements.
        
        Args:
            video_analysis: Dictionary containing video analysis results
            
        Returns:
            Formatted prompt for AI processing
        """
        # Extract relevant information from video analysis
        transcription = video_analysis.get("transcription", "")
        summary = video_analysis.get("summary", {})
        
        # Create the prompt
        prompt = f"""
I need you to extract software requirements from the following video analysis.

VIDEO SUMMARY:
{summary.get("full_text", "")}

Based on this information, identify and list the following types of requirements:

1. Functional Requirements:
   - What specific functions should the software perform?
   - What features must be included?
   - What user interactions are necessary?

2. Non-functional Requirements:
   - Performance expectations
   - Security considerations
   - Usability requirements
   - Scalability needs

3. UI/UX Requirements:
   - Interface components needed
   - Layout considerations
   - User flow requirements
   - Visual design elements

4. Data Requirements:
   - What data must be stored?
   - What data relationships exist?
   - Data validation rules
   - Data processing needs

5. Technical Requirements:
   - Specific technologies or frameworks
   - Integration requirements
   - Deployment considerations
   - Development constraints

Format your response as a structured list under each category. Be specific and detailed.
For each requirement, provide a clear, actionable statement that could be used by developers.
"""
        return prompt
    
    def _process_with_ai(self, prompt: str) -> str:
        """
        Process the prompt with AI to extract requirements.
        
        Args:
            prompt: Formatted prompt
            
        Returns:
            AI-generated extraction text
        """
        try:
            logger.info("Sending prompt to AI for requirement extraction")
            response = self.ai_client.generate_completion(
                prompt=prompt,
                system_prompt=config.SYSTEM_PROMPT_TEMPLATE.format(
                    task_type="extract software requirements from video analysis"
                ),
                max_tokens=2000
            )
            return response
        except Exception as e:
            logger.error(f"Error extracting requirements with AI: {e}")
            return "Error extracting requirements. Please try again."
    
    def _parse_requirements(self, extraction_text: str) -> Dict[str, List[str]]:
        """
        Parse the AI-generated text into structured requirements.
        
        Args:
            extraction_text: AI-generated extraction text
            
        Returns:
            Dictionary of requirement types and their lists
        """
        requirements = {
            "functional": [],
            "non_functional": [],
            "ui_ux": [],
            "data": [],
            "technical": []
        }
        
        # Define patterns to identify requirement sections
        section_patterns = {
            "functional": r"(?i)functional\s+requirements?:?",
            "non_functional": r"(?i)non.?functional\s+requirements?:?",
            "ui_ux": r"(?i)(ui|ux|ui\/ux|user\s+interface)\s+requirements?:?",
            "data": r"(?i)data\s+requirements?:?",
            "technical": r"(?i)technical\s+requirements?:?"
        }
        
        # Split text into lines
        lines = extraction_text.split("\n")
        
        # Process lines
        current_section = None
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if this is a section header
            for section, pattern in section_patterns.items():
                if re.match(pattern, line):
                    current_section = section
                    break
            
            # If we're in a section and this line looks like a requirement
            if current_section and (line.startswith("-") or re.match(r"^\d+\.", line)):
                # Clean up the requirement text
                requirement = re.sub(r"^[-\d\.]+\s*", "", line).strip()
                if requirement:
                    requirements[current_section].append(requirement)
        
        return requirements
