const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Integration types
const IntegrationType = {
  TRELLO: 'trello',
  GITHUB: 'github',
  CLICKUP: 'clickup',
};

// Integration clients
const integrationClients = {
  [IntegrationType.TRELLO]: null,
  [IntegrationType.GITHUB]: null,
  [IntegrationType.CLICKUP]: null,
};

/**
 * Validate integration authentication data
 * @param {object} data - Integration authentication data
 * @returns {object} - Validated data
 */
const validateIntegrationAuthData = (data) => {
  const schema = Joi.object({
    integrationType: Joi.string().valid(...Object.values(IntegrationType)).required(),
    apiKey: Joi.string().allow('', null),
    apiToken: Joi.string().allow('', null),
  });
  
  const { error, value } = schema.validate(data);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }
  
  // Ensure at least one of apiKey or apiToken is provided
  if (!value.apiKey && !value.apiToken) {
    throw new ApiError(400, 'Either apiKey or apiToken must be provided');
  }
  
  return value;
};

/**
 * @desc    Get available integration types
 * @route   GET /api/integrations/types
 * @access  Public
 */
const getIntegrationTypes = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: Object.values(IntegrationType),
  });
});

/**
 * @desc    Get initialized integrations
 * @route   GET /api/integrations/initialized
 * @access  Public
 */
const getInitializedIntegrations = asyncHandler(async (req, res) => {
  const initialized = Object.entries(integrationClients)
    .filter(([_, client]) => client !== null)
    .map(([type]) => type);
  
  res.status(200).json({
    success: true,
    data: initialized,
  });
});

/**
 * @desc    Authenticate with an integration
 * @route   POST /api/integrations/auth
 * @access  Public
 */
const authenticateIntegration = asyncHandler(async (req, res) => {
  // Validate request data
  const { integrationType, apiKey, apiToken } = validateIntegrationAuthData(req.body);
  
  // Initialize the client
  const success = await initializeClient(integrationType, apiKey, apiToken);
  
  res.status(200).json({
    success: true,
    data: { success },
  });
});

/**
 * @desc    Export tasks to an integration
 * @route   POST /api/integrations/export/:integrationType
 * @access  Private
 */
const exportToIntegration = asyncHandler(async (req, res) => {
  const integrationType = req.params.integrationType;
  
  // Validate integration type
  if (!Object.values(IntegrationType).includes(integrationType)) {
    throw new ApiError(400, `Invalid integration type: ${integrationType}`);
  }
  
  // Check if integration is initialized
  if (!integrationClients[integrationType]) {
    throw new ApiError(400, `Integration not initialized: ${integrationType}`);
  }
  
  // Validate request data
  const { tasksId, projectName, boardName } = req.body;
  
  if (!tasksId) {
    throw new ApiError(400, 'Tasks ID is required');
  }
  
  // Get the tasks from the database
  // In a real implementation, this would get the tasks from Supabase
  // For now, we'll use a placeholder
  const tasks = {
    id: tasksId,
    items: [
      {
        id: 'T1',
        name: 'Set up project structure',
        description: 'Initialize the project and set up the basic directory structure',
        category: 'Setup',
        priority: 'High',
        dependencies: [],
        estimate: '2 hours',
      },
      {
        id: 'T2',
        name: 'Implement user authentication',
        description: 'Set up user registration and login functionality',
        category: 'Backend',
        priority: 'High',
        dependencies: ['T1'],
        estimate: '4 hours',
      },
    ],
  };
  
  // Export the tasks to the integration
  const result = await exportTasksToIntegration(
    integrationType,
    tasks,
    projectName || 'Video2Tool Project',
    boardName || 'Development Tasks'
  );
  
  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Initialize an integration client
 * @param {string} integrationType - Integration type
 * @param {string} apiKey - API key
 * @param {string} apiToken - API token
 * @returns {Promise<boolean>} - Whether initialization was successful
 */
const initializeClient = async (integrationType, apiKey, apiToken) => {
  try {
    // In a real implementation, this would initialize the actual client
    // For now, we'll just store a placeholder
    switch (integrationType) {
      case IntegrationType.TRELLO:
        integrationClients[IntegrationType.TRELLO] = {
          apiKey,
          apiToken,
          initialized: true,
        };
        break;
      case IntegrationType.GITHUB:
        integrationClients[IntegrationType.GITHUB] = {
          apiToken,
          initialized: true,
        };
        break;
      case IntegrationType.CLICKUP:
        integrationClients[IntegrationType.CLICKUP] = {
          apiToken,
          initialized: true,
        };
        break;
      default:
        logger.error(`Unsupported integration type: ${integrationType}`);
        return false;
    }
    
    logger.info(`Successfully initialized ${integrationType} client`);
    return true;
  } catch (error) {
    logger.error(`Error initializing ${integrationType} client:`, error);
    return false;
  }
};

/**
 * Export tasks to an integration
 * @param {string} integrationType - Integration type
 * @param {object} tasks - Tasks data
 * @param {string} projectName - Project name
 * @param {string} boardName - Board name
 * @returns {Promise<object>} - Export result
 */
const exportTasksToIntegration = async (integrationType, tasks, projectName, boardName) => {
  try {
    // In a real implementation, this would export the tasks to the actual integration
    // For now, we'll return a placeholder result
    return {
      integrationType,
      exportedTasks: tasks.items.length,
      projectName,
      boardName,
      url: `https://example.com/${integrationType}/${projectName}`,
    };
  } catch (error) {
    logger.error(`Error exporting tasks to ${integrationType}:`, error);
    throw new ApiError(500, `Error exporting tasks to ${integrationType}`);
  }
};

module.exports = {
  getIntegrationTypes,
  getInitializedIntegrations,
  authenticateIntegration,
  exportToIntegration,
};
