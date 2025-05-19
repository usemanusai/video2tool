/**
 * Socket.IO implementation for real-time communication
 */
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

// Socket.IO event types
const SocketEvent = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  
  // Authentication events
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  AUTHENTICATION_ERROR: 'authentication_error',
  
  // Project events
  JOIN_PROJECT: 'join_project',
  LEAVE_PROJECT: 'leave_project',
  PROJECT_UPDATED: 'project_updated',
  
  // Task events
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_DELETED: 'task_deleted',
  TASK_MOVED: 'task_moved',
  
  // User presence events
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  USER_ACTIVITY: 'user_activity',
  
  // Notification events
  NOTIFICATION: 'notification',
  
  // Video processing events
  VIDEO_PROCESSING_STARTED: 'video_processing_started',
  VIDEO_PROCESSING_PROGRESS: 'video_processing_progress',
  VIDEO_PROCESSING_COMPLETED: 'video_processing_completed',
  VIDEO_PROCESSING_FAILED: 'video_processing_failed',
  
  // Specification generation events
  SPEC_GENERATION_STARTED: 'spec_generation_started',
  SPEC_GENERATION_PROGRESS: 'spec_generation_progress',
  SPEC_GENERATION_COMPLETED: 'spec_generation_completed',
  SPEC_GENERATION_FAILED: 'spec_generation_failed',
};

// Socket service class
class SocketService {
  constructor() {
    this.io = null;
    this.users = new Map(); // Map of user IDs to socket IDs
    this.projects = new Map(); // Map of project IDs to user IDs
  }
  
  /**
   * Initialize the socket service
   * @param {Object} server - HTTP server instance
   */
  init(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });
    
    logger.info('Socket.IO initialized');
    
    this.io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);
      
      // Handle authentication
      socket.on(SocketEvent.AUTHENTICATE, async (data) => {
        try {
          const { token } = data;
          
          if (!token) {
            throw new Error('No token provided');
          }
          
          // Verify token
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          const userId = decoded.sub || decoded.id;
          
          // Store user data
          socket.userId = userId;
          this.users.set(userId, socket.id);
          
          logger.info(`User authenticated: ${userId}`);
          
          // Notify client
          socket.emit(SocketEvent.AUTHENTICATED);
        } catch (error) {
          logger.error(`Authentication error: ${error.message}`);
          socket.emit(SocketEvent.AUTHENTICATION_ERROR, { message: error.message });
        }
      });
      
      // Handle joining a project
      socket.on(SocketEvent.JOIN_PROJECT, (data, callback) => {
        try {
          const { projectId } = data;
          
          if (!socket.userId) {
            throw new Error('Not authenticated');
          }
          
          // Join the project room
          socket.join(`project:${projectId}`);
          
          // Store project membership
          if (!this.projects.has(projectId)) {
            this.projects.set(projectId, new Set());
          }
          
          this.projects.get(projectId).add(socket.userId);
          
          logger.info(`User ${socket.userId} joined project ${projectId}`);
          
          // Notify other users in the project
          socket.to(`project:${projectId}`).emit(SocketEvent.USER_JOINED, {
            userId: socket.userId,
            timestamp: new Date().toISOString(),
          });
          
          // Send success response
          if (callback) {
            callback({ success: true });
          }
        } catch (error) {
          logger.error(`Join project error: ${error.message}`);
          
          if (callback) {
            callback({ error: error.message });
          }
        }
      });
      
      // Handle leaving a project
      socket.on(SocketEvent.LEAVE_PROJECT, (data) => {
        const { projectId } = data;
        
        if (!socket.userId) {
          return;
        }
        
        // Leave the project room
        socket.leave(`project:${projectId}`);
        
        // Remove project membership
        if (this.projects.has(projectId)) {
          this.projects.get(projectId).delete(socket.userId);
          
          if (this.projects.get(projectId).size === 0) {
            this.projects.delete(projectId);
          }
        }
        
        logger.info(`User ${socket.userId} left project ${projectId}`);
        
        // Notify other users in the project
        socket.to(`project:${projectId}`).emit(SocketEvent.USER_LEFT, {
          userId: socket.userId,
          timestamp: new Date().toISOString(),
        });
      });
      
      // Handle task updates
      socket.on(SocketEvent.TASK_UPDATED, (data) => {
        const { taskId, projectId } = data;
        
        if (!socket.userId || !projectId) {
          return;
        }
        
        logger.info(`Task ${taskId} updated by user ${socket.userId}`);
        
        // Broadcast to all users in the project
        this.io.to(`project:${projectId}`).emit(SocketEvent.TASK_UPDATED, {
          ...data,
          userId: socket.userId,
          timestamp: new Date().toISOString(),
        });
      });
      
      // Handle task moves
      socket.on(SocketEvent.TASK_MOVED, (data) => {
        const { taskId, projectId } = data;
        
        if (!socket.userId || !projectId) {
          return;
        }
        
        logger.info(`Task ${taskId} moved by user ${socket.userId}`);
        
        // Broadcast to all users in the project
        this.io.to(`project:${projectId}`).emit(SocketEvent.TASK_MOVED, {
          ...data,
          userId: socket.userId,
          timestamp: new Date().toISOString(),
        });
      });
      
      // Handle user activity
      socket.on(SocketEvent.USER_ACTIVITY, (data) => {
        const { projectId, activity } = data;
        
        if (!socket.userId || !projectId) {
          return;
        }
        
        logger.info(`User ${socket.userId} activity in project ${projectId}: ${activity}`);
        
        // Broadcast to all users in the project
        socket.to(`project:${projectId}`).emit(SocketEvent.USER_ACTIVITY, {
          userId: socket.userId,
          activity,
          timestamp: new Date().toISOString(),
        });
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
        
        if (socket.userId) {
          // Remove user from all projects
          this.projects.forEach((users, projectId) => {
            if (users.has(socket.userId)) {
              users.delete(socket.userId);
              
              // Notify other users in the project
              this.io.to(`project:${projectId}`).emit(SocketEvent.USER_LEFT, {
                userId: socket.userId,
                timestamp: new Date().toISOString(),
              });
              
              if (users.size === 0) {
                this.projects.delete(projectId);
              }
            }
          });
          
          // Remove user from users map
          this.users.delete(socket.userId);
        }
      });
    });
  }
  
  /**
   * Emit an event to all connected clients
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emit(event, data) {
    if (!this.io) {
      logger.error('Socket.IO not initialized');
      return;
    }
    
    this.io.emit(event, data);
  }
  
  /**
   * Emit an event to a specific user
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToUser(userId, event, data) {
    if (!this.io) {
      logger.error('Socket.IO not initialized');
      return;
    }
    
    const socketId = this.users.get(userId);
    
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }
  
  /**
   * Emit an event to all users in a project
   * @param {string} projectId - Project ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToProject(projectId, event, data) {
    if (!this.io) {
      logger.error('Socket.IO not initialized');
      return;
    }
    
    this.io.to(`project:${projectId}`).emit(event, data);
  }
}

// Create and export socket service instance
const socketService = new SocketService();
module.exports = socketService;