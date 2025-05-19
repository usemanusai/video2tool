/**
 * Analytics utility for tracking user behavior
 * 
 * This module provides a generic interface for analytics that can be
 * implemented with various analytics providers (Google Analytics,
 * Mixpanel, etc.) without changing the API.
 */

// Event categories
export enum EventCategory {
  AUTH = 'auth',
  PROJECT = 'project',
  VIDEO = 'video',
  SPECIFICATION = 'specification',
  TASK = 'task',
  INTEGRATION = 'integration',
  EXPORT = 'export',
  NAVIGATION = 'navigation',
  UI = 'ui',
  ERROR = 'error',
}

// Event actions
export enum EventAction {
  // Auth actions
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  PASSWORD_RESET = 'password_reset',
  
  // Project actions
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  
  // Video actions
  UPLOAD = 'upload',
  PROCESS = 'process',
  ANALYZE = 'analyze',
  
  // Specification actions
  GENERATE = 'generate',
  EXPORT = 'export',
  
  // Task actions
  MOVE = 'move',
  COMPLETE = 'complete',
  REORDER = 'reorder',
  
  // Integration actions
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  SYNC = 'sync',
  
  // Navigation actions
  PAGE_VIEW = 'page_view',
  CLICK = 'click',
  
  // UI actions
  TOGGLE = 'toggle',
  OPEN = 'open',
  CLOSE = 'close',
  
  // Error actions
  API_ERROR = 'api_error',
  CLIENT_ERROR = 'client_error',
}

// Event properties interface
export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

// User properties interface
export interface UserProperties {
  userId?: string;
  email?: string;
  name?: string;
  [key: string]: string | number | boolean | null | undefined;
}

// Analytics configuration
interface AnalyticsConfig {
  enabled: boolean;
  trackingId?: string;
  debug?: boolean;
}

// Default configuration
const defaultConfig: AnalyticsConfig = {
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV !== 'production',
};

// Current configuration
let config: AnalyticsConfig = { ...defaultConfig };

/**
 * Initialize analytics with the provided configuration
 * @param newConfig - Analytics configuration
 */
export const initAnalytics = (newConfig: Partial<AnalyticsConfig> = {}): void => {
  config = { ...defaultConfig, ...newConfig };
  
  if (config.enabled) {
    // Initialize analytics provider(s) here
    if (config.trackingId) {
      // Example: Initialize Google Analytics
      if (typeof window !== 'undefined' && 'gtag' in window) {
        (window as any).gtag('config', config.trackingId);
      }
      
      // Example: Initialize Mixpanel
      if (typeof window !== 'undefined' && 'mixpanel' in window) {
        (window as any).mixpanel.init(config.trackingId);
      }
    }
    
    if (config.debug) {
      console.log('Analytics initialized with config:', config);
    }
  }
};

/**
 * Track an event
 * @param category - Event category
 * @param action - Event action
 * @param properties - Event properties
 */
export const trackEvent = (
  category: EventCategory,
  action: EventAction,
  properties: EventProperties = {}
): void => {
  if (!config.enabled) return;
  
  const eventName = `${category}_${action}`;
  
  // Add timestamp to properties
  const eventProperties = {
    ...properties,
    timestamp: new Date().toISOString(),
    category,
    action,
  };
  
  // Track with Google Analytics
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', eventName, eventProperties);
  }
  
  // Track with Mixpanel
  if (typeof window !== 'undefined' && 'mixpanel' in window) {
    (window as any).mixpanel.track(eventName, eventProperties);
  }
  
  if (config.debug) {
    console.log(`Analytics event: ${eventName}`, eventProperties);
  }
};

/**
 * Track a page view
 * @param pageName - Name of the page
 * @param path - Path of the page
 * @param properties - Additional properties
 */
export const trackPageView = (
  pageName: string,
  path: string,
  properties: EventProperties = {}
): void => {
  trackEvent(EventCategory.NAVIGATION, EventAction.PAGE_VIEW, {
    page_name: pageName,
    page_path: path,
    ...properties,
  });
};

/**
 * Track an error
 * @param errorType - Type of error
 * @param errorMessage - Error message
 * @param properties - Additional properties
 */
export const trackError = (
  errorType: 'api' | 'client',
  errorMessage: string,
  properties: EventProperties = {}
): void => {
  trackEvent(
    EventCategory.ERROR,
    errorType === 'api' ? EventAction.API_ERROR : EventAction.CLIENT_ERROR,
    {
      error_message: errorMessage,
      ...properties,
    }
  );
};

/**
 * Set user properties
 * @param properties - User properties
 */
export const setUserProperties = (properties: UserProperties): void => {
  if (!config.enabled) return;
  
  // Set user properties in Google Analytics
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('set', 'user_properties', properties);
  }
  
  // Set user properties in Mixpanel
  if (typeof window !== 'undefined' && 'mixpanel' in window) {
    if (properties.userId) {
      (window as any).mixpanel.identify(properties.userId);
    }
    (window as any).mixpanel.people.set(properties);
  }
  
  if (config.debug) {
    console.log('Analytics user properties set:', properties);
  }
};

/**
 * Clear user properties and reset analytics
 */
export const resetAnalytics = (): void => {
  if (!config.enabled) return;
  
  // Reset Google Analytics
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('set', 'user_properties', null);
  }
  
  // Reset Mixpanel
  if (typeof window !== 'undefined' && 'mixpanel' in window) {
    (window as any).mixpanel.reset();
  }
  
  if (config.debug) {
    console.log('Analytics reset');
  }
};
