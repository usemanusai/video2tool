import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Button,
  Tabs,
  Tab,
  Paper,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  Card,
  CardContent,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useCollaboration } from '@/context/CollaborationContext';
import ActiveUsers from '@/components/collaboration/ActiveUsers';
import {
  Folder as FolderIcon,
  VideoLibrary as VideoIcon,
  Description as DescriptionIcon,
  Task as TaskIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { projectService } from '@/api/projectService';
import { videoService } from '@/api/videoService';
import { Project, VideoAnalysis } from '@/types/api';
import PageHeader from '@/components/common/PageHeader';
import ContentCard from '@/components/common/ContentCard';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorMessage from '@/components/common/ErrorMessage';

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
      id={`project-tabpanel-${index}`}
      aria-labelledby={`project-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useTranslation();
  const { joinProject, leaveProject, sendActivity, users } = useCollaboration();

  const [project, setProject] = useState<Project | null>(null);
  const [videos, setVideos] = useState<VideoAnalysis[]>([]);
  const [specifications, setSpecifications] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit project dialog
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Delete confirmation dialog
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Menu
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;

      try {
        setLoading(true);

        // Fetch project details
        const projectData = await projectService.getProject(projectId);
        setProject(projectData);
        setEditName(projectData.name);
        setEditDescription(projectData.description || '');

        // Fetch videos for this project
        const videosData = await videoService.getVideoAnalyses(projectId);
        setVideos(videosData);

        // In a real implementation, you would fetch specifications and tasks
        // For now, we'll use empty arrays
        setSpecifications([]);
        setTasks([]);

        // Join the project for real-time collaboration
        try {
          await joinProject(projectId);
          sendActivity(t('collaboration.viewingProject', { projectName: projectData.name }));
        } catch (joinErr) {
          console.error('Failed to join project for real-time collaboration:', joinErr);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load project data');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();

    // Leave the project when unmounting
    return () => {
      if (projectId) {
        leaveProject();
      }
    };
  }, [projectId, joinProject, leaveProject, sendActivity, t]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);

    // Send activity update
    if (project) {
      const tabNames = ['overview', 'videos', 'specifications', 'tasks'];
      const tabName = tabNames[newValue] || 'unknown';
      sendActivity(t('collaboration.viewingTab', {
        projectName: project.name,
        tabName: t(`projects.tabs.${tabName}`)
      }));
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleOpenEditDialog = () => {
    handleMenuClose();
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
  };

  const handleOpenDeleteDialog = () => {
    handleMenuClose();
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleEditProject = async () => {
    if (!projectId || !editName.trim()) return;

    try {
      // In a real implementation, you would update the project on the server
      // For now, we'll just update the local state
      if (project) {
        const updatedProject = {
          ...project,
          name: editName,
          description: editDescription,
        };

        setProject(updatedProject);
      }

      handleCloseEditDialog();
    } catch (err: any) {
      setError(err.message || 'Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;

    try {
      // In a real implementation, you would delete the project on the server
      // For now, we'll just navigate back to the projects page
      navigate('/projects');
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading project..." />;
  }

  if (!project) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorMessage
          message={error || "Project not found"}
          onRetry={() => window.location.reload()}
        />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={project.name}
        subtitle={project.description || 'No description'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: project.name },
        ]}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<VideoIcon />}
              onClick={() => navigate('/upload', { state: { projectId } })}
            >
              Upload Video
            </Button>
            <IconButton onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleOpenEditDialog}>
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Edit Project</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleOpenDeleteDialog}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText sx={{ color: 'error.main' }}>Delete Project</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        }
      />

      {error && <ErrorMessage message={error} />}

      {/* Project metadata */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  {t('projects.created')}
                </Typography>
                <Typography variant="body1">
                  {new Date(project.created_at).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  {t('projects.lastUpdated')}
                </Typography>
                <Typography variant="body1">
                  {new Date(project.updated_at).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  {t('projects.items')}
                </Typography>
                <Typography variant="body1">
                  {videos.length} {t('projects.videos')}, {specifications.length} {t('projects.specs')}, {tasks.length} {t('projects.tasks')}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                {t('collaboration.activeCollaborators')}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <ActiveUsers variant="list" maxUsers={5} showActivity={true} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="project tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" id="project-tab-0" />
          <Tab label="Videos" id="project-tab-1" />
          <Tab label="Specifications" id="project-tab-2" />
          <Tab label="Tasks" id="project-tab-3" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <ContentCard
                title="Videos"
                action={
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/upload', { state: { projectId } })}
                  >
                    Add
                  </Button>
                }
              >
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h3" color="primary">
                    {videos.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {videos.length === 1 ? 'Video' : 'Videos'} analyzed
                  </Typography>
                </Box>
              </ContentCard>
            </Grid>

            <Grid item xs={12} md={4}>
              <ContentCard
                title="Specifications"
                action={
                  videos.length > 0 ? (
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => navigate(`/analysis/${videos[0].id}`)}
                    >
                      Generate
                    </Button>
                  ) : null
                }
              >
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h3" color="primary">
                    {specifications.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {specifications.length === 1 ? 'Specification' : 'Specifications'} generated
                  </Typography>
                </Box>
              </ContentCard>
            </Grid>

            <Grid item xs={12} md={4}>
              <ContentCard
                title="Tasks"
                action={
                  specifications.length > 0 ? (
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => navigate(`/specifications/${specifications[0].id}`)}
                    >
                      Generate
                    </Button>
                  ) : null
                }
              >
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h3" color="primary">
                    {tasks.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Development {tasks.length === 1 ? 'task' : 'tasks'}
                  </Typography>
                </Box>
              </ContentCard>
            </Grid>

            <Grid item xs={12}>
              <ContentCard title="Recent Activity">
                {videos.length === 0 && specifications.length === 0 && tasks.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      No activity yet. Start by uploading a video.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<VideoIcon />}
                      onClick={() => navigate('/upload', { state: { projectId } })}
                      sx={{ mt: 2 }}
                    >
                      Upload Video
                    </Button>
                  </Box>
                ) : (
                  <List>
                    {videos.slice(0, 3).map((video) => (
                      <ListItem
                        key={video.id}
                        button
                        onClick={() => navigate(`/analysis/${video.id}`)}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                            <VideoIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={video.video_name}
                          secondary={`Video analyzed on ${new Date(video.created_at).toLocaleDateString()}`}
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
                    ))}
                  </List>
                )}
              </ContentCard>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {videos.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <VideoIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Videos Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Upload a video to analyze and generate specifications
              </Typography>
              <Button
                variant="contained"
                startIcon={<VideoIcon />}
                onClick={() => navigate('/upload', { state: { projectId } })}
              >
                Upload Video
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {videos.map((video) => (
                <Grid item key={video.id} xs={12} sm={6} md={4}>
                  <ContentCard
                    title={video.video_name}
                    subtitle={new Date(video.created_at).toLocaleDateString()}
                    action={
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
                    }
                    footer={
                      <Button
                        size="small"
                        onClick={() => navigate(`/analysis/${video.id}`)}
                      >
                        View Analysis
                      </Button>
                    }
                  >
                    <Box
                      sx={{
                        height: 140,
                        bgcolor: 'background.default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <VideoIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                    </Box>
                  </ContentCard>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <DescriptionIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Specifications Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Generate specifications from video analysis
            </Typography>
            {videos.length > 0 ? (
              <Button
                variant="contained"
                startIcon={<DescriptionIcon />}
                onClick={() => navigate(`/analysis/${videos[0].id}`)}
              >
                Generate Specification
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<VideoIcon />}
                onClick={() => navigate('/upload', { state: { projectId } })}
              >
                Upload Video First
              </Button>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <TaskIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Tasks Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Generate tasks from specifications
            </Typography>
            {specifications.length > 0 ? (
              <Button
                variant="contained"
                startIcon={<TaskIcon />}
                onClick={() => navigate(`/specifications/${specifications[0].id}`)}
              >
                Generate Tasks
              </Button>
            ) : videos.length > 0 ? (
              <Button
                variant="contained"
                startIcon={<DescriptionIcon />}
                onClick={() => navigate(`/analysis/${videos[0].id}`)}
              >
                Generate Specification First
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<VideoIcon />}
                onClick={() => navigate('/upload', { state: { projectId } })}
              >
                Upload Video First
              </Button>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* Edit Project Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Project Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="description"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button
            onClick={handleEditProject}
            variant="contained"
            disabled={!editName.trim()}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Project?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this project? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteProject} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectDetailPage;
