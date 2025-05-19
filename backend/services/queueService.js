const Queue = require('bull');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Queue service for managing background tasks
 */
class QueueService {
  constructor() {
    // Initialize queues
    this.videoQueue = new Queue('video-processing');
    this.specQueue = new Queue('specification-generation');
    this.taskQueue = new Queue('task-generation');
    
    // Store task handlers
    this.handlers = {};
    
    // Store task status
    this.tasks = new Map();
    
    // Configure concurrency
    const concurrency = config.memory.queueConcurrency;
    
    // Set up queue processors
    this.videoQueue.process(concurrency, this._processVideoQueue.bind(this));
    this.specQueue.process(concurrency, this._processSpecQueue.bind(this));
    this.taskQueue.process(concurrency, this._processTaskQueue.bind(this));
    
    // Set up event listeners
    this._setupEventListeners(this.videoQueue, 'video');
    this._setupEventListeners(this.specQueue, 'spec');
    this._setupEventListeners(this.taskQueue, 'task');
    
    logger.info(`Queue service initialized with concurrency: ${concurrency}`);
  }
  
  /**
   * Set up event listeners for a queue
   * @param {Queue} queue - Bull queue
   * @param {string} queueName - Queue name for logging
   * @private
   */
  _setupEventListeners(queue, queueName) {
    queue.on('completed', (job, result) => {
      logger.info(`${queueName} job ${job.id} completed`);
      this.tasks.set(job.data.taskId, {
        id: job.data.taskId,
        type: job.data.type,
        status: 'completed',
        result,
        completedAt: new Date().toISOString(),
      });
    });
    
    queue.on('failed', (job, error) => {
      logger.error(`${queueName} job ${job.id} failed:`, error);
      this.tasks.set(job.data.taskId, {
        id: job.data.taskId,
        type: job.data.type,
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString(),
      });
    });
    
    queue.on('stalled', (job) => {
      logger.warn(`${queueName} job ${job.id} stalled`);
    });
  }
  
  /**
   * Register a handler for a task type
   * @param {string} taskType - Task type
   * @param {Function} handler - Handler function
   */
  registerHandler(taskType, handler) {
    logger.info(`Registering handler for task type: ${taskType}`);
    this.handlers[taskType] = handler;
  }
  
  /**
   * Enqueue a video processing task
   * @param {string} taskType - Task type
   * @param {object} data - Task data
   * @returns {string} - Task ID
   */
  async enqueueVideoTask(taskType, data) {
    const taskId = uuidv4();
    
    // Store initial task status
    this.tasks.set(taskId, {
      id: taskId,
      type: taskType,
      status: 'queued',
      queuedAt: new Date().toISOString(),
    });
    
    // Add job to queue
    await this.videoQueue.add({
      taskId,
      type: taskType,
      data,
    });
    
    logger.info(`Enqueued video task ${taskId} of type ${taskType}`);
    
    return taskId;
  }
  
  /**
   * Enqueue a specification generation task
   * @param {string} taskType - Task type
   * @param {object} data - Task data
   * @returns {string} - Task ID
   */
  async enqueueSpecTask(taskType, data) {
    const taskId = uuidv4();
    
    // Store initial task status
    this.tasks.set(taskId, {
      id: taskId,
      type: taskType,
      status: 'queued',
      queuedAt: new Date().toISOString(),
    });
    
    // Add job to queue
    await this.specQueue.add({
      taskId,
      type: taskType,
      data,
    });
    
    logger.info(`Enqueued spec task ${taskId} of type ${taskType}`);
    
    return taskId;
  }
  
  /**
   * Enqueue a task generation task
   * @param {string} taskType - Task type
   * @param {object} data - Task data
   * @returns {string} - Task ID
   */
  async enqueueTaskGenerationTask(taskType, data) {
    const taskId = uuidv4();
    
    // Store initial task status
    this.tasks.set(taskId, {
      id: taskId,
      type: taskType,
      status: 'queued',
      queuedAt: new Date().toISOString(),
    });
    
    // Add job to queue
    await this.taskQueue.add({
      taskId,
      type: taskType,
      data,
    });
    
    logger.info(`Enqueued task generation task ${taskId} of type ${taskType}`);
    
    return taskId;
  }
  
  /**
   * Get task status
   * @param {string} taskId - Task ID
   * @returns {object|null} - Task status
   */
  getTaskStatus(taskId) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return { error: `Task not found: ${taskId}` };
    }
    
    return task;
  }
  
  /**
   * Process a video queue job
   * @param {object} job - Bull job
   * @returns {Promise<object>} - Job result
   * @private
   */
  async _processVideoQueue(job) {
    const { taskId, type, data } = job.data;
    
    logger.info(`Processing video job ${taskId} of type ${type}`);
    
    // Update task status
    this.tasks.set(taskId, {
      id: taskId,
      type,
      status: 'processing',
      processingStartedAt: new Date().toISOString(),
    });
    
    // Get handler for task type
    const handler = this.handlers[type];
    
    if (!handler) {
      throw new Error(`No handler registered for task type: ${type}`);
    }
    
    // Execute handler
    try {
      const result = await handler(data);
      return result;
    } catch (error) {
      logger.error(`Error processing video job ${taskId}:`, error);
      throw error;
    }
  }
  
  /**
   * Process a specification queue job
   * @param {object} job - Bull job
   * @returns {Promise<object>} - Job result
   * @private
   */
  async _processSpecQueue(job) {
    const { taskId, type, data } = job.data;
    
    logger.info(`Processing spec job ${taskId} of type ${type}`);
    
    // Update task status
    this.tasks.set(taskId, {
      id: taskId,
      type,
      status: 'processing',
      processingStartedAt: new Date().toISOString(),
    });
    
    // Get handler for task type
    const handler = this.handlers[type];
    
    if (!handler) {
      throw new Error(`No handler registered for task type: ${type}`);
    }
    
    // Execute handler
    try {
      const result = await handler(data);
      return result;
    } catch (error) {
      logger.error(`Error processing spec job ${taskId}:`, error);
      throw error;
    }
  }
  
  /**
   * Process a task generation queue job
   * @param {object} job - Bull job
   * @returns {Promise<object>} - Job result
   * @private
   */
  async _processTaskQueue(job) {
    const { taskId, type, data } = job.data;
    
    logger.info(`Processing task generation job ${taskId} of type ${type}`);
    
    // Update task status
    this.tasks.set(taskId, {
      id: taskId,
      type,
      status: 'processing',
      processingStartedAt: new Date().toISOString(),
    });
    
    // Get handler for task type
    const handler = this.handlers[type];
    
    if (!handler) {
      throw new Error(`No handler registered for task type: ${type}`);
    }
    
    // Execute handler
    try {
      const result = await handler(data);
      return result;
    } catch (error) {
      logger.error(`Error processing task generation job ${taskId}:`, error);
      throw error;
    }
  }
}

module.exports = new QueueService();
