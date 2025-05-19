import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';

interface Task {
  id: string;
  name: string;
  dependencies?: string[];
  category?: string;
  priority?: string;
}

interface TaskDependencyGraphProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

const TaskDependencyGraph: React.FC<TaskDependencyGraphProps> = ({ tasks, onTaskClick }) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Calculate node positions
  const calculateNodePositions = () => {
    const positions: { [key: string]: { x: number; y: number } } = {};
    const nodeWidth = 150;
    const nodeHeight = 40;
    const horizontalSpacing = 200;
    const verticalSpacing = 80;
    
    // Create a dependency map
    const dependencyMap: { [key: string]: string[] } = {};
    tasks.forEach(task => {
      dependencyMap[task.id] = task.dependencies || [];
    });
    
    // Find root nodes (tasks with no dependencies)
    const rootNodes = tasks.filter(task => {
      return !tasks.some(t => t.dependencies?.includes(task.id));
    });
    
    // Find leaf nodes (tasks that are not dependencies of any other task)
    const leafNodes = tasks.filter(task => {
      return !Object.values(dependencyMap).some(deps => deps.includes(task.id));
    });
    
    // Calculate levels (distance from root)
    const levels: { [key: string]: number } = {};
    
    const calculateLevel = (taskId: string, currentLevel: number) => {
      if (levels[taskId] === undefined || currentLevel > levels[taskId]) {
        levels[taskId] = currentLevel;
      }
      
      const dependencies = dependencyMap[taskId] || [];
      dependencies.forEach(depId => {
        calculateLevel(depId, currentLevel + 1);
      });
    };
    
    // Start from leaf nodes and calculate levels
    leafNodes.forEach(node => {
      calculateLevel(node.id, 0);
    });
    
    // If there are no leaf nodes, start from all nodes
    if (leafNodes.length === 0) {
      tasks.forEach(task => {
        calculateLevel(task.id, 0);
      });
    }
    
    // Get the maximum level
    const maxLevel = Math.max(...Object.values(levels), 0);
    
    // Count nodes at each level
    const nodesAtLevel: { [key: number]: string[] } = {};
    Object.entries(levels).forEach(([taskId, level]) => {
      if (!nodesAtLevel[level]) {
        nodesAtLevel[level] = [];
      }
      nodesAtLevel[level].push(taskId);
    });
    
    // Calculate positions
    Object.entries(nodesAtLevel).forEach(([level, nodeIds]) => {
      const levelNum = parseInt(level);
      const x = (maxLevel - levelNum) * horizontalSpacing + 50;
      
      nodeIds.forEach((nodeId, index) => {
        const y = index * verticalSpacing + 50;
        positions[nodeId] = { x, y };
      });
    });
    
    return { positions, nodeWidth, nodeHeight };
  };
  
  // Draw the graph
  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const { positions, nodeWidth, nodeHeight } = calculateNodePositions();
    
    // Set canvas size
    const maxX = Math.max(...Object.values(positions).map(pos => pos.x + nodeWidth), 600);
    const maxY = Math.max(...Object.values(positions).map(pos => pos.y + nodeHeight), 400);
    
    canvas.width = maxX + 50;
    canvas.height = maxY + 50;
    
    // Draw edges (dependencies)
    ctx.strokeStyle = theme.palette.divider;
    ctx.lineWidth = 2;
    
    tasks.forEach(task => {
      if (task.dependencies && task.dependencies.length > 0) {
        const targetPos = positions[task.id];
        
        task.dependencies.forEach(depId => {
          const sourcePos = positions[depId];
          
          if (sourcePos && targetPos) {
            // Draw arrow from dependency to task
            ctx.beginPath();
            ctx.moveTo(sourcePos.x + nodeWidth, sourcePos.y + nodeHeight / 2);
            
            // Create a curved line
            const controlX = (sourcePos.x + nodeWidth + targetPos.x) / 2;
            const controlY = (sourcePos.y + targetPos.y + nodeHeight / 2) / 2;
            
            ctx.quadraticCurveTo(
              controlX,
              controlY,
              targetPos.x,
              targetPos.y + nodeHeight / 2
            );
            
            ctx.stroke();
            
            // Draw arrowhead
            const arrowSize = 8;
            const angle = Math.atan2(
              targetPos.y + nodeHeight / 2 - controlY,
              targetPos.x - controlX
            );
            
            ctx.beginPath();
            ctx.moveTo(targetPos.x, targetPos.y + nodeHeight / 2);
            ctx.lineTo(
              targetPos.x - arrowSize * Math.cos(angle - Math.PI / 6),
              targetPos.y + nodeHeight / 2 - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              targetPos.x - arrowSize * Math.cos(angle + Math.PI / 6),
              targetPos.y + nodeHeight / 2 - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fillStyle = theme.palette.divider;
            ctx.fill();
          }
        });
      }
    });
    
    // Draw nodes
    tasks.forEach(task => {
      const pos = positions[task.id];
      if (!pos) return;
      
      // Draw node rectangle
      ctx.fillStyle = theme.palette.background.paper;
      ctx.strokeStyle = getPriorityColor(task.priority);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(pos.x, pos.y, nodeWidth, nodeHeight, 8);
      ctx.fill();
      ctx.stroke();
      
      // Draw task name
      ctx.fillStyle = theme.palette.text.primary;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Truncate text if too long
      let displayName = task.name;
      if (ctx.measureText(displayName).width > nodeWidth - 20) {
        let width = 0;
        let i = 0;
        while (i < displayName.length && width < nodeWidth - 30) {
          width = ctx.measureText(displayName.substring(0, i) + '...').width;
          i++;
        }
        displayName = displayName.substring(0, i - 1) + '...';
      }
      
      ctx.fillText(displayName, pos.x + nodeWidth / 2, pos.y + nodeHeight / 2);
      
      // Draw category indicator if available
      if (task.category) {
        ctx.fillStyle = getCategoryColor(task.category);
        ctx.beginPath();
        ctx.arc(pos.x + 10, pos.y + 10, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    
    // Add click handler
    if (onTaskClick) {
      canvas.onclick = (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Check if a node was clicked
        for (const task of tasks) {
          const pos = positions[task.id];
          if (pos && 
              x >= pos.x && x <= pos.x + nodeWidth &&
              y >= pos.y && y <= pos.y + nodeHeight) {
            onTaskClick(task.id);
            break;
          }
        }
      };
    }
  };
  
  // Get color based on priority
  const getPriorityColor = (priority?: string): string => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return theme.palette.error.main;
      case 'medium':
        return theme.palette.warning.main;
      case 'low':
        return theme.palette.success.main;
      default:
        return theme.palette.primary.main;
    }
  };
  
  // Get color based on category
  const getCategoryColor = (category?: string): string => {
    // Simple hash function to generate consistent colors
    if (!category) return theme.palette.grey[500];
    
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };
  
  // Draw the graph when tasks change or theme changes
  useEffect(() => {
    drawGraph();
    
    // Redraw on window resize
    const handleResize = () => {
      drawGraph();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [tasks, theme]);
  
  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      {tasks.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No tasks available to display dependencies
          </Typography>
        </Paper>
      ) : (
        <canvas
          ref={canvasRef}
          style={{ minWidth: '100%', minHeight: 400 }}
        />
      )}
    </Box>
  );
};

export default TaskDependencyGraph;
