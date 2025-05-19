import React from 'react';
import {
  Box,
  Avatar,
  Tooltip,
  Badge,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  useTheme,
} from '@mui/material';
import { useCollaboration } from '@/context/CollaborationContext';
import { useTranslation } from 'react-i18next';

// Status colors
const statusColors = {
  online: '#4caf50', // Green
  idle: '#ff9800', // Orange
  offline: '#9e9e9e', // Grey
};

interface ActiveUsersProps {
  variant?: 'avatars' | 'list';
  maxUsers?: number;
  showStatus?: boolean;
  showActivity?: boolean;
}

const ActiveUsers: React.FC<ActiveUsersProps> = ({
  variant = 'avatars',
  maxUsers = 5,
  showStatus = true,
  showActivity = true,
}) => {
  const { users } = useCollaboration();
  const { t } = useTranslation();
  const theme = useTheme();
  
  // Sort users by status and last activity
  const sortedUsers = [...users].sort((a, b) => {
    // Online users first
    if (a.status !== b.status) {
      if (a.status === 'online') return -1;
      if (b.status === 'online') return 1;
      if (a.status === 'idle') return -1;
      if (b.status === 'idle') return 1;
    }
    
    // Then by last activity
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });
  
  // Limit number of users to display
  const displayUsers = sortedUsers.slice(0, maxUsers);
  const remainingUsers = sortedUsers.length - maxUsers;
  
  // Format last activity time
  const formatLastActivity = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    
    if (diffSec < 60) {
      return t('time.now');
    } else if (diffMin < 60) {
      return t('time.minutesAgo', { count: diffMin });
    } else if (diffHour < 24) {
      return t('time.hoursAgo', { count: diffHour });
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Render avatars variant
  if (variant === 'avatars') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {displayUsers.map((user) => (
          <Tooltip
            key={user.id}
            title={
              <Box>
                <Typography variant="body2">{user.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.status === 'online'
                    ? t('status.online')
                    : user.status === 'idle'
                    ? t('status.idle')
                    : t('status.offline')}
                  {showActivity && user.currentActivity && ` - ${user.currentActivity}`}
                </Typography>
              </Box>
            }
            arrow
          >
            <Box sx={{ position: 'relative', mr: -1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: '0.875rem',
                  border: `2px solid ${theme.palette.background.paper}`,
                }}
              >
                {getInitials(user.name)}
              </Avatar>
              {showStatus && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: statusColors[user.status],
                    border: `1px solid ${theme.palette.background.paper}`,
                  }}
                />
              )}
            </Box>
          </Tooltip>
        ))}
        
        {remainingUsers > 0 && (
          <Tooltip
            title={`${remainingUsers} more ${
              remainingUsers === 1 ? 'user' : 'users'
            }`}
            arrow
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.75rem',
                bgcolor: theme.palette.grey[500],
                border: `2px solid ${theme.palette.background.paper}`,
              }}
            >
              +{remainingUsers}
            </Avatar>
          </Tooltip>
        )}
      </Box>
    );
  }
  
  // Render list variant
  return (
    <Paper variant="outlined" sx={{ maxWidth: 300 }}>
      <Box sx={{ p: 1, bgcolor: 'background.default' }}>
        <Typography variant="subtitle2">
          {t('collaboration.activeUsers', { count: users.length })}
        </Typography>
      </Box>
      <Divider />
      <List dense disablePadding>
        {displayUsers.map((user) => (
          <ListItem key={user.id} divider>
            <ListItemAvatar sx={{ minWidth: 40 }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                variant="dot"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: statusColors[user.status],
                    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                  },
                }}
              >
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                  {getInitials(user.name)}
                </Avatar>
              </Badge>
            </ListItemAvatar>
            <ListItemText
              primary={user.name}
              secondary={
                <>
                  {formatLastActivity(new Date(user.lastActivity))}
                  {showActivity && user.currentActivity && (
                    <Typography
                      variant="caption"
                      component="div"
                      sx={{
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.currentActivity}
                    </Typography>
                  )}
                </>
              }
              primaryTypographyProps={{
                variant: 'body2',
                sx: { fontWeight: 500 },
              }}
              secondaryTypographyProps={{
                variant: 'caption',
              }}
            />
          </ListItem>
        ))}
        
        {remainingUsers > 0 && (
          <ListItem sx={{ justifyContent: 'center', py: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t('collaboration.andMoreUsers', { count: remainingUsers })}
            </Typography>
          </ListItem>
        )}
        
        {users.length === 0 && (
          <ListItem sx={{ justifyContent: 'center', py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('collaboration.noActiveUsers')}
            </Typography>
          </ListItem>
        )}
      </List>
    </Paper>
  );
};

export default ActiveUsers;
