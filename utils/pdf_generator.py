"""
Module for generating PDF files.
"""

import logging
import os
from datetime import datetime
from typing import Dict, Any, Optional

import markdown
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration

logger = logging.getLogger(__name__)

class PDFGenerator:
    """
    Class for generating PDF files from various formats.
    """
    
    def __init__(self):
        """Initialize the PDFGenerator."""
        # Default CSS for PDF styling
        self.default_css = """
        @page {
            margin: 1cm;
            @top-center {
                content: string(title);
                font-size: 9pt;
                color: #666;
            }
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 9pt;
                color: #666;
            }
        }
        
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #333;
        }
        
        h1 {
            string-set: title content();
            font-size: 24pt;
            color: #2c3e50;
            margin-top: 2cm;
            margin-bottom: 1cm;
            text-align: center;
            page-break-before: always;
        }
        
        h1:first-of-type {
            page-break-before: avoid;
        }
        
        h2 {
            font-size: 18pt;
            color: #3498db;
            margin-top: 1.5cm;
            margin-bottom: 0.5cm;
            border-bottom: 1px solid #eee;
            padding-bottom: 0.2cm;
        }
        
        h3 {
            font-size: 14pt;
            color: #2980b9;
            margin-top: 1cm;
            margin-bottom: 0.3cm;
        }
        
        p {
            margin-bottom: 0.5cm;
            text-align: justify;
        }
        
        ul, ol {
            margin-bottom: 0.5cm;
        }
        
        li {
            margin-bottom: 0.2cm;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1cm;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 0.3cm;
            text-align: left;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        
        code {
            font-family: 'Courier New', monospace;
            background-color: #f8f9fa;
            padding: 0.1cm;
            border-radius: 0.1cm;
        }
        
        pre {
            background-color: #f8f9fa;
            padding: 0.5cm;
            border-radius: 0.2cm;
            white-space: pre-wrap;
            margin-bottom: 0.5cm;
        }
        
        blockquote {
            border-left: 0.2cm solid #eee;
            padding-left: 0.5cm;
            color: #666;
            font-style: italic;
            margin-bottom: 0.5cm;
        }
        
        .metadata {
            font-size: 9pt;
            color: #666;
            margin-bottom: 1cm;
            text-align: center;
        }
        
        .page-break {
            page-break-before: always;
        }
        """
    
    def generate_pdf(
        self,
        content: str,
        output_path: str,
        title: str = "Document",
        css: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a PDF from Markdown content.
        
        Args:
            content: Markdown content
            output_path: Output file path
            title: Document title
            css: Custom CSS
            metadata: Document metadata
            
        Returns:
            Path to the generated PDF
        """
        try:
            # Convert Markdown to HTML
            html_content = markdown.markdown(
                content,
                extensions=[
                    'markdown.extensions.tables',
                    'markdown.extensions.fenced_code',
                    'markdown.extensions.codehilite',
                    'markdown.extensions.toc'
                ]
            )
            
            # Add metadata
            meta_html = ""
            if metadata:
                meta_html = "<div class='metadata'>"
                for key, value in metadata.items():
                    meta_html += f"{key}: {value}<br>"
                meta_html += "</div>"
            
            # Create full HTML document
            full_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>{title}</title>
            </head>
            <body>
                <h1>{title}</h1>
                {meta_html}
                {html_content}
            </body>
            </html>
            """
            
            # Set up font configuration
            font_config = FontConfiguration()
            
            # Combine CSS
            css_string = self.default_css
            if css:
                css_string += "\n" + css
            
            # Generate PDF
            HTML(string=full_html).write_pdf(
                output_path,
                stylesheets=[CSS(string=css_string)],
                font_config=font_config
            )
            
            logger.info(f"Generated PDF: {output_path}")
            
            return output_path
        
        except Exception as e:
            logger.error(f"Error generating PDF: {e}")
            raise ValueError(f"Failed to generate PDF: {str(e)}")
    
    def generate_pdf_from_html(
        self,
        html_content: str,
        output_path: str,
        css: Optional[str] = None
    ) -> str:
        """
        Generate a PDF from HTML content.
        
        Args:
            html_content: HTML content
            output_path: Output file path
            css: Custom CSS
            
        Returns:
            Path to the generated PDF
        """
        try:
            # Set up font configuration
            font_config = FontConfiguration()
            
            # Combine CSS
            css_string = self.default_css
            if css:
                css_string += "\n" + css
            
            # Generate PDF
            HTML(string=html_content).write_pdf(
                output_path,
                stylesheets=[CSS(string=css_string)],
                font_config=font_config
            )
            
            logger.info(f"Generated PDF from HTML: {output_path}")
            
            return output_path
        
        except Exception as e:
            logger.error(f"Error generating PDF from HTML: {e}")
            raise ValueError(f"Failed to generate PDF from HTML: {str(e)}")
