import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Collapse,
  Divider,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

interface TaskCardProps {
  task: {
    id: string;
    name: string;
    description?: string;
    category?: string;
    priority?: string;
    estimate?: string;
    dependencies?: string[];
    notes?: string;
  };
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onPriorityChange?: (taskId: string, direction: 'up' | 'down') => void;
  isDragging?: boolean;
}

const ExpandMoreButton = styled(IconButton)(({ theme }) => ({
  transform: 'rotate(0deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
  '&.expanded': {
    transform: 'rotate(180deg)',
  },
}));

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onPriorityChange,
  isDragging,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleEdit = () => {
    handleMenuClose();
    if (onEdit) onEdit(task.id);
  };
  
  const handleDelete = () => {
    handleMenuClose();
    if (onDelete) onDelete(task.id);
  };
  
  const handlePriorityUp = () => {
    handleMenuClose();
    if (onPriorityChange) onPriorityChange(task.id, 'up');
  };
  
  const handlePriorityDown = () => {
    handleMenuClose();
    if (onPriorityChange) onPriorityChange(task.id, 'down');
  };
  
  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };
  
  return (
    <Card
      sx={{
        mb: 2,
        opacity: isDragging ? 0.6 : 1,
        boxShadow: isDragging ? 8 : 1,
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" component="div" noWrap sx={{ maxWidth: '80%' }}>
            {task.name}
          </Typography>
          <IconButton
            size="small"
            aria-label="more"
            onClick={handleMenuOpen}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleEdit}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem onClick={handlePriorityUp}>
              <ListItemIcon>
                <ArrowUpwardIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Increase Priority</ListItemText>
            </MenuItem>
            <MenuItem onClick={handlePriorityDown}>
              <ListItemIcon>
                <ArrowDownwardIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Decrease Priority</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleDelete}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {task.category && (
            <Chip
              label={task.category}
              size="small"
              variant="outlined"
            />
          )}
          {task.priority && (
            <Chip
              label={task.priority}
              size="small"
              color={getPriorityColor(task.priority)}
            />
          )}
          {task.estimate && (
            <Chip
              label={`${task.estimate}`}
              size="small"
              variant="outlined"
            />
          )}
          {task.dependencies && task.dependencies.length > 0 && (
            <Chip
              icon={<LinkIcon />}
              label={`${task.dependencies.length} deps`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
      
      <CardActions disableSpacing sx={{ pt: 0 }}>
        <Button
          size="small"
          onClick={handleExpandClick}
          endIcon={
            <ExpandMoreIcon
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: (theme) =>
                  theme.transitions.create('transform', {
                    duration: theme.transitions.duration.shortest,
                  }),
              }}
            />
          }
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </Button>
      </CardActions>
      
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        <CardContent>
          {task.description && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Description
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {task.description}
              </Typography>
            </>
          )}
          
          {task.dependencies && task.dependencies.length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Dependencies
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {task.dependencies.map((depId) => (
                  <Chip
                    key={depId}
                    label={depId}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </>
          )}
          
          {task.notes && (
            <>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                Notes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {task.notes}
              </Typography>
            </>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default TaskCard;
