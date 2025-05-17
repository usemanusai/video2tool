import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  TextField,
  Tab,
  Tabs,
  useTheme,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { CloudUpload as CloudUploadIcon, Link as LinkIcon } from '@mui/icons-material';
import { videoService } from '@/api/videoService';
import { ProcessingTask } from '@/types/api';

interface VideoUploaderProps {
  projectId?: string;
  onUploadSuccess: (taskId: string) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`video-upload-tabpanel-${index}`}
      aria-labelledby={`video-upload-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const VideoUploader: React.FC<VideoUploaderProps> = ({ projectId, onUploadSuccess }) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    maxFiles: 1,
    maxSize: 1024 * 1024 * 500, // 500MB
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(event.target.value);
    setError(null);
  };

  const handleFileUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await videoService.uploadVideo(file, projectId);
      onUploadSuccess(response.task_id);
    } catch (err: any) {
      setError(err.message || 'Failed to upload video');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlUpload = async () => {
    if (!videoUrl) {
      setError('Please enter a video URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await videoService.processVideoUrl(videoUrl, projectId);
      onUploadSuccess(response.task_id);
    } catch (err: any) {
      setError(err.message || 'Failed to process video URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="video upload tabs"
        variant="fullWidth"
      >
        <Tab label="Upload File" id="video-upload-tab-0" />
        <Tab label="Video URL" id="video-upload-tab-1" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ p: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box
            {...getRootProps()}
            sx={{
              border: `2px dashed ${
                isDragActive ? theme.palette.primary.main : theme.palette.divider
              }`,
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive
                ? alpha(theme.palette.primary.main, 0.1)
                : 'background.paper',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon
              sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
            />
            <Typography variant="h6" gutterBottom>
              {isDragActive
                ? 'Drop the video here'
                : 'Drag and drop a video file here, or click to select'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported formats: MP4, MOV, AVI, WebM (max 500MB)
            </Typography>
          </Box>

          {file && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Selected File:
              </Typography>
              <Typography variant="body2">
                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={!file || loading}
              onClick={handleFileUpload}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Uploading...' : 'Upload Video'}
            </Button>
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ p: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Typography variant="subtitle1" gutterBottom>
            Enter a video URL:
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Supported sources: YouTube, Vimeo, Google Drive, Dropbox, or direct video links
          </Typography>

          <TextField
            fullWidth
            label="Video URL"
            variant="outlined"
            value={videoUrl}
            onChange={handleUrlChange}
            placeholder="https://..."
            InputProps={{
              startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            disabled={loading}
          />

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={!videoUrl || loading}
              onClick={handleUrlUpload}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Processing...' : 'Process Video'}
            </Button>
          </Box>
        </Box>
      </TabPanel>
    </Paper>
  );
};

// Helper function for alpha color
function alpha(color: string, value: number) {
  return color + Math.round(value * 255).toString(16).padStart(2, '0');
}

export default VideoUploader;
