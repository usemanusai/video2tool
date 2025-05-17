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
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Sort as SortIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { exportService } from '@/api/exportService';
import { integrationService } from '@/api/integrationService';
import { ExportFormat, IntegrationType } from '@/types/api';
import PageHeader from '@/components/common/PageHeader';
import ContentCard from '@/components/common/ContentCard';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorMessage from '@/components/common/ErrorMessage';
import TaskBoard from '@/components/tasks/TaskBoard';
import TaskDependencyGraph from '@/components/tasks/TaskDependencyGraph';

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
      id={`tasks-tabpanel-${index}`}
      aria-labelledby={`tasks-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  );
};

// Mock task data
const mockTasks = [
  {
    id: '1',
    name: 'Set up user authentication',
    description: 'Implement user registration and login functionality',
    category: 'Backend',
    priority: 'high',
    estimate: '3 days',
    status: 'todo',
    dependencies: [],
  },
  {
    id: '2',
    name: 'Create database schema',
    description: 'Design and implement the database schema for the application',
    category: 'Database',
    priority: 'high',
    estimate: '2 days',
    status: 'inProgress',
    dependencies: [],
  },
  {
    id: '3',
    name: 'Implement user profile page',
    description: 'Create the user profile page with edit functionality',
    category: 'Frontend',
    priority: 'medium',
    estimate: '2 days',
    status: 'todo',
    dependencies: ['1'],
  },
  {
    id: '4',
    name: 'Add project creation form',
    description: 'Create form for adding new projects',
    category: 'Frontend',
    priority: 'medium',
    estimate: '1 day',
    status: 'backlog',
    dependencies: ['2'],
  },
  {
    id: '5',
    name: 'Implement task management API',
    description: 'Create API endpoints for task CRUD operations',
    category: 'Backend',
    priority: 'high',
    estimate: '3 days',
    status: 'todo',
    dependencies: ['2'],
  },
  {
    id: '6',
    name: 'Create task board UI',
    description: 'Implement drag-and-drop task board interface',
    category: 'Frontend',
    priority: 'medium',
    estimate: '4 days',
    status: 'backlog',
    dependencies: ['4', '5'],
  },
  {
    id: '7',
    name: 'Add filtering and sorting',
    description: 'Implement task filtering and sorting functionality',
    category: 'Frontend',
    priority: 'low',
    estimate: '1 day',
    status: 'backlog',
    dependencies: ['6'],
  },
  {
    id: '8',
    name: 'Write unit tests',
    description: 'Create unit tests for all components',
    category: 'Testing',
    priority: 'medium',
    estimate: '3 days',
    status: 'backlog',
    dependencies: ['3', '6'],
  },
];

const TasksPage: React.FC = () => {
  const { taskSetId } = useParams<{ taskSetId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [tasks, setTasks] = useState(mockTasks);
  const [filteredTasks, setFilteredTasks] = useState(mockTasks);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  
  // Export dialog
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>(ExportFormat.MARKDOWN);
  
  // Integration dialog
  const [openIntegrationDialog, setOpenIntegrationDialog] = useState(false);
  const [integrationType, setIntegrationType] = useState<IntegrationType>(IntegrationType.TRELLO);
  const [projectName, setProjectName] = useState('');
  const [availableIntegrations, setAvailableIntegrations] = useState<string[]>([]);
  
  // Sort menu
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [sortBy, setSortBy] = useState<string>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Fetch tasks and integrations on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, you would fetch tasks from the API
        // For now, we'll use the mock data
        
        // Fetch available integrations
        const integrations = await integrationService.getIntegrationTypes();
        setAvailableIntegrations(integrations);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [taskSetId]);
  
  // Apply filters and sorting when tasks or filter values change
  useEffect(() => {
    let result = [...tasks];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        task =>
          task.name.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query)) ||
          (task.category && task.category.toLowerCase().includes(query))
      );
    }
    
    // Apply category filter
    if (categoryFilter) {
      result = result.filter(
        task => task.category && task.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }
    
    // Apply priority filter
    if (priorityFilter) {
      result = result.filter(
        task => task.priority && task.priority.toLowerCase() === priorityFilter.toLowerCase()
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - 
                      (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredTasks(result);
  }, [tasks, searchQuery, categoryFilter, priorityFilter, sortBy, sortDirection]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleSortMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };
  
  const handleSortMenuClose = () => {
    setSortAnchorEl(null);
  };
  
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
    handleSortMenuClose();
  };
  
  const handleTaskMove = (taskId: string, sourceColumn: string, destinationColumn: string, newIndex: number) => {
    // In a real implementation, you would update the task status on the server
    console.log(`Task ${taskId} moved from ${sourceColumn} to ${destinationColumn} at index ${newIndex}`);
    
    // Update task status locally
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          status: destinationColumn,
        };
      }
      return task;
    }));
  };
  
  const handleTaskEdit = (taskId: string, updatedFields: Partial<typeof tasks[0]>) => {
    // In a real implementation, you would update the task on the server
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          ...updatedFields,
        };
      }
      return task;
    }));
  };
  
  const handleTaskDelete = (taskId: string) => {
    // In a real implementation, you would delete the task on the server
    setTasks(tasks.filter(task => task.id !== taskId));
  };
  
  const handleTaskCreate = (newTask: Omit<typeof tasks[0], 'id'>) => {
    // In a real implementation, you would create the task on the server
    const task = {
      ...newTask,
      id: uuidv4(),
    };
    
    setTasks([...tasks, task]);
  };
  
  const handleOpenExportDialog = () => {
    setOpenExportDialog(true);
  };
  
  const handleCloseExportDialog = () => {
    setOpenExportDialog(false);
  };
  
  const handleExport = async () => {
    try {
      // In a real implementation, you would call the export API
      // For now, we'll just close the dialog
      handleCloseExportDialog();
      
      // Show success message
      alert(`Tasks exported as ${exportFormat}`);
    } catch (err: any) {
      setError(err.message || `Failed to export tasks as ${exportFormat}`);
    }
  };
  
  const handleOpenIntegrationDialog = () => {
    setOpenIntegrationDialog(true);
    setProjectName(`Tasks from ${new Date().toLocaleDateString()}`);
  };
  
  const handleCloseIntegrationDialog = () => {
    setOpenIntegrationDialog(false);
  };
  
  const handleExportToIntegration = async () => {
    try {
      // In a real implementation, you would call the integration API
      // For now, we'll just close the dialog
      handleCloseIntegrationDialog();
      
      // Show success message
      alert(`Tasks exported to ${integrationType}`);
    } catch (err: any) {
      setError(err.message || `Failed to export tasks to ${integrationType}`);
    }
  };
  
  if (loading) {
    return <LoadingScreen message="Loading tasks..." />;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Development Tasks"
        subtitle="Manage and organize development tasks"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: 'Tasks' },
        ]}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleOpenExportDialog}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={handleOpenIntegrationDialog}
            >
              Export to Tool
            </Button>
          </Box>
        }
      />
      
      {error && <ErrorMessage message={error} />}
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              variant="outlined"
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="category-filter-label">Category</InputLabel>
              <Select
                labelId="category-filter-label"
                id="category-filter"
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {Array.from(new Set(tasks.map(task => task.category))).filter(Boolean).map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="priority-filter-label">Priority</InputLabel>
              <Select
                labelId="priority-filter-label"
                id="priority-filter"
                value={priorityFilter}
                label="Priority"
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="">All Priorities</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<SortIcon />}
              onClick={handleSortMenuOpen}
              size="small"
            >
              Sort
            </Button>
            <Menu
              anchorEl={sortAnchorEl}
              open={Boolean(sortAnchorEl)}
              onClose={handleSortMenuClose}
            >
              <MenuItem
                onClick={() => handleSort('name')}
                selected={sortBy === 'name'}
              >
                Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </MenuItem>
              <MenuItem
                onClick={() => handleSort('priority')}
                selected={sortBy === 'priority'}
              >
                Priority {sortBy === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
              </MenuItem>
              <MenuItem
                onClick={() => handleSort('category')}
                selected={sortBy === 'category'}
              >
                Category {sortBy === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
              </MenuItem>
            </Menu>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Task count */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </Typography>
      </Box>
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="task view tabs"
        >
          <Tab
            icon={<ViewModuleIcon />}
            label="Board"
            id="tasks-tab-0"
            aria-controls="tasks-tabpanel-0"
          />
          <Tab
            icon={<ViewListIcon />}
            label="Dependencies"
            id="tasks-tab-1"
            aria-controls="tasks-tabpanel-1"
          />
        </Tabs>
      </Paper>
      
      {/* Tab content */}
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <TabPanel value={tabValue} index={0}>
          <TaskBoard
            tasks={filteredTasks}
            onTaskMove={handleTaskMove}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
            onTaskCreate={handleTaskCreate}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <TaskDependencyGraph
              tasks={filteredTasks}
              onTaskClick={(taskId) => console.log(`Clicked task ${taskId}`)}
            />
          </Paper>
        </TabPanel>
      </Box>
      
      {/* Export Dialog */}
      <Dialog open={openExportDialog} onClose={handleCloseExportDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Export Tasks</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="export-format-label">Export Format</InputLabel>
            <Select
              labelId="export-format-label"
              id="export-format"
              value={exportFormat}
              label="Export Format"
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
            >
              <MenuItem value={ExportFormat.JSON}>JSON</MenuItem>
              <MenuItem value={ExportFormat.MARKDOWN}>Markdown</MenuItem>
              <MenuItem value={ExportFormat.TEXT}>Plain Text</MenuItem>
              <MenuItem value={ExportFormat.PDF}>PDF</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExportDialog}>Cancel</Button>
          <Button onClick={handleExport} variant="contained">
            Export
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Integration Dialog */}
      <Dialog open={openIntegrationDialog} onClose={handleCloseIntegrationDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Export to Project Management Tool</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel id="integration-type-label">Tool</InputLabel>
            <Select
              labelId="integration-type-label"
              id="integration-type"
              value={integrationType}
              label="Tool"
              onChange={(e) => setIntegrationType(e.target.value as IntegrationType)}
            >
              {availableIntegrations.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            margin="dense"
            id="project-name"
            label="Project Name"
            type="text"
            fullWidth
            variant="outlined"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseIntegrationDialog}>Cancel</Button>
          <Button
            onClick={handleExportToIntegration}
            variant="contained"
            disabled={!projectName.trim()}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TasksPage;
