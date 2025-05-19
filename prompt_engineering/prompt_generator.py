"""
Module for generating structured AI prompts.
"""

import logging
from typing import Dict, List, Any

from utils.openrouter_client import OpenRouterClient
from prompt_engineering.requirement_extractor import RequirementExtractor
from prompt_engineering.specification_formatter import SpecificationFormatter
import config

logger = logging.getLogger(__name__)

class PromptGenerator:
    """
    Class for generating structured AI prompts based on video analysis.
    """
    
    def __init__(self):
        """Initialize the PromptGenerator."""
        self.ai_client = OpenRouterClient()
        self.requirement_extractor = RequirementExtractor()
        self.spec_formatter = SpecificationFormatter()
    
    def generate_specification(self, video_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a software specification from video analysis.
        
        Args:
            video_analysis: Dictionary containing video analysis results
            
        Returns:
            Dictionary containing the generated specification
        """
        logger.info("Generating software specification from video analysis")
        
        # Extract requirements
        requirements = self.requirement_extractor.extract_requirements(video_analysis)
        logger.info(f"Extracted {len(requirements)} requirements")
        
        # Generate specification prompt
        prompt = self._create_specification_prompt(video_analysis, requirements)
        
        # Process with AI
        specification_text = self._process_with_ai(prompt)
        
        # Format the specification
        formatted_specification = self.spec_formatter.format_specification(specification_text)
        
        return formatted_specification
    
    def _create_specification_prompt(self, 
                                    video_analysis: Dict[str, Any], 
                                    requirements: Dict[str, List[str]]) -> str:
        """
        Create a prompt for generating a software specification.
        
        Args:
            video_analysis: Dictionary containing video analysis results
            requirements: Extracted requirements
            
        Returns:
            Formatted prompt for AI processing
        """
        # Extract relevant information from video analysis
        transcription = video_analysis.get("transcription", "")
        summary = video_analysis.get("summary", {})
        
        # Format requirements for the prompt
        requirements_text = ""
        for req_type, req_list in requirements.items():
            requirements_text += f"\n{req_type.upper()} REQUIREMENTS:\n"
            for i, req in enumerate(req_list, 1):
                requirements_text += f"{i}. {req}\n"
        
        # Create the prompt
        prompt = f"""
{config.SPEC_GENERATION_PROMPT}

VIDEO SUMMARY:
{summary.get("full_text", "")}

EXTRACTED REQUIREMENTS:
{requirements_text}

Based on the above information, create a comprehensive software specification document that includes:

1. Overview and Purpose:
   - What is this software?
   - What problem does it solve?
   - Who are the target users?

2. Functional Requirements:
   - What specific functions should the software perform?
   - What are the user interactions and expected outcomes?

3. Non-functional Requirements:
   - Performance expectations
   - Security considerations
   - Scalability requirements
   - Usability requirements

4. User Stories:
   - As a [user type], I want to [action] so that [benefit]
   - Include acceptance criteria for each story

5. Data Models:
   - What data entities exist in the system?
   - What are their attributes and relationships?
   - Include a simple ER diagram description

6. API Endpoints (if applicable):
   - What endpoints should the system expose?
   - What are the request/response formats?

7. UI/UX Specifications:
   - Describe key screens and their components
   - Explain user flows between screens
   - Note any specific design requirements

8. Technical Constraints and Considerations:
   - Any specific technologies to use or avoid
   - Integration requirements
   - Deployment considerations

Format your response as a structured specification document that could be used by developers to implement this software.
"""
        return prompt
    
    def _process_with_ai(self, prompt: str) -> str:
        """
        Process the prompt with AI to generate a specification.
        
        Args:
            prompt: Formatted prompt
            
        Returns:
            AI-generated specification text
        """
        try:
            logger.info("Sending prompt to AI for specification generation")
            response = self.ai_client.generate_completion(
                prompt=prompt,
                system_prompt=config.SYSTEM_PROMPT_TEMPLATE.format(
                    task_type="create detailed software specifications from video analysis"
                ),
                max_tokens=4000
            )
            return response
        except Exception as e:
            logger.error(f"Error generating specification with AI: {e}")
            return "Error generating specification. Please try again."
