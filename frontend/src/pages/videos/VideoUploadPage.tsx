import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  LinearProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { projectService } from '@/api/projectService';
import { videoService } from '@/api/videoService';
import { Project, TaskStatus } from '@/types/api';
import PageHeader from '@/components/common/PageHeader';
import VideoUploader from '@/components/videos/VideoUploader';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorMessage from '@/components/common/ErrorMessage';
import { useTaskStatus } from '@/hooks/useTaskStatus';

const VideoUploadPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeStep, setActiveStep] = useState(0);
  const [videoTaskId, setVideoTaskId] = useState<string | null>(null);
  const [specTaskId, setSpecTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Task status hooks
  const videoTask = useTaskStatus({
    taskId: videoTaskId || '',
    pollingInterval: 3000,
    onComplete: (result) => {
      setActiveStep(1);
    },
    onError: (error) => {
      setError(`Video processing failed: ${error}`);
    },
  });

  const specTask = useTaskStatus({
    taskId: specTaskId || '',
    pollingInterval: 3000,
    onComplete: (result) => {
      setActiveStep(2);
    },
    onError: (error) => {
      setError(`Specification generation failed: ${error}`);
    },
  });

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const projectsData = await projectService.getProjects();
        setProjects(projectsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);

  const handleProjectChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedProjectId(event.target.value as string);
  };

  const handleVideoUploadSuccess = (taskId: string) => {
    setVideoTaskId(taskId);
    setActiveStep(0); // Keep at step 0 but show progress
  };

  const handleGenerateSpecification = async () => {
    if (!videoTaskId) return;
    
    try {
      setError(null);
      const response = await videoService.generateSpecification(videoTaskId);
      setSpecTaskId(response.task_id);
    } catch (err: any) {
      setError(err.message || 'Failed to generate specification');
    }
  };

  const handleCreateTasks = async () => {
    if (!specTaskId) return;
    
    try {
      setError(null);
      const response = await videoService.createTasks(specTaskId);
      navigate(`/tasks/${response.task_id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create tasks');
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Upload a video to analyze
            </Typography>
            <VideoUploader
              projectId={selectedProjectId || undefined}
              onUploadSuccess={handleVideoUploadSuccess}
            />
            {videoTaskId && videoTask.status && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Processing Video
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    videoTask.status.status === 'completed'
                      ? 100
                      : videoTask.status.status === 'processing'
                      ? 50
                      : 25
                  }
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Status: {videoTask.status.status}
                </Typography>
              </Box>
            )}
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Generate Specification
            </Typography>
            <Typography variant="body2" paragraph>
              The video has been processed. Now you can generate a software specification
              based on the video analysis.
            </Typography>
            <Button
              variant="contained"
              onClick={handleGenerateSpecification}
              disabled={!videoTaskId || !!specTaskId}
            >
              Generate Specification
            </Button>
            {specTaskId && specTask.status && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Generating Specification
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    specTask.status.status === 'completed'
                      ? 100
                      : specTask.status.status === 'processing'
                      ? 50
                      : 25
                  }
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Status: {specTask.status.status}
                </Typography>
              </Box>
            )}
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Create Development Tasks
            </Typography>
            <Typography variant="body2" paragraph>
              The specification has been generated. Now you can create development tasks
              based on the specification.
            </Typography>
            <Button
              variant="contained"
              onClick={handleCreateTasks}
              disabled={!specTaskId}
            >
              Create Tasks
            </Button>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <Box>
      <PageHeader
        title="Upload Video"
        subtitle="Upload a video to analyze and generate specifications and tasks"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Upload Video' },
        ]}
      />
      
      {error && <ErrorMessage message={error} />}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Select Project
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="project-select-label">Project</InputLabel>
              <Select
                labelId="project-select-label"
                id="project-select"
                value={selectedProjectId}
                label="Project"
                onChange={handleProjectChange}
              >
                <MenuItem value="">
                  <em>None (Create new)</em>
                </MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {!selectedProjectId && (
              <Alert severity="info" sx={{ mt: 2 }}>
                If you don't select a project, a new one will be created automatically.
              </Alert>
            )}
            
            <Box sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/projects')}
              >
                Manage Projects
              </Button>
            </Box>
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Process Steps
            </Typography>
            <Stepper activeStep={activeStep} orientation="vertical">
              <Step>
                <StepLabel>Upload Video</StepLabel>
                <StepContent>
                  <Typography variant="body2">
                    Upload a video file or provide a URL to a video.
                  </Typography>
                </StepContent>
              </Step>
              <Step>
                <StepLabel>Generate Specification</StepLabel>
                <StepContent>
                  <Typography variant="body2">
                    AI analyzes the video and generates a software specification.
                  </Typography>
                </StepContent>
              </Step>
              <Step>
                <StepLabel>Create Tasks</StepLabel>
                <StepContent>
                  <Typography variant="body2">
                    Convert the specification into development tasks.
                  </Typography>
                </StepContent>
              </Step>
            </Stepper>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {getStepContent(activeStep)}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VideoUploadPage;
