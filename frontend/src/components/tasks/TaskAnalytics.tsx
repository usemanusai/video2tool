import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';

// Task interface
interface Task {
  id: string;
  name: string;
  description?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: string;
  estimate?: string;
  created_at: string;
  updated_at: string;
}

// Component props
interface TaskAnalyticsProps {
  tasks: Task[];
}

const TaskAnalytics: React.FC<TaskAnalyticsProps> = ({ tasks }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // Calculate task statistics
  const statistics = useMemo(() => {
    // Status counts
    const statusCounts: Record<string, number> = {};
    tasks.forEach((task) => {
      const status = task.status || 'todo';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    // Priority counts
    const priorityCounts: Record<string, number> = {};
    tasks.forEach((task) => {
      const priority = task.priority || 'medium';
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    });
    
    // Category counts
    const categoryCounts: Record<string, number> = {};
    tasks.forEach((task) => {
      const category = task.category || 'other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    // Tasks created over time
    const createdOverTime: Record<string, number> = {};
    tasks.forEach((task) => {
      const date = new Date(task.created_at).toISOString().split('T')[0];
      createdOverTime[date] = (createdOverTime[date] || 0) + 1;
    });
    
    // Sort dates for the time series chart
    const sortedDates = Object.keys(createdOverTime).sort();
    const timeSeriesData = sortedDates.map((date) => ({
      date,
      count: createdOverTime[date],
    }));
    
    // Calculate completion rate
    const completedTasks = tasks.filter((task) => task.status === 'done').length;
    const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
    
    return {
      statusCounts,
      priorityCounts,
      categoryCounts,
      timeSeriesData,
      completionRate,
      totalTasks: tasks.length,
      completedTasks,
    };
  }, [tasks]);
  
  // Prepare chart data
  const statusData = useMemo(() => {
    return Object.entries(statistics.statusCounts).map(([status, count]) => ({
      name: t(`tasks.status.${status}`),
      value: count,
    }));
  }, [statistics.statusCounts, t]);
  
  const priorityData = useMemo(() => {
    return Object.entries(statistics.priorityCounts).map(([priority, count]) => ({
      name: t(`tasks.priority.${priority}`),
      value: count,
    }));
  }, [statistics.priorityCounts, t]);
  
  const categoryData = useMemo(() => {
    return Object.entries(statistics.categoryCounts).map(([category, count]) => ({
      name: category,
      value: count,
    }));
  }, [statistics.categoryCounts]);
  
  // Chart colors
  const statusColors = {
    todo: theme.palette.grey[500],
    inProgress: theme.palette.primary.main,
    review: theme.palette.secondary.main,
    done: theme.palette.success.main,
  };
  
  const priorityColors = {
    high: theme.palette.error.main,
    medium: theme.palette.warning.main,
    low: theme.palette.info.main,
  };
  
  const categoryColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1, boxShadow: 1 }}>
          <Typography variant="body2">{label}</Typography>
          <Typography variant="body2" color="primary">
            {`${t('tasks.count')}: ${payload[0].value}`}
          </Typography>
        </Paper>
      );
    }
    
    return null;
  };
  
  return (
    <Box>
      <Grid container spacing={3}>
        {/* Summary statistics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('tasks.analytics.summary')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {statistics.totalTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('tasks.analytics.totalTasks')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {statistics.completedTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('tasks.analytics.completedTasks')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {statistics.completionRate.toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('tasks.analytics.completionRate')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {Object.keys(statistics.categoryCounts).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('tasks.analytics.categories')}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Status distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {t('tasks.analytics.statusDistribution')}
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={statusColors[entry.name.toLowerCase() as keyof typeof statusColors] || theme.palette.grey[500]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        {/* Priority distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {t('tasks.analytics.priorityDistribution')}
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priorityData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="value" name={t('tasks.count')}>
                    {priorityData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={priorityColors[entry.name.toLowerCase() as keyof typeof priorityColors] || theme.palette.grey[500]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        {/* Category distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {t('tasks.analytics.categoryDistribution')}
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={categoryColors[index % categoryColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        {/* Tasks created over time */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('tasks.analytics.tasksOverTime')}
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={statistics.timeSeriesData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name={t('tasks.analytics.tasksCreated')}
                    stroke={theme.palette.primary.main}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TaskAnalytics;
