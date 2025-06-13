"""
Module for managing exports in different formats.
"""

import json
import logging
import os
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Any, Optional, Union

import markdown
from jinja2 import Environment, FileSystemLoader

import config
from utils.pdf_generator import PDFGenerator

logger = logging.getLogger(__name__)

class ExportFormat(str, Enum):
    """Export format enum."""
    JSON = "json"
    MARKDOWN = "markdown"
    TEXT = "text"
    PDF = "pdf"


class ExportManager:
    """
    Class for managing exports in different formats.
    
    Supports:
    - JSON
    - Markdown
    - Plain text
    - PDF
    """
    
    def __init__(self, output_dir: str = None):
        """
        Initialize the ExportManager.
        
        Args:
            output_dir: Directory for output files
        """
        self.output_dir = Path(output_dir) if output_dir else Path(config.OUTPUT_DIR)
        self.output_dir.mkdir(exist_ok=True)
        
        # Initialize PDF generator
        self.pdf_generator = PDFGenerator()
        
        # Initialize Jinja2 environment for templates
        self.jinja_env = Environment(
            loader=FileSystemLoader("templates/exports"),
            autoescape=True
        )
    
    def export(
        self,
        data: Dict[str, Any],
        format: ExportFormat,
        filename: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Export data in the specified format.
        
        Args:
            data: Data to export
            format: Export format
            filename: Output filename (without extension)
            metadata: Additional metadata to include
            
        Returns:
            Path to the exported file
        """
        if not filename:
            # Generate a filename based on timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"export_{timestamp}"
        
        # Add metadata
        export_data = data.copy()
        if metadata:
            export_data["metadata"] = metadata
        else:
            export_data["metadata"] = {
                "exported_at": datetime.now().isoformat(),
                "version": "1.0"
            }
        
        # Export based on format
        if format == ExportFormat.JSON:
            return self._export_json(export_data, filename)
        elif format == ExportFormat.MARKDOWN:
            return self._export_markdown(export_data, filename)
        elif format == ExportFormat.TEXT:
            return self._export_text(export_data, filename)
        elif format == ExportFormat.PDF:
            return self._export_pdf(export_data, filename)
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    def _export_json(self, data: Dict[str, Any], filename: str) -> str:
        """
        Export data as JSON.
        
        Args:
            data: Data to export
            filename: Output filename
            
        Returns:
            Path to the exported file
        """
        output_path = self.output_dir / f"{filename}.json"
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Exported JSON to: {output_path}")
        
        return str(output_path)
    
    def _export_markdown(self, data: Dict[str, Any], filename: str) -> str:
        """
        Export data as Markdown.
        
        Args:
            data: Data to export
            filename: Output filename
            
        Returns:
            Path to the exported file
        """
        output_path = self.output_dir / f"{filename}.md"
        
        try:
            # Use Jinja2 template for Markdown
            template = self.jinja_env.get_template("markdown_template.md")
            markdown_content = template.render(data=data)
        except Exception as e:
            logger.error(f"Error rendering Markdown template: {e}")
            # Fallback to basic Markdown generation
            markdown_content = self._generate_basic_markdown(data)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(markdown_content)
        
        logger.info(f"Exported Markdown to: {output_path}")
        
        return str(output_path)
    
    def _export_text(self, data: Dict[str, Any], filename: str) -> str:
        """
        Export data as plain text.
        
        Args:
            data: Data to export
            filename: Output filename
            
        Returns:
            Path to the exported file
        """
        output_path = self.output_dir / f"{filename}.txt"
        
        try:
            # Use Jinja2 template for text
            template = self.jinja_env.get_template("text_template.txt")
            text_content = template.render(data=data)
        except Exception as e:
            logger.error(f"Error rendering text template: {e}")
            # Fallback to basic text generation
            text_content = self._generate_basic_text(data)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text_content)
        
        logger.info(f"Exported text to: {output_path}")
        
        return str(output_path)
    
    def _export_pdf(self, data: Dict[str, Any], filename: str) -> str:
        """
        Export data as PDF.
        
        Args:
            data: Data to export
            filename: Output filename
            
        Returns:
            Path to the exported file
        """
        output_path = self.output_dir / f"{filename}.pdf"
        
        # Generate Markdown first
        markdown_path = self._export_markdown(data, f"{filename}_temp")
        
        # Convert Markdown to PDF
        with open(markdown_path, "r", encoding="utf-8") as f:
            markdown_content = f.read()
        
        self.pdf_generator.generate_pdf(markdown_content, str(output_path), data.get("title", "Export"))
        
        # Clean up temporary Markdown file
        os.remove(markdown_path)
        
        logger.info(f"Exported PDF to: {output_path}")
        
        return str(output_path)
    
    def _generate_basic_markdown(self, data: Dict[str, Any]) -> str:
        """
        Generate basic Markdown from data.
        
        Args:
            data: Data to convert
            
        Returns:
            Markdown string
        """
        lines = []
        
        # Add title
        title = data.get("title", "Export")
        lines.append(f"# {title}")
        lines.append("")
        
        # Add metadata
        if "metadata" in data:
            lines.append("## Metadata")
            for key, value in data["metadata"].items():
                lines.append(f"- **{key}:** {value}")
            lines.append("")
        
        # Add content sections
        for key, value in data.items():
            if key in ["title", "metadata"]:
                continue
            
            lines.append(f"## {key.replace('_', ' ').title()}")
            lines.append("")
            
            if isinstance(value, dict):
                for sub_key, sub_value in value.items():
                    lines.append(f"### {sub_key.replace('_', ' ').title()}")
                    lines.append("")
                    lines.append(self._format_value(sub_value))
                    lines.append("")
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        for item_key, item_value in item.items():
                            lines.append(f"### {item_key.replace('_', ' ').title()}")
                            lines.append("")
                            lines.append(self._format_value(item_value))
                            lines.append("")
                    else:
                        lines.append(f"- {item}")
                lines.append("")
            else:
                lines.append(self._format_value(value))
                lines.append("")
        
        return "\n".join(lines)
    
    def _generate_basic_text(self, data: Dict[str, Any]) -> str:
        """
        Generate basic text from data.
        
        Args:
            data: Data to convert
            
        Returns:
            Text string
        """
        # Convert Markdown to plain text
        markdown_text = self._generate_basic_markdown(data)
        
        # Remove Markdown formatting
        text = markdown_text.replace("# ", "").replace("## ", "").replace("### ", "")
        text = text.replace("**", "").replace("*", "").replace("- ", "  - ")
        
        return text
    
    def _format_value(self, value: Any) -> str:
        """
        Format a value for Markdown.
        
        Args:
            value: Value to format
            
        Returns:
            Formatted string
        """
        if isinstance(value, dict):
            lines = []
            for k, v in value.items():
                lines.append(f"- **{k}:** {v}")
            return "\n".join(lines)
        elif isinstance(value, list):
            return "\n".join([f"- {item}" for item in value])
        else:
            return str(value)
