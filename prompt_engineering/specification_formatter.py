"""
Module for formatting software specifications.
"""

import logging
import re
import json
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class SpecificationFormatter:
    """
    Class for formatting software specifications into structured documents.
    """
    
    def __init__(self):
        """Initialize the SpecificationFormatter."""
        pass
    
    def format_specification(self, specification_text: str) -> Dict[str, Any]:
        """
        Format a specification text into a structured document.
        
        Args:
            specification_text: Raw specification text from AI
            
        Returns:
            Structured specification document
        """
        logger.info("Formatting software specification")
        
        # Parse the specification into sections
        sections = self._parse_sections(specification_text)
        
        # Extract structured data from sections
        structured_spec = self._extract_structured_data(sections)
        
        # Add the full text
        structured_spec["full_text"] = specification_text
        
        return structured_spec
    
    def _parse_sections(self, specification_text: str) -> Dict[str, str]:
        """
        Parse the specification text into sections.
        
        Args:
            specification_text: Raw specification text
            
        Returns:
            Dictionary of section names and their content
        """
        sections = {}
        current_section = "overview"
        sections[current_section] = []
        
        # Define patterns for section headers
        section_patterns = {
            "overview": r"(?i)(overview|introduction|purpose)",
            "functional_requirements": r"(?i)functional\s+requirements",
            "non_functional_requirements": r"(?i)non.?functional\s+requirements",
            "user_stories": r"(?i)user\s+stories",
            "data_models": r"(?i)(data\s+models|data\s+entities|database\s+schema)",
            "api_endpoints": r"(?i)(api\s+endpoints|api\s+specification|rest\s+api)",
            "ui_ux": r"(?i)(ui|ux|ui\/ux|user\s+interface)",
            "technical": r"(?i)(technical\s+constraints|technical\s+considerations)"
        }
        
        # Split text into lines
        lines = specification_text.split("\n")
        
        # Process lines
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if this is a section header
            is_header = False
            for section, pattern in section_patterns.items():
                if re.search(pattern, line, re.IGNORECASE) and (line.startswith("#") or line.isupper() or len(line) < 50):
                    current_section = section
                    sections[current_section] = []
                    is_header = True
                    break
            
            # If not a header, add to current section
            if not is_header:
                sections[current_section].append(line)
        
        # Convert lists of lines to text blocks
        for section, lines in sections.items():
            sections[section] = "\n".join(lines)
        
        return sections
    
    def _extract_structured_data(self, sections: Dict[str, str]) -> Dict[str, Any]:
        """
        Extract structured data from specification sections.
        
        Args:
            sections: Dictionary of section names and their content
            
        Returns:
            Structured specification data
        """
        structured_spec = {}
        
        # Process overview section
        if "overview" in sections:
            structured_spec["overview"] = {
                "text": sections["overview"],
                "summary": self._extract_first_paragraph(sections["overview"])
            }
        
        # Process functional requirements
        if "functional_requirements" in sections:
            structured_spec["functional_requirements"] = self._extract_list_items(sections["functional_requirements"])
        
        # Process non-functional requirements
        if "non_functional_requirements" in sections:
            structured_spec["non_functional_requirements"] = self._extract_list_items(sections["non_functional_requirements"])
        
        # Process user stories
        if "user_stories" in sections:
            structured_spec["user_stories"] = self._extract_user_stories(sections["user_stories"])
        
        # Process data models
        if "data_models" in sections:
            structured_spec["data_models"] = {
                "text": sections["data_models"],
                "entities": self._extract_data_entities(sections["data_models"])
            }
        
        # Process API endpoints
        if "api_endpoints" in sections:
            structured_spec["api_endpoints"] = self._extract_api_endpoints(sections["api_endpoints"])
        
        # Process UI/UX specifications
        if "ui_ux" in sections:
            structured_spec["ui_ux"] = {
                "text": sections["ui_ux"],
                "screens": self._extract_list_items(sections["ui_ux"])
            }
        
        # Process technical constraints
        if "technical" in sections:
            structured_spec["technical"] = self._extract_list_items(sections["technical"])
        
        # Add sections dictionary
        structured_spec["sections"] = sections
        
        return structured_spec
    
    def _extract_first_paragraph(self, text: str) -> str:
        """
        Extract the first paragraph from text.
        
        Args:
            text: Input text
            
        Returns:
            First paragraph
        """
        paragraphs = text.split("\n\n")
        for p in paragraphs:
            if p.strip():
                return p.strip()
        return ""
    
    def _extract_list_items(self, text: str) -> List[str]:
        """
        Extract list items from text.
        
        Args:
            text: Input text
            
        Returns:
            List of items
        """
        items = []
        for line in text.split("\n"):
            line = line.strip()
            if line.startswith("-") or re.match(r"^\d+\.", line):
                # Clean up the item text
                item = re.sub(r"^[-\d\.]+\s*", "", line).strip()
                if item:
                    items.append(item)
        return items
    
    def _extract_user_stories(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract user stories from text.
        
        Args:
            text: Input text
            
        Returns:
            List of user stories
        """
        stories = []
        current_story = None
        
        for line in text.split("\n"):
            line = line.strip()
            if not line:
                continue
            
            # Look for "As a ... I want to ... so that ..." pattern
            story_match = re.match(r"(?i)as\s+an?\s+(.+?)\s+I\s+want\s+to\s+(.+?)(?:\s+so\s+that\s+(.+))?$", line)
            if story_match:
                if current_story:
                    stories.append(current_story)
                
                current_story = {
                    "user_type": story_match.group(1).strip(),
                    "action": story_match.group(2).strip(),
                    "benefit": story_match.group(3).strip() if story_match.group(3) else "",
                    "acceptance_criteria": []
                }
            
            # Look for acceptance criteria
            elif current_story and (line.startswith("-") or re.match(r"^\d+\.", line) or "acceptance criteria" in line.lower()):
                # If this is an "Acceptance Criteria" header, skip it
                if "acceptance criteria" in line.lower() and ":" in line:
                    continue
                
                # Clean up the criteria text
                criteria = re.sub(r"^[-\d\.]+\s*", "", line).strip()
                if criteria:
                    current_story["acceptance_criteria"].append(criteria)
        
        # Add the last story if there is one
        if current_story:
            stories.append(current_story)
        
        return stories
    
    def _extract_data_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract data entities from text.
        
        Args:
            text: Input text
            
        Returns:
            List of data entities
        """
        entities = []
        current_entity = None
        
        for line in text.split("\n"):
            line = line.strip()
            if not line:
                continue
            
            # Look for entity headers (usually capitalized names followed by a colon or with "Entity" or "Model")
            entity_match = re.match(r"^([A-Z][a-zA-Z]+)(\s+Entity|\s+Model)?:?$", line)
            if entity_match or (line.startswith("#") and len(line) < 30):
                if current_entity:
                    entities.append(current_entity)
                
                entity_name = entity_match.group(1) if entity_match else re.sub(r"^#+\s*", "", line)
                current_entity = {
                    "name": entity_name.strip(),
                    "attributes": [],
                    "relationships": []
                }
            
            # Look for attributes (usually "- attribute_name: type" or similar)
            elif current_entity and (line.startswith("-") or re.match(r"^\d+\.", line)):
                # Clean up the line
                item = re.sub(r"^[-\d\.]+\s*", "", line).strip()
                
                # Check if it's an attribute or relationship
                if ":" in item and not any(rel in item.lower() for rel in ["has many", "has one", "belongs to"]):
                    parts = item.split(":", 1)
                    attr_name = parts[0].strip()
                    attr_type = parts[1].strip() if len(parts) > 1 else ""
                    
                    current_entity["attributes"].append({
                        "name": attr_name,
                        "type": attr_type
                    })
                elif any(rel in item.lower() for rel in ["has many", "has one", "belongs to", "references"]):
                    current_entity["relationships"].append(item)
        
        # Add the last entity if there is one
        if current_entity:
            entities.append(current_entity)
        
        return entities
    
    def _extract_api_endpoints(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract API endpoints from text.
        
        Args:
            text: Input text
            
        Returns:
            List of API endpoints
        """
        endpoints = []
        current_endpoint = None
        
        for line in text.split("\n"):
            line = line.strip()
            if not line:
                continue
            
            # Look for endpoint definitions (usually "GET /path" or similar)
            endpoint_match = re.match(r"^(GET|POST|PUT|DELETE|PATCH)\s+(/[a-zA-Z0-9/{}._-]+)", line)
            if endpoint_match:
                if current_endpoint:
                    endpoints.append(current_endpoint)
                
                current_endpoint = {
                    "method": endpoint_match.group(1),
                    "path": endpoint_match.group(2),
                    "description": "",
                    "request_params": [],
                    "response": ""
                }
            
            # Look for description
            elif current_endpoint and not current_endpoint["description"] and not line.startswith("-"):
                current_endpoint["description"] = line
            
            # Look for request parameters
            elif current_endpoint and (line.startswith("-") or re.match(r"^\d+\.", line)) and "request" in line.lower():
                # Clean up the line
                param = re.sub(r"^[-\d\.]+\s*", "", line).strip()
                current_endpoint["request_params"].append(param)
            
            # Look for response information
            elif current_endpoint and "response" in line.lower():
                # If we find a response section, capture the next few lines
                current_endpoint["response"] = line
        
        # Add the last endpoint if there is one
        if current_endpoint:
            endpoints.append(current_endpoint)
        
        return endpoints
