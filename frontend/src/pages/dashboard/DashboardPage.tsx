import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  VideoLibrary as VideoIcon,
  Description as DescriptionIcon,
  Task as TaskIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { projectService } from '@/api/projectService';
import { Project, VideoAnalysis } from '@/types/api';
import PageHeader from '@/components/common/PageHeader';
import ContentCard from '@/components/common/ContentCard';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorMessage from '@/components/common/ErrorMessage';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentVideos, setRecentVideos] = useState<VideoAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch projects
        const projectsData = await projectService.getProjects();
        setProjects(projectsData);
        
        // For now, we'll just use empty array for recent videos
        // In a real implementation, you would fetch this data from the API
        setRecentVideos([]);
        
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <Box>
      <PageHeader
        title={`Welcome, ${user?.full_name || 'User'}`}
        subtitle="Here's an overview of your projects and recent activity"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/upload')}
          >
            Upload Video
          </Button>
        }
      />
      
      {error && <ErrorMessage message={error} />}
      
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} md={4}>
          <ContentCard
            title="Projects"
            subtitle="Total projects"
            action={
              <Button
                size="small"
                onClick={() => navigate('/projects')}
              >
                View All
              </Button>
            }
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
              <Typography variant="h3" color="primary">
                {projects.length}
              </Typography>
            </Box>
          </ContentCard>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <ContentCard
            title="Videos"
            subtitle="Analyzed videos"
            action={
              <Button
                size="small"
                onClick={() => navigate('/upload')}
              >
                Upload
              </Button>
            }
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
              <Typography variant="h3" color="primary">
                {recentVideos.length}
              </Typography>
            </Box>
          </ContentCard>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <ContentCard
            title="Tasks"
            subtitle="Generated tasks"
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
              <Typography variant="h3" color="primary">
                0
              </Typography>
            </Box>
          </ContentCard>
        </Grid>
        
        {/* Recent Projects */}
        <Grid item xs={12} md={6}>
          <ContentCard
            title="Recent Projects"
            action={
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => navigate('/projects')}
              >
                New Project
              </Button>
            }
            sx={{ height: '100%' }}
          >
            {projects.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No projects yet</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/projects')}
                  sx={{ mt: 2 }}
                >
                  Create Project
                </Button>
              </Box>
            ) : (
              <List>
                {projects.slice(0, 5).map((project) => (
                  <React.Fragment key={project.id}>
                    <ListItem
                      button
                      onClick={() => navigate(`/projects/${project.id}`)}
                      sx={{ px: 0 }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                          <FolderIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={project.name}
                        secondary={
                          project.description || 
                          new Date(project.created_at).toLocaleDateString()
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
                {projects.length > 5 && (
                  <ListItem button onClick={() => navigate('/projects')}>
                    <ListItemText
                      primary="View all projects"
                      sx={{ textAlign: 'center', color: theme.palette.primary.main }}
                    />
                  </ListItem>
                )}
              </List>
            )}
          </ContentCard>
        </Grid>
        
        {/* Recent Videos */}
        <Grid item xs={12} md={6}>
          <ContentCard
            title="Recent Videos"
            action={
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => navigate('/upload')}
              >
                Upload
              </Button>
            }
            sx={{ height: '100%' }}
          >
            {recentVideos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No videos analyzed yet</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/upload')}
                  sx={{ mt: 2 }}
                >
                  Upload Video
                </Button>
              </Box>
            ) : (
              <List>
                {recentVideos.slice(0, 5).map((video) => (
                  <React.Fragment key={video.id}>
                    <ListItem
                      button
                      onClick={() => navigate(`/analysis/${video.id}`)}
                      sx={{ px: 0 }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                          <VideoIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={video.video_name}
                        secondary={new Date(video.created_at).toLocaleDateString()}
                      />
                      <Chip
                        label={video.status}
                        color={
                          video.status === 'completed'
                            ? 'success'
                            : video.status === 'failed'
                            ? 'error'
                            : 'warning'
                        }
                        size="small"
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
                {recentVideos.length > 5 && (
                  <ListItem button onClick={() => navigate('/videos')}>
                    <ListItemText
                      primary="View all videos"
                      sx={{ textAlign: 'center', color: theme.palette.primary.main }}
                    />
                  </ListItem>
                )}
              </List>
            )}
          </ContentCard>
        </Grid>
        
        {/* Quick Actions */}
        <Grid item xs={12}>
          <ContentCard title="Quick Actions">
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<VideoIcon />}
                  onClick={() => navigate('/upload')}
                  sx={{ py: 2 }}
                >
                  Upload Video
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<FolderIcon />}
                  onClick={() => navigate('/projects')}
                  sx={{ py: 2 }}
                >
                  Manage Projects
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<DescriptionIcon />}
                  onClick={() => navigate('/specifications')}
                  sx={{ py: 2 }}
                >
                  View Specifications
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<TaskIcon />}
                  onClick={() => navigate('/tasks')}
                  sx={{ py: 2 }}
                >
                  Manage Tasks
                </Button>
              </Grid>
            </Grid>
          </ContentCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
