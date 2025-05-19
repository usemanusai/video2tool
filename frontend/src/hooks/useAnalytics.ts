import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import {
  trackEvent,
  trackPageView,
  trackError,
  setUserProperties,
  EventCategory,
  EventAction,
  EventProperties,
  UserProperties,
} from '@/utils/analytics';

/**
 * Hook for using analytics in components
 * @returns Analytics functions
 */
export const useAnalytics = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Track page views when location changes
  useEffect(() => {
    // Extract page name from path
    const pathSegments = location.pathname.split('/').filter(Boolean);
    let pageName = pathSegments.length > 0 ? pathSegments[0] : 'home';
    
    // Capitalize first letter
    pageName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    
    // Track page view
    trackPageView(pageName, location.pathname, {
      search: location.search,
      hash: location.hash,
    });
  }, [location]);
  
  // Set user properties when user changes
  useEffect(() => {
    if (user) {
      setUserProperties({
        userId: user.id,
        email: user.email,
        name: user.full_name,
        isAuthenticated: true,
      });
    } else {
      setUserProperties({
        isAuthenticated: false,
      });
    }
  }, [user]);
  
  // Track event wrapper
  const logEvent = useCallback(
    (category: EventCategory, action: EventAction, properties: EventProperties = {}) => {
      trackEvent(category, action, properties);
    },
    []
  );
  
  // Track error wrapper
  const logError = useCallback(
    (errorType: 'api' | 'client', errorMessage: string, properties: EventProperties = {}) => {
      trackError(errorType, errorMessage, properties);
    },
    []
  );
  
  // Track auth events
  const logAuthEvent = useCallback(
    (action: 'login' | 'logout' | 'register' | 'password_reset', properties: EventProperties = {}) => {
      const actionMap = {
        login: EventAction.LOGIN,
        logout: EventAction.LOGOUT,
        register: EventAction.REGISTER,
        password_reset: EventAction.PASSWORD_RESET,
      };
      
      trackEvent(EventCategory.AUTH, actionMap[action], properties);
    },
    []
  );
  
  // Track project events
  const logProjectEvent = useCallback(
    (
      action: 'create' | 'update' | 'delete' | 'view',
      projectId: string,
      properties: EventProperties = {}
    ) => {
      const actionMap = {
        create: EventAction.CREATE,
        update: EventAction.UPDATE,
        delete: EventAction.DELETE,
        view: EventAction.VIEW,
      };
      
      trackEvent(EventCategory.PROJECT, actionMap[action], {
        project_id: projectId,
        ...properties,
      });
    },
    []
  );
  
  // Track video events
  const logVideoEvent = useCallback(
    (
      action: 'upload' | 'process' | 'analyze',
      videoId: string,
      properties: EventProperties = {}
    ) => {
      const actionMap = {
        upload: EventAction.UPLOAD,
        process: EventAction.PROCESS,
        analyze: EventAction.ANALYZE,
      };
      
      trackEvent(EventCategory.VIDEO, actionMap[action], {
        video_id: videoId,
        ...properties,
      });
    },
    []
  );
  
  // Track specification events
  const logSpecificationEvent = useCallback(
    (
      action: 'generate' | 'export',
      specId: string,
      properties: EventProperties = {}
    ) => {
      const actionMap = {
        generate: EventAction.GENERATE,
        export: EventAction.EXPORT,
      };
      
      trackEvent(EventCategory.SPECIFICATION, actionMap[action], {
        specification_id: specId,
        ...properties,
      });
    },
    []
  );
  
  // Track task events
  const logTaskEvent = useCallback(
    (
      action: 'create' | 'update' | 'delete' | 'move' | 'complete',
      taskId: string,
      properties: EventProperties = {}
    ) => {
      const actionMap = {
        create: EventAction.CREATE,
        update: EventAction.UPDATE,
        delete: EventAction.DELETE,
        move: EventAction.MOVE,
        complete: EventAction.COMPLETE,
      };
      
      trackEvent(EventCategory.TASK, actionMap[action], {
        task_id: taskId,
        ...properties,
      });
    },
    []
  );
  
  // Track integration events
  const logIntegrationEvent = useCallback(
    (
      action: 'connect' | 'disconnect' | 'sync',
      integrationType: string,
      properties: EventProperties = {}
    ) => {
      const actionMap = {
        connect: EventAction.CONNECT,
        disconnect: EventAction.DISCONNECT,
        sync: EventAction.SYNC,
      };
      
      trackEvent(EventCategory.INTEGRATION, actionMap[action], {
        integration_type: integrationType,
        ...properties,
      });
    },
    []
  );
  
  return {
    logEvent,
    logError,
    logAuthEvent,
    logProjectEvent,
    logVideoEvent,
    logSpecificationEvent,
    logTaskEvent,
    logIntegrationEvent,
  };
};
