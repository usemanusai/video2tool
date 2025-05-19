import { useState, useEffect, useCallback } from 'react';
import { TaskStatus } from '@/types/api';
import { videoService } from '@/api/videoService';

interface UseTaskStatusProps {
  taskId: string;
  pollingInterval?: number;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export const useTaskStatus = ({
  taskId,
  pollingInterval = 3000,
  onComplete,
  onError,
}: UseTaskStatusProps) => {
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const taskStatus = await videoService.getTaskStatus(taskId);
      setStatus(taskStatus);
      
      if (taskStatus.status === 'completed' && onComplete) {
        onComplete(taskStatus.result);
      } else if (taskStatus.status === 'failed' && onError) {
        onError(taskStatus.error || 'Task failed');
      }
      
      return taskStatus;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch task status');
      return null;
    } finally {
      setLoading(false);
    }
  }, [taskId, onComplete, onError]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const startPolling = async () => {
      const initialStatus = await fetchStatus();
      
      // If the task is already completed or failed, don't start polling
      if (
        initialStatus &&
        (initialStatus.status === 'completed' || initialStatus.status === 'failed')
      ) {
        return;
      }
      
      // Start polling
      intervalId = setInterval(async () => {
        const currentStatus = await fetchStatus();
        
        // Stop polling if the task is completed or failed
        if (
          currentStatus &&
          (currentStatus.status === 'completed' || currentStatus.status === 'failed')
        ) {
          clearInterval(intervalId);
        }
      }, pollingInterval);
    };
    
    startPolling();
    
    // Clean up interval on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [taskId, pollingInterval, fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
};
