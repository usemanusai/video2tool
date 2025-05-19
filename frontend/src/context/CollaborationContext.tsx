import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { SocketEvent } from '@/services/socketService';

// User presence interface
interface UserPresence {
  id: string;
  name: string;
  email: string;
  lastActivity: Date;
  status: 'online' | 'idle' | 'offline';
  currentActivity?: string;
}

// Notification interface
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

// Collaboration context interface
interface CollaborationContextValue {
  // Project ID
  projectId: string | null;
  // Set project ID
  setProjectId: (projectId: string | null) => void;
  // Whether real-time collaboration is enabled
  isEnabled: boolean;
  // Enable or disable real-time collaboration
  setEnabled: (enabled: boolean) => void;
  // Whether the socket is connected
  isConnected: boolean;
  // Whether the socket is authenticated
  isAuthenticated: boolean;
  // Users currently present in the project
  users: UserPresence[];
  // Notifications
  notifications: Notification[];
  // Mark a notification as read
  markNotificationAsRead: (notificationId: string) => void;
  // Mark all notifications as read
  markAllNotificationsAsRead: () => void;
  // Send user activity
  sendActivity: (activity: string) => void;
  // Join a project
  joinProject: (projectId: string) => Promise<void>;
  // Leave a project
  leaveProject: () => void;
}

// Create context
const CollaborationContext = createContext<CollaborationContextValue | undefined>(undefined);

// Collaboration provider props
interface CollaborationProviderProps {
  children: React.ReactNode;
}

// Collaboration provider component
export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isEnabled, setEnabled] = useState(true);
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Socket event handlers
  const socketEvents = {
    [SocketEvent.USER_JOINED]: (data: { user: UserPresence }) => {
      setUsers((prevUsers) => {
        // Add user if not already present
        if (!prevUsers.find((u) => u.id === data.user.id)) {
          return [...prevUsers, data.user];
        }
        return prevUsers;
      });
      
      // Add notification
      addNotification({
        type: 'info',
        message: `${data.user.name} joined the project`,
      });
    },
    [SocketEvent.USER_LEFT]: (data: { userId: string }) => {
      setUsers((prevUsers) => {
        // Find user
        const user = prevUsers.find((u) => u.id === data.userId);
        
        // Remove user
        const newUsers = prevUsers.filter((u) => u.id !== data.userId);
        
        // Add notification if user was found
        if (user) {
          addNotification({
            type: 'info',
            message: `${user.name} left the project`,
          });
        }
        
        return newUsers;
      });
    },
    [SocketEvent.USER_ACTIVITY]: (data: { userId: string; activity: string }) => {
      setUsers((prevUsers) => {
        // Update user activity
        return prevUsers.map((u) => {
          if (u.id === data.userId) {
            return {
              ...u,
              lastActivity: new Date(),
              currentActivity: data.activity,
            };
          }
          return u;
        });
      });
    },
    [SocketEvent.NOTIFICATION]: (data: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      // Add notification
      addNotification(data);
    },
    [SocketEvent.TASK_CREATED]: (data: { task: any; userId: string }) => {
      // Find user
      const user = users.find((u) => u.id === data.userId);
      
      // Add notification
      addNotification({
        type: 'info',
        message: `${user?.name || 'Someone'} created a new task: ${data.task.name}`,
        data: data.task,
      });
    },
    [SocketEvent.TASK_UPDATED]: (data: { task: any; userId: string }) => {
      // Find user
      const user = users.find((u) => u.id === data.userId);
      
      // Add notification
      addNotification({
        type: 'info',
        message: `${user?.name || 'Someone'} updated task: ${data.task.name}`,
        data: data.task,
      });
    },
    [SocketEvent.TASK_DELETED]: (data: { taskId: string; userId: string }) => {
      // Find user
      const user = users.find((u) => u.id === data.userId);
      
      // Add notification
      addNotification({
        type: 'warning',
        message: `${user?.name || 'Someone'} deleted a task`,
        data: { taskId: data.taskId },
      });
    },
    [SocketEvent.TASK_MOVED]: (data: {
      taskId: string;
      task: any;
      source: string;
      destination: string;
      userId: string;
    }) => {
      // Find user
      const user = users.find((u) => u.id === data.userId);
      
      // Add notification
      addNotification({
        type: 'info',
        message: `${user?.name || 'Someone'} moved task: ${data.task.name}`,
        data: {
          taskId: data.taskId,
          source: data.source,
          destination: data.destination,
        },
      });
    },
  };
  
  // Initialize socket
  const socket = useSocket({
    autoConnect: isEnabled,
    autoAuthenticate: isEnabled,
    events: socketEvents,
  });
  
  // Add notification
  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
        id: Math.random().toString(36).substring(2, 11),
        timestamp: new Date(),
        read: false,
        ...notification,
      };
      
      setNotifications((prevNotifications) => [
        newNotification,
        ...prevNotifications,
      ]);
    },
    []
  );
  
  // Mark notification as read
  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);
  
  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notification) => ({ ...notification, read: true }))
    );
  }, []);
  
  // Send user activity
  const sendActivity = useCallback(
    (activity: string) => {
      if (projectId && socket.isConnected && socket.isAuthenticated) {
        socket.sendUserActivity(projectId, activity);
      }
    },
    [projectId, socket]
  );
  
  // Join project
  const joinProject = useCallback(
    async (projectId: string) => {
      if (!isEnabled) {
        return;
      }
      
      // Connect and authenticate if needed
      if (!socket.isConnected) {
        await socket.connect();
      }
      
      if (!socket.isAuthenticated) {
        await socket.authenticate();
      }
      
      // Join project
      await socket.joinProject(projectId);
      setProjectId(projectId);
    },
    [isEnabled, socket]
  );
  
  // Leave project
  const leaveProject = useCallback(() => {
    if (projectId && socket.isConnected) {
      socket.leaveProject(projectId);
      setProjectId(null);
      setUsers([]);
    }
  }, [projectId, socket]);
  
  // Add current user to users list when authenticated
  useEffect(() => {
    if (socket.isAuthenticated && user && projectId) {
      setUsers((prevUsers) => {
        // Add current user if not already present
        if (!prevUsers.find((u) => u.id === user.id)) {
          const currentUser: UserPresence = {
            id: user.id,
            name: user.full_name || user.email,
            email: user.email,
            lastActivity: new Date(),
            status: 'online',
          };
          
          return [...prevUsers, currentUser];
        }
        
        return prevUsers;
      });
    }
  }, [socket.isAuthenticated, user, projectId]);
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (projectId && socket.isConnected) {
        socket.leaveProject(projectId);
      }
    };
  }, [projectId, socket]);
  
  // Context value
  const value: CollaborationContextValue = {
    projectId,
    setProjectId,
    isEnabled,
    setEnabled,
    isConnected: socket.isConnected,
    isAuthenticated: socket.isAuthenticated,
    users,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    sendActivity,
    joinProject,
    leaveProject,
  };
  
  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

// Hook for using the collaboration context
export const useCollaboration = (): CollaborationContextValue => {
  const context = useContext(CollaborationContext);
  
  if (context === undefined) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  
  return context;
};
