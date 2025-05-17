import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  IconButton,
  Button,
  Grid,
  Chip,
  Tooltip,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipNext as NextIcon,
  SkipPrevious as PrevIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as MuteIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

// UI element detection interface
interface UIElement {
  id: string;
  type: string;
  name: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  timestamp: number;
  properties?: Record<string, any>;
}

// Video analysis interface
interface VideoAnalysis {
  id: string;
  video_url: string;
  video_name: string;
  duration: number;
  resolution: {
    width: number;
    height: number;
  };
  detected_elements: UIElement[];
  keyframes: number[];
}

// Component props
interface VideoAnalysisVisualizerProps {
  analysis: VideoAnalysis;
  onElementSelect?: (element: UIElement) => void;
}

const VideoAnalysisVisualizer: React.FC<VideoAnalysisVisualizerProps> = ({
  analysis,
  onElementSelect,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedElement, setSelectedElement] = useState<UIElement | null>(null);
  const [visibleElements, setVisibleElements] = useState<UIElement[]>([]);
  const [elementTypes, setElementTypes] = useState<string[]>([]);
  const [activeElementTypes, setActiveElementTypes] = useState<string[]>([]);
  
  // Colors for different element types
  const elementColors: Record<string, string> = {
    button: theme.palette.primary.main,
    input: theme.palette.secondary.main,
    text: theme.palette.success.main,
    image: theme.palette.warning.main,
    container: theme.palette.error.main,
    navigation: theme.palette.info.main,
  };
  
  // Initialize video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.src = analysis.video_url;
      videoRef.current.load();
    }
    
    // Extract unique element types
    const types = Array.from(
      new Set(analysis.detected_elements.map((element) => element.type))
    );
    setElementTypes(types);
    setActiveElementTypes(types);
  }, [analysis]);
  
  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      updateVisibleElements(video.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    
    const handleEnded = () => {
      setPlaying(false);
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);
  
  // Update visible elements based on current time
  const updateVisibleElements = (time: number) => {
    // Find elements visible at the current time
    // For this example, we'll consider elements visible if they're within 1 second of the current time
    const elements = analysis.detected_elements.filter(
      (element) => Math.abs(element.timestamp - time) < 1 && 
                   activeElementTypes.includes(element.type)
    );
    
    setVisibleElements(elements);
  };
  
  // Draw overlay on canvas
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !showOverlay) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bounding boxes for visible elements
    visibleElements.forEach((element) => {
      const { x, y, width, height } = element.boundingBox;
      
      // Calculate actual coordinates based on video dimensions
      const actualX = x * canvas.width;
      const actualY = y * canvas.height;
      const actualWidth = width * canvas.width;
      const actualHeight = height * canvas.height;
      
      // Draw bounding box
      ctx.strokeStyle = element.id === selectedElement?.id
        ? theme.palette.secondary.main
        : elementColors[element.type] || theme.palette.primary.main;
      ctx.lineWidth = element.id === selectedElement?.id ? 3 : 2;
      ctx.strokeRect(actualX, actualY, actualWidth, actualHeight);
      
      // Draw label
      ctx.fillStyle = alpha(theme.palette.background.paper, 0.7);
      ctx.fillRect(actualX, actualY - 20, actualWidth, 20);
      
      ctx.fillStyle = theme.palette.text.primary;
      ctx.font = '12px Arial';
      ctx.fillText(
        `${element.type}: ${element.name}`,
        actualX + 5,
        actualY - 5
      );
    });
  }, [visibleElements, selectedElement, showOverlay, theme, elementColors]);
  
  // Play/pause video
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (playing) {
      video.pause();
    } else {
      video.play();
    }
    
    setPlaying(!playing);
  };
  
  // Seek to time
  const handleSeek = (event: Event, newValue: number | number[]) => {
    const video = videoRef.current;
    if (!video) return;
    
    const seekTime = typeof newValue === 'number' ? newValue : newValue[0];
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
    updateVisibleElements(seekTime);
  };
  
  // Toggle mute
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !muted;
    setMuted(!muted);
  };
  
  // Set volume
  const handleVolumeChange = (event: Event, newValue: number | number[]) => {
    const video = videoRef.current;
    if (!video) return;
    
    const volumeValue = typeof newValue === 'number' ? newValue : newValue[0];
    video.volume = volumeValue;
    setVolume(volumeValue);
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    
    setIsFullscreen(!isFullscreen);
  };
  
  // Toggle overlay
  const toggleOverlay = () => {
    setShowOverlay(!showOverlay);
  };
  
  // Zoom in/out
  const handleZoomIn = () => {
    setZoomLevel(Math.min(2, zoomLevel + 0.1));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(Math.max(0.5, zoomLevel - 0.1));
  };
  
  // Skip to next/previous keyframe
  const skipToNextKeyframe = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const nextKeyframe = analysis.keyframes.find(
      (time) => time > currentTime
    );
    
    if (nextKeyframe !== undefined) {
      video.currentTime = nextKeyframe;
      setCurrentTime(nextKeyframe);
      updateVisibleElements(nextKeyframe);
    }
  };
  
  const skipToPreviousKeyframe = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const prevKeyframe = [...analysis.keyframes]
      .reverse()
      .find((time) => time < currentTime);
    
    if (prevKeyframe !== undefined) {
      video.currentTime = prevKeyframe;
      setCurrentTime(prevKeyframe);
      updateVisibleElements(prevKeyframe);
    }
  };
  
  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Find clicked element
    let clickedElement: UIElement | null = null;
    
    for (const element of visibleElements) {
      const { x: elementX, y: elementY, width, height } = element.boundingBox;
      
      const actualX = elementX * canvas.width;
      const actualY = elementY * canvas.height;
      const actualWidth = width * canvas.width;
      const actualHeight = height * canvas.height;
      
      if (
        x >= actualX &&
        x <= actualX + actualWidth &&
        y >= actualY &&
        y <= actualY + actualHeight
      ) {
        clickedElement = element;
        break;
      }
    }
    
    if (clickedElement) {
      setSelectedElement(clickedElement);
      
      if (onElementSelect) {
        onElementSelect(clickedElement);
      }
    } else {
      setSelectedElement(null);
    }
  };
  
  // Toggle element type visibility
  const toggleElementType = (type: string) => {
    setActiveElementTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };
  
  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <Box>
      <Paper sx={{ mb: 2 }}>
        <Box ref={containerRef} sx={{ position: 'relative' }}>
          {/* Video */}
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              paddingTop: '56.25%', // 16:9 aspect ratio
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.2s',
              }}
            >
              <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onClick={togglePlay}
              />
              
              {showOverlay && (
                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                  }}
                  onClick={handleCanvasClick}
                />
              )}
            </Box>
          </Box>
          
          {/* Video controls */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: alpha(theme.palette.background.paper, 0.7),
              p: 1,
            }}
          >
            <Grid container spacing={1} alignItems="center">
              <Grid item>
                <IconButton onClick={togglePlay} size="small">
                  {playing ? <PauseIcon /> : <PlayIcon />}
                </IconButton>
              </Grid>
              
              <Grid item>
                <IconButton onClick={skipToPreviousKeyframe} size="small">
                  <PrevIcon />
                </IconButton>
              </Grid>
              
              <Grid item>
                <IconButton onClick={skipToNextKeyframe} size="small">
                  <NextIcon />
                </IconButton>
              </Grid>
              
              <Grid item xs>
                <Slider
                  value={currentTime}
                  max={duration}
                  onChange={handleSeek}
                  aria-label="video progress"
                  size="small"
                />
              </Grid>
              
              <Grid item>
                <Typography variant="caption">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Typography>
              </Grid>
              
              <Grid item>
                <IconButton onClick={toggleMute} size="small">
                  {muted ? <MuteIcon /> : <VolumeIcon />}
                </IconButton>
              </Grid>
              
              <Grid item xs={1}>
                <Slider
                  value={volume}
                  max={1}
                  min={0}
                  step={0.1}
                  onChange={handleVolumeChange}
                  aria-label="volume"
                  size="small"
                  disabled={muted}
                />
              </Grid>
              
              <Grid item>
                <IconButton onClick={toggleOverlay} size="small">
                  {showOverlay ? <VisibilityIcon /> : <VisibilityOffIcon />}
                </IconButton>
              </Grid>
              
              <Grid item>
                <IconButton onClick={handleZoomOut} size="small">
                  <ZoomOutIcon />
                </IconButton>
              </Grid>
              
              <Grid item>
                <IconButton onClick={handleZoomIn} size="small">
                  <ZoomInIcon />
                </IconButton>
              </Grid>
              
              <Grid item>
                <IconButton onClick={toggleFullscreen} size="small">
                  {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>
      
      {/* Element type filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('videos.elementTypes')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {elementTypes.map((type) => (
            <Chip
              key={type}
              label={type}
              color={activeElementTypes.includes(type) ? 'primary' : 'default'}
              onClick={() => toggleElementType(type)}
              sx={{
                bgcolor: activeElementTypes.includes(type)
                  ? alpha(elementColors[type] || theme.palette.primary.main, 0.1)
                  : undefined,
                borderColor: activeElementTypes.includes(type)
                  ? elementColors[type] || theme.palette.primary.main
                  : undefined,
              }}
            />
          ))}
        </Box>
      </Paper>
      
      {/* Selected element details */}
      {selectedElement && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('videos.selectedElement')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                {t('videos.elementType')}
              </Typography>
              <Typography variant="body1">{selectedElement.type}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                {t('videos.elementName')}
              </Typography>
              <Typography variant="body1">{selectedElement.name}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                {t('videos.confidence')}
              </Typography>
              <Typography variant="body1">
                {(selectedElement.confidence * 100).toFixed(1)}%
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                {t('videos.timestamp')}
              </Typography>
              <Typography variant="body1">
                {formatTime(selectedElement.timestamp)}
              </Typography>
            </Grid>
            
            {selectedElement.properties && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('videos.properties')}
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {Object.entries(selectedElement.properties).map(([key, value]) => (
                    <Box key={key} sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {key}
                      </Typography>
                      <Typography variant="body1">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default VideoAnalysisVisualizer;
