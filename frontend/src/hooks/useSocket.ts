import { useState, useEffect, useCallback, useRef } from 'react';
import socketService, { SocketEvent } from '@/services/socketService';
import { useAuth } from './useAuth';

// Socket hook options
interface UseSocketOptions {
  // Whether to auto-connect on mount
  autoConnect?: boolean;
  // Whether to auto-authenticate on connect
  autoAuthenticate?: boolean;
  // Project ID to join
  projectId?: string;
  // Events to listen for
  events?: Record<string, (...args: any[]) => void>;
}

// Socket hook return type
interface UseSocketReturn {
  // Whether the socket is connected
  isConnected: boolean;
  // Whether the socket is authenticated
  isAuthenticated: boolean;
  // Connect to the socket
  connect: () => Promise<void>;
  // Disconnect from the socket
  disconnect: () => void;
  // Authenticate the socket
  authenticate: () => Promise<void>;
  // Join a project
  joinProject: (projectId: string) => Promise<void>;
  // Leave a project
  leaveProject: (projectId: string) => void;
  // Update a task
  updateTask: (taskId: string, data: any) => void;
  // Move a task
  moveTask: (taskId: string, source: string, destination: string, index: number) => void;
  // Send user activity
  sendUserActivity: (projectId: string, activity: string) => void;
  // Add an event listener
  on: (event: string, handler: (...args: any[]) => void) => void;
  // Remove an event listener
  off: (event: string, handler: (...args: any[]) => void) => void;
}

/**
 * Hook for using the socket service
 * @param options - Socket hook options
 * @returns Socket hook return value
 */
export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const eventsRef = useRef<Record<string, (...args: any[]) => void>>({});
  
  // Connect to the socket
  const connect = useCallback(async () => {
    try {
      await socketService.init();
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect to socket:', error);
      setIsConnected(false);
    }
  }, []);
  
  // Disconnect from the socket
  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setIsAuthenticated(false);
  }, []);
  
  // Authenticate the socket
  const authenticate = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Socket not connected');
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    try {
      await socketService.authenticate(token);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to authenticate socket:', error);
      setIsAuthenticated(false);
      throw error;
    }
  }, [isConnected]);
  
  // Join a project
  const joinProject = useCallback(
    async (projectId: string) => {
      if (!isConnected) {
        throw new Error('Socket not connected');
      }
      
      if (!isAuthenticated) {
        throw new Error('Socket not authenticated');
      }
      
      try {
        await socketService.joinProject(projectId);
      } catch (error) {
        console.error('Failed to join project:', error);
        throw error;
      }
    },
    [isConnected, isAuthenticated]
  );
  
  // Leave a project
  const leaveProject = useCallback(
    (projectId: string) => {
      if (!isConnected) {
        console.error('Socket not connected');
        return;
      }
      
      socketService.leaveProject(projectId);
    },
    [isConnected]
  );
  
  // Update a task
  const updateTask = useCallback(
    (taskId: string, data: any) => {
      if (!isConnected) {
        console.error('Socket not connected');
        return;
      }
      
      socketService.updateTask(taskId, data);
    },
    [isConnected]
  );
  
  // Move a task
  const moveTask = useCallback(
    (taskId: string, source: string, destination: string, index: number) => {
      if (!isConnected) {
        console.error('Socket not connected');
        return;
      }
      
      socketService.moveTask(taskId, source, destination, index);
    },
    [isConnected]
  );
  
  // Send user activity
  const sendUserActivity = useCallback(
    (projectId: string, activity: string) => {
      if (!isConnected) {
        console.error('Socket not connected');
        return;
      }
      
      socketService.sendUserActivity(projectId, activity);
    },
    [isConnected]
  );
  
  // Add an event listener
  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketService.on(event, handler);
    eventsRef.current[event] = handler;
  }, []);
  
  // Remove an event listener
  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketService.off(event, handler);
    delete eventsRef.current[event];
  }, []);
  
  // Set up connection event handlers
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      
      // Auto-authenticate if enabled
      if (options.autoAuthenticate) {
        authenticate().catch(console.error);
      }
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
      setIsAuthenticated(false);
    };
    
    const handleAuthenticated = () => {
      setIsAuthenticated(true);
      
      // Auto-join project if enabled
      if (options.projectId) {
        joinProject(options.projectId).catch(console.error);
      }
    };
    
    const handleAuthenticationError = () => {
      setIsAuthenticated(false);
    };
    
    // Add event listeners
    socketService.on(SocketEvent.CONNECT, handleConnect);
    socketService.on(SocketEvent.DISCONNECT, handleDisconnect);
    socketService.on(SocketEvent.AUTHENTICATED, handleAuthenticated);
    socketService.on(SocketEvent.AUTHENTICATION_ERROR, handleAuthenticationError);
    
    // Add custom event listeners
    if (options.events) {
      Object.entries(options.events).forEach(([event, handler]) => {
        socketService.on(event, handler);
        eventsRef.current[event] = handler;
      });
    }
    
    // Auto-connect if enabled
    if (options.autoConnect) {
      connect().catch(console.error);
    }
    
    // Clean up event listeners
    return () => {
      socketService.off(SocketEvent.CONNECT, handleConnect);
      socketService.off(SocketEvent.DISCONNECT, handleDisconnect);
      socketService.off(SocketEvent.AUTHENTICATED, handleAuthenticated);
      socketService.off(SocketEvent.AUTHENTICATION_ERROR, handleAuthenticationError);
      
      // Remove custom event listeners
      Object.entries(eventsRef.current).forEach(([event, handler]) => {
        socketService.off(event, handler);
      });
      
      // Leave project if joined
      if (options.projectId && isConnected) {
        socketService.leaveProject(options.projectId);
      }
    };
  }, [
    options.autoConnect,
    options.autoAuthenticate,
    options.projectId,
    options.events,
    connect,
    authenticate,
    joinProject,
    isConnected,
  ]);
  
  return {
    isConnected,
    isAuthenticated,
    connect,
    disconnect,
    authenticate,
    joinProject,
    leaveProject,
    updateTask,
    moveTask,
    sendUserActivity,
    on,
    off,
  };
}
