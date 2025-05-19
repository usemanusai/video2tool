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
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Task as TaskIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  ViewModule as ViewModuleIcon,
  Layers as LayersIcon,
} from '@mui/icons-material';
import { videoService } from '@/api/videoService';
import { exportService } from '@/api/exportService';
import { Specification, ExportFormat } from '@/types/api';
import PageHeader from '@/components/common/PageHeader';
import ContentCard from '@/components/common/ContentCard';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorMessage from '@/components/common/ErrorMessage';
import { useTaskStatus } from '@/hooks/useTaskStatus';

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
      id={`spec-tabpanel-${index}`}
      aria-labelledby={`spec-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && <Box sx={{ p: 3, height: '100%' }}>{children}</Box>}
    </div>
  );
};

const SpecificationPage: React.FC = () => {
  const { specId } = useParams<{ specId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [specification, setSpecification] = useState<any | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [tasksTaskId, setTasksTaskId] = useState<string | null>(null);
  
  // Task status hook for task generation
  const tasksTask = useTaskStatus({
    taskId: tasksTaskId || '',
    pollingInterval: 3000,
    onComplete: (result) => {
      navigate(`/tasks/${tasksTaskId}`);
    },
    onError: (error) => {
      setError(`Task generation failed: ${error}`);
      setGeneratingTasks(false);
    },
  });

  useEffect(() => {
    const fetchSpecification = async () => {
      if (!specId) return;
      
      try {
        setLoading(true);
        // In a real implementation, you would fetch the specification from the API
        // For now, we'll use mock data
        setSpecification({
          id: specId,
          title: "Software Specification",
          description: "Generated specification based on video analysis",
          created_at: new Date().toISOString(),
          status: "completed",
          content: {
            overview: "This specification outlines the requirements for a task management application with user authentication, project organization, and task tracking features.",
            user_stories: [
              "As a user, I want to register and log in to the application",
              "As a user, I want to create and manage projects",
              "As a user, I want to create tasks within projects",
              "As a user, I want to assign tasks to team members",
              "As a user, I want to track task progress and status"
            ],
            functional_requirements: [
              {
                id: "FR-1",
                title: "User Authentication",
                description: "The system shall provide user registration and authentication functionality."
              },
              {
                id: "FR-2",
                title: "Project Management",
                description: "The system shall allow users to create, view, update, and delete projects."
              },
              {
                id: "FR-3",
                title: "Task Management",
                description: "The system shall allow users to create, view, update, and delete tasks within projects."
              }
            ],
            data_model: [
              {
                entity: "User",
                attributes: ["id", "email", "password", "name", "created_at"]
              },
              {
                entity: "Project",
                attributes: ["id", "name", "description", "user_id", "created_at"]
              },
              {
                entity: "Task",
                attributes: ["id", "title", "description", "status", "priority", "project_id", "assigned_to", "created_at"]
              }
            ],
            ui_components: [
              {
                name: "Login Screen",
                elements: ["Email input", "Password input", "Login button", "Register link"]
              },
              {
                name: "Dashboard",
                elements: ["Project list", "Task summary", "Navigation menu"]
              },
              {
                name: "Project Detail",
                elements: ["Project info", "Task list", "Add task button"]
              }
            ],
            api_endpoints: [
              {
                path: "/api/auth/register",
                method: "POST",
                description: "Register a new user"
              },
              {
                path: "/api/auth/login",
                method: "POST",
                description: "Authenticate a user"
              },
              {
                path: "/api/projects",
                method: "GET",
                description: "Get all projects for the authenticated user"
              }
            ]
          }
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load specification');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSpecification();
  }, [specId]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleGenerateTasks = async () => {
    if (!specId) return;
    
    try {
      setGeneratingTasks(true);
      setError(null);
      
      const response = await videoService.createTasks(specId);
      setTasksTaskId(response.task_id);
    } catch (err: any) {
      setError(err.message || 'Failed to generate tasks');
      setGeneratingTasks(false);
    }
  };

  const handleExportSpecification = async (format: ExportFormat) => {
    if (!specId) return;
    
    try {
      const blob = await exportService.exportSpecification(
        specId,
        {
          format,
          filename: `specification_${specification?.title || 'spec'}`,
          include_metadata: true,
        }
      );
      
      const extension = format === ExportFormat.PDF ? 'pdf' : 
                        format === ExportFormat.MARKDOWN ? 'md' : 
                        format === ExportFormat.JSON ? 'json' : 'txt';
      
      exportService.downloadBlob(
        blob,
        `specification_${specification?.title || 'spec'}.${extension}`
      );
    } catch (err: any) {
      setError(err.message || `Failed to export specification as ${format}`);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading specification..." />;
  }

  if (!specification) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorMessage 
          message={error || "Specification not found"} 
          onRetry={() => window.location.reload()}
        />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={specification.title}
        subtitle={specification.description}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: 'Specification' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<TaskIcon />}
            onClick={handleGenerateTasks}
            disabled={generatingTasks || !!tasksTaskId}
          >
            {generatingTasks || tasksTaskId ? 'Generating...' : 'Generate Tasks'}
          </Button>
        }
      />
      
      {error && <ErrorMessage message={error} />}
      
      {/* Status and metadata */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ mr: 2 }}>
              <Chip
                label={specification.status}
                color={
                  specification.status === 'completed'
                    ? 'success'
                    : specification.status === 'failed'
                    ? 'error'
                    : 'warning'
                }
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Created: {new Date(specification.created_at).toLocaleString()}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => handleExportSpecification(ExportFormat.MARKDOWN)}
              sx={{ mr: 1 }}
            >
              Export
            </Button>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Task generation status */}
      {tasksTaskId && tasksTask.status && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography variant="body1">
              Generating tasks... {tasksTask.status.status}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary">
              This may take a few minutes
            </Typography>
          </Box>
        </Paper>
      )}
      
      {/* Specification tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="specification tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" id="spec-tab-0" />
          <Tab label="Requirements" id="spec-tab-1" />
          <Tab label="Data Model" id="spec-tab-2" />
          <Tab label="UI Components" id="spec-tab-3" />
          <Tab label="API Endpoints" id="spec-tab-4" />
        </Tabs>
        
        <Box sx={{ height: 'calc(100vh - 300px)', overflow: 'auto' }}>
          <TabPanel value={tabValue} index={0}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Overview
              </Typography>
              <Typography variant="body1" paragraph>
                {specification.content.overview}
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                User Stories
              </Typography>
              <List>
                {specification.content.user_stories.map((story: string, index: number) => (
                  <ListItem key={index} divider={index < specification.content.user_stories.length - 1}>
                    <ListItemText primary={story} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Functional Requirements
              </Typography>
              
              {specification.content.functional_requirements.map((req: any, index: number) => (
                <Accordion key={req.id} defaultExpanded={index === 0}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">
                      {req.id}: {req.title}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body1">
                      {req.description}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Data Model
              </Typography>
              
              {specification.content.data_model.map((entity: any, index: number) => (
                <ContentCard
                  key={entity.entity}
                  title={entity.entity}
                  sx={{ mb: 3 }}
                  headerSx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
                >
                  <List dense>
                    {entity.attributes.map((attr: string, attrIndex: number) => (
                      <ListItem key={attrIndex} divider={attrIndex < entity.attributes.length - 1}>
                        <ListItemText primary={attr} />
                      </ListItem>
                    ))}
                  </List>
                </ContentCard>
              ))}
            </Box>
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <Box>
              <Typography variant="h6" gutterBottom>
                UI Components
              </Typography>
              
              <Grid container spacing={3}>
                {specification.content.ui_components.map((component: any, index: number) => (
                  <Grid item xs={12} md={6} key={component.name}>
                    <ContentCard
                      title={component.name}
                      icon={<ViewModuleIcon />}
                    >
                      <List dense>
                        {component.elements.map((element: string, elemIndex: number) => (
                          <ListItem key={elemIndex} divider={elemIndex < component.elements.length - 1}>
                            <ListItemText primary={element} />
                          </ListItem>
                        ))}
                      </List>
                    </ContentCard>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </TabPanel>
          
          <TabPanel value={tabValue} index={4}>
            <Box>
              <Typography variant="h6" gutterBottom>
                API Endpoints
              </Typography>
              
              <List>
                {specification.content.api_endpoints.map((endpoint: any, index: number) => (
                  <ListItem key={index} divider={index < specification.content.api_endpoints.length - 1}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip
                            label={endpoint.method}
                            size="small"
                            color={
                              endpoint.method === 'GET' ? 'info' :
                              endpoint.method === 'POST' ? 'success' :
                              endpoint.method === 'PUT' ? 'warning' :
                              endpoint.method === 'DELETE' ? 'error' : 'default'
                            }
                            sx={{ mr: 1 }}
                          />
                          <Typography variant="body1" component="span" sx={{ fontFamily: 'monospace' }}>
                            {endpoint.path}
                          </Typography>
                        </Box>
                      }
                      secondary={endpoint.description}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </TabPanel>
        </Box>
      </Paper>
      
      {/* Export options */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Export Specification
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleExportSpecification(ExportFormat.JSON)}
          >
            Export as JSON
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleExportSpecification(ExportFormat.MARKDOWN)}
          >
            Export as Markdown
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleExportSpecification(ExportFormat.PDF)}
          >
            Export as PDF
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SpecificationPage;
