const openRouter = require('../config/openrouter');
const logger = require('../utils/logger');
const { ApiError } = require('../middleware/errorHandler');

/**
 * OpenRouter service for AI processing
 */
class OpenRouterService {
  /**
   * Generate a completion using the OpenRouter API
   * @param {string} prompt - The prompt to send to the model
   * @param {string} systemPrompt - Optional system prompt
   * @param {string} model - Model to use (defaults to defaultModel)
   * @param {number} maxTokens - Maximum tokens to generate
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, systemPrompt = "", model = null, maxTokens = 1000) {
    try {
      return await openRouter.generateCompletion(prompt, systemPrompt, model, maxTokens);
    } catch (error) {
      logger.error('Error generating completion:', error);
      throw new ApiError(500, 'Error generating AI completion');
    }
  }
  
  /**
   * Generate a video analysis prompt
   * @param {object} videoData - Video data including transcription and visual elements
   * @returns {string} - Formatted prompt
   */
  generateVideoAnalysisPrompt(videoData) {
    const { transcription, visualElements, metadata } = videoData;
    
    // Create a structured prompt for the AI
    let prompt = `# Video Analysis Task\n\n`;
    prompt += `## Video Information\n`;
    prompt += `- Duration: ${metadata?.duration || 'Unknown'} seconds\n`;
    prompt += `- Resolution: ${metadata?.width || 'Unknown'}x${metadata?.height || 'Unknown'}\n\n`;
    
    prompt += `## Transcription\n${transcription || 'No transcription available'}\n\n`;
    
    prompt += `## Visual Elements\n`;
    if (visualElements && visualElements.length > 0) {
      visualElements.forEach((element, index) => {
        prompt += `### Frame ${index + 1} (${element.timestamp}s)\n`;
        
        if (element.ui_elements && element.ui_elements.length > 0) {
          prompt += `UI Elements:\n`;
          element.ui_elements.forEach(ui => {
            prompt += `- ${ui.type}: ${ui.description} (${ui.confidence})\n`;
          });
        }
        
        if (element.text_elements && element.text_elements.length > 0) {
          prompt += `Text Elements:\n`;
          element.text_elements.forEach(text => {
            prompt += `- "${text.text}" (${text.confidence})\n`;
          });
        }
        
        prompt += `\n`;
      });
    } else {
      prompt += `No visual elements detected.\n\n`;
    }
    
    prompt += `## Analysis Task\n`;
    prompt += `Please analyze this video and provide a comprehensive summary of the software being demonstrated. `;
    prompt += `Identify key UI/UX elements, user flows, features, and functionality. `;
    prompt += `Focus on aspects that would be important for creating a software specification.`;
    
    return prompt;
  }
  
  /**
   * Generate a specification prompt
   * @param {object} videoAnalysis - Video analysis data
   * @returns {string} - Formatted prompt
   */
  generateSpecificationPrompt(videoAnalysis) {
    const { summary, transcription, visualElements } = videoAnalysis;
    
    // Create a structured prompt for the AI
    let prompt = `# Software Specification Generation Task\n\n`;
    
    prompt += `## Video Summary\n${summary || 'No summary available'}\n\n`;
    
    prompt += `## Transcription Excerpt\n`;
    if (transcription) {
      // Include just the first and last portions of the transcription to save tokens
      const words = transcription.split(' ');
      if (words.length > 300) {
        const firstPart = words.slice(0, 150).join(' ');
        const lastPart = words.slice(-150).join(' ');
        prompt += `${firstPart}\n...\n${lastPart}\n\n`;
      } else {
        prompt += `${transcription}\n\n`;
      }
    } else {
      prompt += `No transcription available\n\n`;
    }
    
    prompt += `## Key Visual Elements\n`;
    if (visualElements && visualElements.length > 0) {
      // Include just a sample of visual elements to save tokens
      const sampleSize = Math.min(5, visualElements.length);
      const sampleIndices = Array.from({ length: sampleSize }, (_, i) => 
        Math.floor(i * visualElements.length / sampleSize));
      
      sampleIndices.forEach(index => {
        const element = visualElements[index];
        prompt += `### Frame at ${element.timestamp}s\n`;
        
        if (element.ui_elements && element.ui_elements.length > 0) {
          prompt += `UI Elements: `;
          prompt += element.ui_elements
            .slice(0, 3)
            .map(ui => `${ui.type}: ${ui.description}`)
            .join('; ');
          prompt += `\n`;
        }
        
        if (element.text_elements && element.text_elements.length > 0) {
          prompt += `Text Elements: `;
          prompt += element.text_elements
            .slice(0, 3)
            .map(text => `"${text.text}"`)
            .join('; ');
          prompt += `\n`;
        }
        
        prompt += `\n`;
      });
    } else {
      prompt += `No visual elements available\n\n`;
    }
    
    prompt += `## Specification Task\n`;
    prompt += `Based on the video analysis, please create a comprehensive software specification document with the following sections:\n\n`;
    prompt += `1. Overview\n`;
    prompt += `2. User Stories\n`;
    prompt += `3. Functional Requirements\n`;
    prompt += `4. Non-Functional Requirements\n`;
    prompt += `5. UI/UX Design Guidelines\n`;
    prompt += `6. Technical Architecture\n`;
    prompt += `7. Implementation Considerations\n\n`;
    
    prompt += `For each section, provide detailed and specific information that would be useful for developers to implement the software shown in the video.`;
    
    return prompt;
  }
  
  /**
   * Generate a task creation prompt
   * @param {object} specification - Specification data
   * @returns {string} - Formatted prompt
   */
  generateTaskCreationPrompt(specification) {
    // Create a structured prompt for the AI
    let prompt = `# Development Task Generation\n\n`;
    
    prompt += `## Software Specification\n\n`;
    
    // Add overview
    if (specification.overview) {
      prompt += `### Overview\n${specification.overview.text || ''}\n\n`;
    }
    
    // Add functional requirements
    if (specification.functional_requirements && specification.functional_requirements.length > 0) {
      prompt += `### Functional Requirements\n`;
      specification.functional_requirements.forEach((req, index) => {
        prompt += `${index + 1}. ${req}\n`;
      });
      prompt += `\n`;
    }
    
    // Add user stories
    if (specification.user_stories && specification.user_stories.length > 0) {
      prompt += `### User Stories\n`;
      specification.user_stories.forEach((story, index) => {
        prompt += `${index + 1}. ${story}\n`;
      });
      prompt += `\n`;
    }
    
    // Add technical architecture if available
    if (specification.technical_architecture) {
      prompt += `### Technical Architecture\n${specification.technical_architecture.text || ''}\n\n`;
    }
    
    prompt += `## Task Generation Request\n`;
    prompt += `Based on the software specification above, please generate a comprehensive list of development tasks. For each task:\n\n`;
    prompt += `1. Assign a unique ID (e.g., T1, T2, etc.)\n`;
    prompt += `2. Provide a clear, specific title\n`;
    prompt += `3. Include a detailed description of what needs to be done\n`;
    prompt += `4. Specify the category (Frontend, Backend, Database, Testing, DevOps, etc.)\n`;
    prompt += `5. Indicate dependencies on other tasks (if any)\n`;
    prompt += `6. Estimate the complexity (Easy, Medium, Hard)\n`;
    prompt += `7. Provide a time estimate (in hours)\n\n`;
    
    prompt += `Organize the tasks in a logical sequence and ensure they cover all aspects of the specification.`;
    
    return prompt;
  }
}

module.exports = new OpenRouterService();
