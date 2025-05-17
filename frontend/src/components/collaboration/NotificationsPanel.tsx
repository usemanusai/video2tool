import React, { useState } from 'react';
import {
  Box,
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  Button,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ClearAll as ClearAllIcon,
} from '@mui/icons-material';
import { useCollaboration } from '@/context/CollaborationContext';
import { useTranslation } from 'react-i18next';

const NotificationsPanel: React.FC = () => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useCollaboration();
  const { t } = useTranslation();
  const theme = useTheme();
  
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  
  // Count unread notifications
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  
  // Handle open/close
  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  // Handle mark as read
  const handleMarkAsRead = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };
  
  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead();
  };
  
  // Format notification time
  const formatTime = (date: Date): string => {
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
  
  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <InfoIcon fontSize="small" color="info" />;
      case 'success':
        return <CheckIcon fontSize="small" color="success" />;
      case 'warning':
        return <WarningIcon fontSize="small" color="warning" />;
      case 'error':
        return <ErrorIcon fontSize="small" color="error" />;
      default:
        return <InfoIcon fontSize="small" color="info" />;
    }
  };
  
  return (
    <>
      <Tooltip title={t('notifications.title')}>
        <IconButton color="inherit" onClick={handleOpen}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 400,
            overflow: 'hidden',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1,
            bgcolor: 'background.default',
          }}
        >
          <Typography variant="subtitle1">
            {t('notifications.title')}
            {unreadCount > 0 && (
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                ({unreadCount} {t('notifications.unread')})
              </Typography>
            )}
          </Typography>
          
          {notifications.length > 0 && (
            <Tooltip title={t('notifications.markAllAsRead')}>
              <IconButton size="small" onClick={handleMarkAllAsRead}>
                <ClearAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        <Divider />
        
        <List
          sx={{
            maxHeight: 350,
            overflow: 'auto',
            p: 0,
          }}
        >
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText
                primary={
                  <Typography variant="body2" color="text.secondary" align="center">
                    {t('notifications.empty')}
                  </Typography>
                }
              />
            </ListItem>
          ) : (
            notifications.map((notification) => (
              <ListItem
                key={notification.id}
                divider
                sx={{
                  bgcolor: notification.read
                    ? 'transparent'
                    : theme.palette.action.hover,
                }}
                secondaryAction={
                  !notification.read && (
                    <Tooltip title={t('notifications.markAsRead')}>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )
                }
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    width: '100%',
                  }}
                >
                  <Box sx={{ mr: 1, mt: 0.5 }}>
                    {getNotificationIcon(notification.type)}
                  </Box>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: notification.read ? 'normal' : 'bold',
                        }}
                      >
                        {notification.message}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(new Date(notification.timestamp))}
                      </Typography>
                    }
                  />
                </Box>
              </ListItem>
            ))
          )}
        </List>
      </Popover>
    </>
  );
};

export default NotificationsPanel;
