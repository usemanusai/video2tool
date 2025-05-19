import { io, Socket } from 'socket.io-client';

// Socket.io event types
export enum SocketEvent {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',

  // Authentication events
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  AUTHENTICATION_ERROR = 'authentication_error',

  // Project events
  JOIN_PROJECT = 'join_project',
  LEAVE_PROJECT = 'leave_project',
  PROJECT_UPDATED = 'project_updated',

  // Task events
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  TASK_MOVED = 'task_moved',

  // User presence events
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  USER_ACTIVITY = 'user_activity',

  // Notification events
  NOTIFICATION = 'notification',

  // Video processing events
  VIDEO_PROCESSING_STARTED = 'video_processing_started',
  VIDEO_PROCESSING_PROGRESS = 'video_processing_progress',
  VIDEO_PROCESSING_COMPLETED = 'video_processing_completed',
  VIDEO_PROCESSING_FAILED = 'video_processing_failed',

  // Specification generation events
  SPEC_GENERATION_STARTED = 'spec_generation_started',
  SPEC_GENERATION_PROGRESS = 'spec_generation_progress',
  SPEC_GENERATION_COMPLETED = 'spec_generation_completed',
  SPEC_GENERATION_FAILED = 'spec_generation_failed',
}

// Socket service configuration
interface SocketServiceConfig {
  url: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  timeout?: number;
}

// Default configuration
const defaultConfig: SocketServiceConfig = {
  url: import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000',
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
};

// Socket service class
class SocketService {
  private socket: Socket | null = null;
  private config: SocketServiceConfig;
  private eventHandlers: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor(config: Partial<SocketServiceConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Initialize the socket connection
   * @returns Promise that resolves when connected
   */
  public init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create socket instance
        this.socket = io(this.config.url, {
          autoConnect: this.config.autoConnect,
          reconnection: this.config.reconnection,
          reconnectionAttempts: this.config.reconnectionAttempts,
          reconnectionDelay: this.config.reconnectionDelay,
          timeout: this.config.timeout,
          transports: ['websocket', 'polling'],
        });

        // Set up connection event handlers
        this.socket.on(SocketEvent.CONNECT, () => {
          console.log('Socket connected');
          this.notifyEventHandlers(SocketEvent.CONNECT);
          resolve();
        });

        this.socket.on(SocketEvent.CONNECT_ERROR, (error) => {
          console.error('Socket connection error:', error);
          this.notifyEventHandlers(SocketEvent.CONNECT_ERROR, error);
          reject(error);
        });

        this.socket.on(SocketEvent.DISCONNECT, (reason) => {
          console.log('Socket disconnected:', reason);
          this.notifyEventHandlers(SocketEvent.DISCONNECT, reason);
        });

        // Connect if not auto-connecting
        if (!this.config.autoConnect) {
          this.socket.connect();
        }
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        reject(error);
      }
    });
  }

  /**
   * Authenticate the socket connection
   * @param token - Authentication token
   * @returns Promise that resolves when authenticated
   */
  public authenticate(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      // Set up authentication event handlers
      this.socket.once(SocketEvent.AUTHENTICATED, () => {
        console.log('Socket authenticated');
        this.notifyEventHandlers(SocketEvent.AUTHENTICATED);
        resolve();
      });

      this.socket.once(SocketEvent.AUTHENTICATION_ERROR, (error) => {
        console.error('Socket authentication error:', error);
        this.notifyEventHandlers(SocketEvent.AUTHENTICATION_ERROR, error);
        reject(error);
      });

      // Send authentication event
      this.socket.emit(SocketEvent.AUTHENTICATE, { token });
    });
  }

  /**
   * Join a project room
   * @param projectId - Project ID
   * @returns Promise that resolves when joined
   */
  public joinProject(projectId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.emit(SocketEvent.JOIN_PROJECT, { projectId }, (response: any) => {
        if (response.error) {
          console.error('Failed to join project:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('Joined project:', projectId);
          resolve();
        }
      });
    });
  }

  /**
   * Leave a project room
   * @param projectId - Project ID
   */
  public leaveProject(projectId: string): void {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit(SocketEvent.LEAVE_PROJECT, { projectId });
  }

  /**
   * Send a task update
   * @param taskId - Task ID
   * @param data - Task data
   */
  public updateTask(taskId: string, data: any): void {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit(SocketEvent.TASK_UPDATED, { taskId, ...data });
  }

  /**
   * Send a task move event
   * @param taskId - Task ID
   * @param source - Source column
   * @param destination - Destination column
   * @param index - New index in the destination column
   */
  public moveTask(
    taskId: string,
    source: string,
    destination: string,
    index: number
  ): void {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit(SocketEvent.TASK_MOVED, {
      taskId,
      source,
      destination,
      index,
    });
  }

  /**
   * Send user activity
   * @param projectId - Project ID
   * @param activity - Activity description
   */
  public sendUserActivity(projectId: string, activity: string): void {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit(SocketEvent.USER_ACTIVITY, { projectId, activity });
  }

  /**
   * Add an event handler
   * @param event - Event name
   * @param handler - Event handler function
   */
  public on(event: string, handler: (...args: any[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)?.add(handler);

    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  /**
   * Remove an event handler
   * @param event - Event name
   * @param handler - Event handler function
   */
  public off(event: string, handler: (...args: any[]) => void): void {
    const handlers = this.eventHandlers.get(event);

    if (handlers) {
      handlers.delete(handler);

      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }

    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  /**
   * Disconnect the socket
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check if socket is connected
   * @returns Whether the socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Notify all handlers for an event
   * @param event - Event name
   * @param args - Event arguments
   */
  private notifyEventHandlers(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);

    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }
}

// Create and export socket service instance
const socketService = new SocketService();
export default socketService;
