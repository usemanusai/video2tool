import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import TaskCard from './TaskCard';

interface Task {
  id: string;
  name: string;
  description?: string;
  category?: string;
  priority?: string;
  estimate?: string;
  dependencies?: string[];
  notes?: string;
  status: string;
}

interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

interface TaskBoardProps {
  tasks: Task[];
  onTaskMove?: (taskId: string, sourceColumn: string, destinationColumn: string, newIndex: number) => void;
  onTaskEdit?: (taskId: string, updatedTask: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskCreate?: (task: Omit<Task, 'id'>) => void;
}

const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  onTaskMove,
  onTaskEdit,
  onTaskDelete,
  onTaskCreate,
}) => {
  const theme = useTheme();
  
  // Define columns
  const initialColumns: { [key: string]: Column } = {
    backlog: {
      id: 'backlog',
      title: 'Backlog',
      taskIds: tasks.filter(task => task.status === 'backlog').map(task => task.id),
    },
    todo: {
      id: 'todo',
      title: 'To Do',
      taskIds: tasks.filter(task => task.status === 'todo').map(task => task.id),
    },
    inProgress: {
      id: 'inProgress',
      title: 'In Progress',
      taskIds: tasks.filter(task => task.status === 'inProgress').map(task => task.id),
    },
    done: {
      id: 'done',
      title: 'Done',
      taskIds: tasks.filter(task => task.status === 'done').map(task => task.id),
    },
  };
  
  const [columns, setColumns] = useState<{ [key: string]: Column }>(initialColumns);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentColumn, setCurrentColumn] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<Omit<Task, 'id'>>({
    name: '',
    description: '',
    category: '',
    priority: 'medium',
    status: 'backlog',
  });
  
  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    // If there's no destination or the item was dropped in the same place
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }
    
    // Get source and destination columns
    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];
    
    // If moving within the same column
    if (sourceColumn.id === destColumn.id) {
      const newTaskIds = Array.from(sourceColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      
      const newColumn = {
        ...sourceColumn,
        taskIds: newTaskIds,
      };
      
      setColumns({
        ...columns,
        [newColumn.id]: newColumn,
      });
    } else {
      // Moving from one column to another
      const sourceTaskIds = Array.from(sourceColumn.taskIds);
      sourceTaskIds.splice(source.index, 1);
      
      const destTaskIds = Array.from(destColumn.taskIds);
      destTaskIds.splice(destination.index, 0, draggableId);
      
      const newSourceColumn = {
        ...sourceColumn,
        taskIds: sourceTaskIds,
      };
      
      const newDestColumn = {
        ...destColumn,
        taskIds: destTaskIds,
      };
      
      setColumns({
        ...columns,
        [newSourceColumn.id]: newSourceColumn,
        [newDestColumn.id]: newDestColumn,
      });
      
      // Call the callback if provided
      if (onTaskMove) {
        onTaskMove(
          draggableId,
          sourceColumn.id,
          destColumn.id,
          destination.index
        );
      }
      
      // Update task status
      if (onTaskEdit) {
        const statusMap: { [key: string]: string } = {
          backlog: 'backlog',
          todo: 'todo',
          inProgress: 'inProgress',
          done: 'done',
        };
        
        onTaskEdit(draggableId, { status: statusMap[destColumn.id] });
      }
    }
  };
  
  const handleOpenDialog = (columnId: string) => {
    setCurrentColumn(columnId);
    setNewTask({
      ...newTask,
      status: columnId,
    });
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewTask({
      name: '',
      description: '',
      category: '',
      priority: 'medium',
      status: 'backlog',
    });
  };
  
  const handleCreateTask = () => {
    if (!newTask.name.trim()) return;
    
    if (onTaskCreate) {
      onTaskCreate(newTask);
    }
    
    handleCloseDialog();
  };
  
  const handleTaskEdit = (taskId: string) => {
    // In a real implementation, you would open an edit dialog
    console.log('Edit task:', taskId);
  };
  
  const handleTaskDelete = (taskId: string) => {
    if (onTaskDelete) {
      onTaskDelete(taskId);
    }
    
    // Update columns
    const newColumns = { ...columns };
    
    // Find which column contains the task
    Object.keys(newColumns).forEach(columnId => {
      const column = newColumns[columnId];
      const taskIndex = column.taskIds.indexOf(taskId);
      
      if (taskIndex !== -1) {
        // Remove the task from the column
        const newTaskIds = Array.from(column.taskIds);
        newTaskIds.splice(taskIndex, 1);
        
        newColumns[columnId] = {
          ...column,
          taskIds: newTaskIds,
        };
      }
    });
    
    setColumns(newColumns);
  };
  
  const handlePriorityChange = (taskId: string, direction: 'up' | 'down') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const priorityLevels = ['low', 'medium', 'high'];
    const currentIndex = priorityLevels.indexOf(task.priority?.toLowerCase() || 'medium');
    
    let newIndex = currentIndex;
    if (direction === 'up' && currentIndex < priorityLevels.length - 1) {
      newIndex = currentIndex + 1;
    } else if (direction === 'down' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    }
    
    if (newIndex !== currentIndex && onTaskEdit) {
      onTaskEdit(taskId, { priority: priorityLevels[newIndex] });
    }
  };
  
  return (
    <Box sx={{ height: '100%' }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {Object.values(columns).map(column => (
            <Grid item xs={12} sm={6} md={3} key={column.id}>
              <Paper
                sx={{
                  p: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: theme.palette.background.default,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">
                    {column.title} ({column.taskIds.length})
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(column.id)}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        flexGrow: 1,
                        minHeight: 100,
                        bgcolor: snapshot.isDraggingOver
                          ? 'action.hover'
                          : 'transparent',
                        transition: 'background-color 0.2s ease',
                        borderRadius: 1,
                        p: 1,
                        overflowY: 'auto',
                      }}
                    >
                      {column.taskIds.map((taskId, index) => {
                        const task = tasks.find(t => t.id === taskId);
                        if (!task) return null;
                        
                        return (
                          <Draggable key={taskId} draggableId={taskId} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TaskCard
                                  task={task}
                                  onEdit={handleTaskEdit}
                                  onDelete={handleTaskDelete}
                                  onPriorityChange={handlePriorityChange}
                                  isDragging={snapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      
                      {column.taskIds.length === 0 && (
                        <Box
                          sx={{
                            p: 2,
                            textAlign: 'center',
                            color: 'text.secondary',
                          }}
                        >
                          <Typography variant="body2">
                            No tasks
                          </Typography>
                          <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog(column.id)}
                            sx={{ mt: 1 }}
                          >
                            Add Task
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                </Droppable>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DragDropContext>
      
      {/* New Task Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add New Task
          {currentColumn && ` to ${columns[currentColumn]?.title}`}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Task Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newTask.name}
            onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
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
            rows={3}
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                id="category"
                label="Category"
                type="text"
                fullWidth
                variant="outlined"
                value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel id="priority-label">Priority</InputLabel>
                <Select
                  labelId="priority-label"
                  id="priority"
                  value={newTask.priority}
                  label="Priority"
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleCreateTask}
            variant="contained"
            disabled={!newTask.name.trim()}
          >
            Create Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskBoard;
