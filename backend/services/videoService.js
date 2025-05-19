const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Video service for processing videos
 */
class VideoService {
  /**
   * Process a video file
   * @param {string} videoPath - Path to the video file
   * @returns {Promise<object>} - Video processing result
   */
  async processVideo(videoPath) {
    try {
      logger.info(`Processing video: ${videoPath}`);
      
      // Validate video file
      if (!await this.validateVideo(videoPath)) {
        throw new ApiError(400, 'Invalid video file');
      }
      
      // Extract video metadata
      const metadata = await this.extractMetadata(videoPath);
      logger.info(`Video metadata: ${JSON.stringify(metadata)}`);
      
      // Extract frames for analysis
      const frames = await this.extractFrames(videoPath, metadata);
      logger.info(`Extracted ${frames.length} frames for analysis`);
      
      // Extract audio for transcription
      const audioPath = await this.extractAudio(videoPath);
      logger.info(`Extracted audio to: ${audioPath}`);
      
      // Transcribe audio
      const transcription = await this.transcribeAudio(audioPath);
      logger.info(`Transcription complete: ${transcription.length} characters`);
      
      // Analyze visual elements
      const visualElements = await this.analyzeVisualElements(frames);
      logger.info(`Visual analysis complete: ${visualElements.length} elements`);
      
      // Generate summary
      const summary = await this.generateSummary(transcription, visualElements, metadata);
      logger.info(`Summary generation complete: ${summary.length} characters`);
      
      // Clean up temporary files
      this.cleanupTempFiles(audioPath, frames);
      
      return {
        transcription,
        visualElements,
        summary,
        metadata,
      };
    } catch (error) {
      logger.error('Error processing video:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Error processing video');
    }
  }
  
  /**
   * Validate a video file
   * @param {string} videoPath - Path to the video file
   * @returns {Promise<boolean>} - Whether the video is valid
   */
  async validateVideo(videoPath) {
    try {
      // Check if file exists
      if (!fs.existsSync(videoPath)) {
        logger.error(`Video file not found: ${videoPath}`);
        return false;
      }
      
      // Check file extension
      const ext = path.extname(videoPath).toLowerCase();
      const validExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
      if (!validExtensions.includes(ext)) {
        logger.error(`Invalid video extension: ${ext}`);
        return false;
      }
      
      // Check if file is readable
      await fs.promises.access(videoPath, fs.constants.R_OK);
      
      // Check if file is a valid video using ffprobe
      return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', [
          '-v', 'error',
          '-select_streams', 'v:0',
          '-show_entries', 'stream=codec_type',
          '-of', 'json',
          videoPath
        ]);
        
        let output = '';
        ffprobe.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        ffprobe.on('close', (code) => {
          if (code !== 0) {
            logger.error(`ffprobe exited with code ${code}`);
            resolve(false);
            return;
          }
          
          try {
            const json = JSON.parse(output);
            const hasVideoStream = json.streams && 
              json.streams.some(stream => stream.codec_type === 'video');
            
            resolve(hasVideoStream);
          } catch (error) {
            logger.error('Error parsing ffprobe output:', error);
            resolve(false);
          }
        });
      });
    } catch (error) {
      logger.error('Error validating video:', error);
      return false;
    }
  }
  
  /**
   * Extract metadata from a video file
   * @param {string} videoPath - Path to the video file
   * @returns {Promise<object>} - Video metadata
   */
  async extractMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,duration,bit_rate,codec_name',
        '-of', 'json',
        videoPath
      ]);
      
      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe exited with code ${code}`));
          return;
        }
        
        try {
          const json = JSON.parse(output);
          const stream = json.streams[0] || {};
          
          resolve({
            width: parseInt(stream.width, 10) || 0,
            height: parseInt(stream.height, 10) || 0,
            duration: parseFloat(stream.duration) || 0,
            bitRate: parseInt(stream.bit_rate, 10) || 0,
            codec: stream.codec_name || 'unknown',
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  
  /**
   * Extract frames from a video file
   * @param {string} videoPath - Path to the video file
   * @param {object} metadata - Video metadata
   * @returns {Promise<Array<object>>} - Extracted frames
   */
  async extractFrames(videoPath, metadata) {
    const tempDir = config.storage.tempDir;
    const framesDir = path.join(tempDir, `frames_${uuidv4()}`);
    
    // Create frames directory
    fs.mkdirSync(framesDir, { recursive: true });
    
    // Calculate frame extraction interval
    const duration = metadata.duration;
    const frameCount = Math.min(10, Math.max(5, Math.floor(duration / 10)));
    const interval = duration / frameCount;
    
    // Extract frames
    const framePromises = [];
    for (let i = 0; i < frameCount; i++) {
      const timestamp = i * interval;
      const outputPath = path.join(framesDir, `frame_${i}.jpg`);
      
      framePromises.push(
        this.extractFrame(videoPath, timestamp, outputPath)
          .then(() => ({ timestamp, path: outputPath }))
      );
    }
    
    return Promise.all(framePromises);
  }
  
  /**
   * Extract a single frame from a video
   * @param {string} videoPath - Path to the video file
   * @param {number} timestamp - Timestamp in seconds
   * @param {string} outputPath - Output path for the frame
   * @returns {Promise<void>}
   */
  async extractFrame(videoPath, timestamp, outputPath) {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-ss', timestamp.toString(),
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2',
        outputPath
      ]);
      
      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg exited with code ${code}`));
          return;
        }
        
        resolve();
      });
    });
  }
  
  /**
   * Extract audio from a video file
   * @param {string} videoPath - Path to the video file
   * @returns {Promise<string>} - Path to the extracted audio file
   */
  async extractAudio(videoPath) {
    const tempDir = config.storage.tempDir;
    const audioPath = path.join(tempDir, `audio_${uuidv4()}.wav`);
    
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        audioPath
      ]);
      
      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg exited with code ${code}`));
          return;
        }
        
        resolve(audioPath);
      });
    });
  }
  
  /**
   * Transcribe audio file
   * @param {string} audioPath - Path to the audio file
   * @returns {Promise<string>} - Transcription text
   */
  async transcribeAudio(audioPath) {
    // In a real implementation, this would use a transcription service
    // For now, we'll return a placeholder
    return "This is a placeholder transcription. In a real implementation, this would use a transcription service like Whisper API or Google Speech-to-Text.";
  }
  
  /**
   * Analyze visual elements in frames
   * @param {Array<object>} frames - Extracted frames
   * @returns {Promise<Array<object>>} - Visual elements
   */
  async analyzeVisualElements(frames) {
    // In a real implementation, this would use computer vision
    // For now, we'll return placeholders
    return frames.map(frame => ({
      timestamp: frame.timestamp,
      ui_elements: [
        { type: 'button', description: 'Submit button', confidence: 0.95 },
        { type: 'input', description: 'Text input field', confidence: 0.92 },
      ],
      text_elements: [
        { text: 'Sample text', confidence: 0.98 },
      ],
    }));
  }
  
  /**
   * Generate a summary of the video
   * @param {string} transcription - Video transcription
   * @param {Array<object>} visualElements - Visual elements
   * @param {object} metadata - Video metadata
   * @returns {Promise<string>} - Summary text
   */
  async generateSummary(transcription, visualElements, metadata) {
    // In a real implementation, this would use the OpenRouter API
    // For now, we'll return a placeholder
    return "This is a placeholder summary. In a real implementation, this would use the OpenRouter API to generate a summary based on the transcription and visual elements.";
  }
  
  /**
   * Clean up temporary files
   * @param {string} audioPath - Path to the audio file
   * @param {Array<object>} frames - Extracted frames
   */
  cleanupTempFiles(audioPath, frames) {
    try {
      // Delete audio file
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
      
      // Delete frame files
      frames.forEach(frame => {
        if (fs.existsSync(frame.path)) {
          fs.unlinkSync(frame.path);
        }
      });
      
      // Delete frames directory if it's empty
      if (frames.length > 0) {
        const framesDir = path.dirname(frames[0].path);
        if (fs.readdirSync(framesDir).length === 0) {
          fs.rmdirSync(framesDir);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up temporary files:', error);
    }
  }
}

module.exports = new VideoService();
