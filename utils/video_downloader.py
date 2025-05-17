"""
Module for downloading videos from various sources.
"""

import logging
import os
import re
import tempfile
from pathlib import Path
from typing import Optional, Tuple
from urllib.parse import urlparse

import httpx
from pytube import YouTube
import yt_dlp

import config

logger = logging.getLogger(__name__)

class VideoDownloader:
    """
    Class for downloading videos from various sources.
    
    Supports:
    - YouTube
    - Vimeo
    - Direct URL links
    - Google Drive
    - Dropbox
    """
    
    def __init__(self, temp_dir: str = None):
        """
        Initialize the VideoDownloader.
        
        Args:
            temp_dir: Directory for temporary files
        """
        self.temp_dir = Path(temp_dir) if temp_dir else Path(config.TEMP_DIR)
        self.temp_dir.mkdir(exist_ok=True)
        
        # Supported video formats
        self.supported_formats = config.SUPPORTED_VIDEO_FORMATS
    
    async def download_video(self, url: str) -> Tuple[str, str]:
        """
        Download a video from a URL.
        
        Args:
            url: URL of the video
            
        Returns:
            Tuple of (file path, video title)
            
        Raises:
            ValueError: If the URL is invalid or unsupported
        """
        logger.info(f"Downloading video from URL: {url}")
        
        # Parse the URL
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            raise ValueError(f"Invalid URL: {url}")
        
        # Determine the source
        if "youtube.com" in parsed_url.netloc or "youtu.be" in parsed_url.netloc:
            return await self._download_from_youtube(url)
        elif "vimeo.com" in parsed_url.netloc:
            return await self._download_from_vimeo(url)
        elif "drive.google.com" in parsed_url.netloc:
            return await self._download_from_google_drive(url)
        elif "dropbox.com" in parsed_url.netloc:
            return await self._download_from_dropbox(url)
        else:
            # Try direct download
            return await self._download_direct(url)
    
    async def _download_from_youtube(self, url: str) -> Tuple[str, str]:
        """
        Download a video from YouTube.
        
        Args:
            url: YouTube URL
            
        Returns:
            Tuple of (file path, video title)
            
        Raises:
            ValueError: If download fails
        """
        try:
            # Create a temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", dir=self.temp_dir)
            temp_file.close()
            
            # Download using pytube
            yt = YouTube(url)
            video_title = yt.title
            
            # Get the highest resolution stream
            stream = yt.streams.filter(progressive=True, file_extension="mp4").order_by("resolution").desc().first()
            
            if not stream:
                raise ValueError(f"No suitable video stream found for URL: {url}")
            
            # Download the video
            stream.download(output_path=os.path.dirname(temp_file.name), filename=os.path.basename(temp_file.name))
            
            logger.info(f"Downloaded YouTube video: {video_title}")
            
            return temp_file.name, video_title
        
        except Exception as e:
            logger.error(f"Error downloading from YouTube: {e}")
            # Try fallback method with yt-dlp
            return await self._download_with_ytdlp(url)
    
    async def _download_from_vimeo(self, url: str) -> Tuple[str, str]:
        """
        Download a video from Vimeo.
        
        Args:
            url: Vimeo URL
            
        Returns:
            Tuple of (file path, video title)
            
        Raises:
            ValueError: If download fails
        """
        # Use yt-dlp for Vimeo
        return await self._download_with_ytdlp(url)
    
    async def _download_from_google_drive(self, url: str) -> Tuple[str, str]:
        """
        Download a video from Google Drive.
        
        Args:
            url: Google Drive URL
            
        Returns:
            Tuple of (file path, video title)
            
        Raises:
            ValueError: If download fails
        """
        # Use yt-dlp for Google Drive
        return await self._download_with_ytdlp(url)
    
    async def _download_from_dropbox(self, url: str) -> Tuple[str, str]:
        """
        Download a video from Dropbox.
        
        Args:
            url: Dropbox URL
            
        Returns:
            Tuple of (file path, video title)
            
        Raises:
            ValueError: If download fails
        """
        # Convert to direct download link if needed
        if "?dl=0" in url:
            url = url.replace("?dl=0", "?dl=1")
        elif "?dl=" not in url:
            url = f"{url}?dl=1"
        
        # Use direct download
        return await self._download_direct(url)
    
    async def _download_direct(self, url: str) -> Tuple[str, str]:
        """
        Download a video directly from a URL.
        
        Args:
            url: Direct URL
            
        Returns:
            Tuple of (file path, video title)
            
        Raises:
            ValueError: If download fails
        """
        try:
            # Create a temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", dir=self.temp_dir)
            temp_file.close()
            
            # Get the filename from the URL
            parsed_url = urlparse(url)
            path = parsed_url.path
            filename = os.path.basename(path)
            
            # If no filename or extension, use a default
            if not filename or "." not in filename:
                filename = "video.mp4"
            
            # Download the file
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("GET", url) as response:
                    if response.status_code != 200:
                        raise ValueError(f"Failed to download video: HTTP {response.status_code}")
                    
                    with open(temp_file.name, "wb") as f:
                        async for chunk in response.aiter_bytes():
                            f.write(chunk)
            
            logger.info(f"Downloaded video from direct URL: {filename}")
            
            return temp_file.name, filename
        
        except Exception as e:
            logger.error(f"Error downloading from direct URL: {e}")
            raise ValueError(f"Failed to download video from URL: {url}")
    
    async def _download_with_ytdlp(self, url: str) -> Tuple[str, str]:
        """
        Download a video using yt-dlp.
        
        Args:
            url: Video URL
            
        Returns:
            Tuple of (file path, video title)
            
        Raises:
            ValueError: If download fails
        """
        try:
            # Create a temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", dir=self.temp_dir)
            temp_file.close()
            
            # Set up yt-dlp options
            ydl_opts = {
                "format": "best[ext=mp4]/best",
                "outtmpl": temp_file.name,
                "quiet": True,
                "no_warnings": True,
                "ignoreerrors": False,
            }
            
            # Download the video
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                video_title = info.get("title", os.path.basename(temp_file.name))
            
            logger.info(f"Downloaded video using yt-dlp: {video_title}")
            
            return temp_file.name, video_title
        
        except Exception as e:
            logger.error(f"Error downloading with yt-dlp: {e}")
            raise ValueError(f"Failed to download video from URL: {url}")
"""
