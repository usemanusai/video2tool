/**
 * Accessibility utilities
 */

/**
 * Creates props for screen reader only text
 * @returns CSS properties for screen reader only elements
 */
export const srOnly = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: '0',
};

/**
 * Creates props for elements that should be visible to screen readers
 * but appear as disabled to other users
 * @returns Aria properties for visually disabled elements
 */
export const ariaDisabled = {
  'aria-disabled': true,
  tabIndex: -1,
};

/**
 * Creates props for skip links
 * @returns CSS properties for skip links
 */
export const skipLink = {
  position: 'absolute',
  top: '-40px',
  left: '0',
  padding: '8px',
  zIndex: 100,
  backgroundColor: '#fff',
  transition: 'top 0.2s',
  '&:focus': {
    top: '0',
  },
};

/**
 * Creates an ID for ARIA attributes
 * @param prefix - Prefix for the ID
 * @returns A unique ID with the given prefix
 */
export const createAriaId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Announces a message to screen readers
 * @param message - Message to announce
 * @param politeness - Politeness level (assertive or polite)
 */
export const announce = (
  message: string,
  politeness: 'assertive' | 'polite' = 'polite'
): void => {
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', politeness);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.setAttribute('style', 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0;');
  
  document.body.appendChild(announcer);
  
  // Use setTimeout to ensure the DOM has time to register the live region
  setTimeout(() => {
    announcer.textContent = message;
    
    // Clean up after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }, 100);
};

/**
 * Hook to handle keyboard navigation for interactive elements
 * @param callback - Function to call when the key is pressed
 * @param keys - Array of keys to listen for
 * @returns Event handler for keyboard events
 */
export const handleKeyboardNavigation = (
  callback: () => void,
  keys: string[] = ['Enter', ' ']
) => {
  return (event: React.KeyboardEvent): void => {
    if (keys.includes(event.key)) {
      event.preventDefault();
      callback();
    }
  };
};

/**
 * Creates props for a button that looks like a link
 * @returns Props for a button that looks like a link
 */
export const buttonAsLink = {
  background: 'none',
  border: 'none',
  padding: '0',
  color: 'inherit',
  textDecoration: 'underline',
  cursor: 'pointer',
};
