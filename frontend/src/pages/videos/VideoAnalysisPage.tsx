import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Button,
  Tabs,
  Tab,
  Paper,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import {
  VideoLibrary as VideoIcon,
  Description as DescriptionIcon,
  Task as TaskIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { videoService } from '@/api/videoService';
import { exportService } from '@/api/exportService';
import { VideoAnalysis, ExportFormat } from '@/types/api';
import PageHeader from '@/components/common/PageHeader';
import ContentCard from '@/components/common/ContentCard';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorMessage from '@/components/common/ErrorMessage';
import { useTaskStatus } from '@/hooks/useTaskStatus';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analysis-tabpanel-${index}`}
      aria-labelledby={`analysis-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && <Box sx={{ p: 3, height: '100%' }}>{children}</Box>}
    </div>
  );
};

const VideoAnalysisPage: React.FC = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingSpec, setGeneratingSpec] = useState(false);
  const [specTaskId, setSpecTaskId] = useState<string | null>(null);
  
  // Task status hook for specification generation
  const specTask = useTaskStatus({
    taskId: specTaskId || '',
    pollingInterval: 3000,
    onComplete: (result) => {
      if (result && result.specification_id) {
        navigate(`/specifications/${result.specification_id}`);
      }
    },
    onError: (error) => {
      setError(`Specification generation failed: ${error}`);
      setGeneratingSpec(false);
    },
  });

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!analysisId) return;
      
      try {
        setLoading(true);
        const data = await videoService.getVideoAnalysis(analysisId);
        setAnalysis(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load video analysis');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalysis();
  }, [analysisId]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleGenerateSpecification = async () => {
    if (!analysisId) return;
    
    try {
      setGeneratingSpec(true);
      setError(null);
      
      const response = await videoService.generateSpecification(
        analysisId,
        `Specification for ${analysis?.video_name || 'Video'}`
      );
      
      setSpecTaskId(response.task_id);
    } catch (err: any) {
      setError(err.message || 'Failed to generate specification');
      setGeneratingSpec(false);
    }
  };

  const handleExportAnalysis = async (format: ExportFormat) => {
    if (!analysisId) return;
    
    try {
      const blob = await exportService.exportCompleteAnalysis(
        analysisId,
        {
          format,
          filename: `analysis_${analysis?.video_name || 'video'}`,
          include_metadata: true,
        }
      );
      
      const extension = format === ExportFormat.PDF ? 'pdf' : 
                        format === ExportFormat.MARKDOWN ? 'md' : 
                        format === ExportFormat.JSON ? 'json' : 'txt';
      
      exportService.downloadBlob(
        blob,
        `analysis_${analysis?.video_name || 'video'}.${extension}`
      );
    } catch (err: any) {
      setError(err.message || `Failed to export analysis as ${format}`);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading video analysis..." />;
  }

  if (!analysis) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorMessage 
          message={error || "Analysis not found"} 
          onRetry={() => window.location.reload()}
        />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={analysis.video_name}
        subtitle={`Analysis of ${analysis.video_name}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: 'Video Analysis' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<DescriptionIcon />}
            onClick={handleGenerateSpecification}
            disabled={generatingSpec || !!specTaskId}
          >
            {generatingSpec || specTaskId ? 'Generating...' : 'Generate Specification'}
          </Button>
        }
      />
      
      {error && <ErrorMessage message={error} />}
      
      {/* Status and metadata */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ mr: 2 }}>
              <Chip
                label={analysis.status}
                color={
                  analysis.status === 'completed'
                    ? 'success'
                    : analysis.status === 'failed'
                    ? 'error'
                    : 'warning'
                }
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Created: {new Date(analysis.created_at).toLocaleString()}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => handleExportAnalysis(ExportFormat.JSON)}
              sx={{ mr: 1 }}
            >
              Export
            </Button>
            <Button
              size="small"
              startIcon={<PlayArrowIcon />}
              disabled={!analysis.video_url}
              href={analysis.video_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
            >
              Play Video
            </Button>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Video Information
            </Typography>
            <List dense>
              {analysis.metadata && Object.entries(analysis.metadata).map(([key, value]) => (
                <ListItem key={key} sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={key.replace(/_/g, ' ')}
                    secondary={value?.toString() || 'N/A'}
                    primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                    secondaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Specification generation status */}
      {specTaskId && specTask.status && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography variant="body1">
              Generating specification... {specTask.status.status}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary">
              This may take a few minutes
            </Typography>
          </Box>
        </Paper>
      )}
      
      {/* Analysis tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="analysis tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Summary" id="analysis-tab-0" />
          <Tab label="Transcription" id="analysis-tab-1" />
          <Tab label="Visual Elements" id="analysis-tab-2" />
          <Tab label="Screen Flow" id="analysis-tab-3" />
          <Tab label="Heatmap" id="analysis-tab-4" />
        </Tabs>
        
        <Box sx={{ height: 'calc(100vh - 300px)', overflow: 'auto' }}>
          <TabPanel value={tabValue} index={0}>
            {analysis.summary ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Analysis Summary
                </Typography>
                <Typography variant="body1" paragraph>
                  {analysis.summary.overview || 'No summary available'}
                </Typography>
                
                {analysis.summary.ui_components && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      UI Components
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {analysis.summary.ui_components}
                    </Typography>
                  </>
                )}
                
                {analysis.summary.user_flows && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      User Flows
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {analysis.summary.user_flows}
                    </Typography>
                  </>
                )}
                
                {analysis.summary.data_structures && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Data Structures
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {analysis.summary.data_structures}
                    </Typography>
                  </>
                )}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No summary available</Typography>
              </Box>
            )}
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            {analysis.transcription ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Video Transcription
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    maxHeight: 'calc(100vh - 400px)',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                  }}
                >
                  {analysis.transcription}
                </Paper>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No transcription available</Typography>
              </Box>
            )}
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            {analysis.visual_elements ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Visual Elements Analysis
                </Typography>
                
                {/* UI Element Counts */}
                {analysis.visual_elements.ui_element_counts && (
                  <ContentCard
                    title="UI Element Counts"
                    sx={{ mb: 3 }}
                  >
                    <Grid container spacing={2}>
                      {Object.entries(analysis.visual_elements.ui_element_counts).map(([element, count]) => (
                        <Grid item xs={6} sm={4} md={3} key={element}>
                          <Paper
                            sx={{
                              p: 2,
                              textAlign: 'center',
                              bgcolor: 'background.default',
                            }}
                          >
                            <Typography variant="h6">{count}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {element.replace(/_/g, ' ')}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </ContentCard>
                )}
                
                {/* Text Content */}
                {analysis.visual_elements.text_content && analysis.visual_elements.text_content.length > 0 && (
                  <ContentCard
                    title="Detected Text"
                    sx={{ mb: 3 }}
                  >
                    <Box
                      sx={{
                        maxHeight: 200,
                        overflow: 'auto',
                      }}
                    >
                      <List dense>
                        {analysis.visual_elements.text_content.map((text, index) => (
                          <ListItem key={index} divider={index < analysis.visual_elements.text_content.length - 1}>
                            <ListItemText primary={text} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </ContentCard>
                )}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No visual elements analysis available</Typography>
              </Box>
            )}
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            {analysis.screen_flow ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Screen Flow Analysis
                </Typography>
                
                {/* Screen Types */}
                {analysis.screen_flow.screens && (
                  <ContentCard
                    title="Detected Screens"
                    sx={{ mb: 3 }}
                  >
                    <Grid container spacing={2}>
                      {analysis.screen_flow.screens.map((screen, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                          <Paper
                            sx={{
                              p: 2,
                              bgcolor: 'background.default',
                            }}
                          >
                            <Typography variant="subtitle1">{screen.type}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Average Duration: {screen.avg_duration.toFixed(1)}s
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </ContentCard>
                )}
                
                {/* Common Paths */}
                {analysis.screen_flow.common_paths && analysis.screen_flow.common_paths.length > 0 && (
                  <ContentCard
                    title="Common Navigation Paths"
                    sx={{ mb: 3 }}
                  >
                    <List>
                      {analysis.screen_flow.common_paths.map((path, index) => (
                        <ListItem key={index} divider={index < analysis.screen_flow.common_paths.length - 1}>
                          <ListItemText
                            primary={path.path}
                            secondary={`${path.count} occurrences`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </ContentCard>
                )}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No screen flow analysis available</Typography>
              </Box>
            )}
          </TabPanel>
          
          <TabPanel value={tabValue} index={4}>
            {analysis.heatmap ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Interaction Heatmap
                </Typography>
                
                {/* Hotspots */}
                {analysis.heatmap.hotspots && analysis.heatmap.hotspots.length > 0 && (
                  <ContentCard
                    title="Interaction Hotspots"
                    sx={{ mb: 3 }}
                  >
                    <List>
                      {analysis.heatmap.hotspots.map((hotspot, index) => (
                        <ListItem key={index} divider={index < analysis.heatmap.hotspots.length - 1}>
                          <ListItemText
                            primary={`Hotspot #${index + 1}`}
                            secondary={`Position: (${hotspot.x}, ${hotspot.y}), Intensity: ${hotspot.intensity}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </ContentCard>
                )}
                
                {/* Heatmap Visualization Placeholder */}
                <Paper
                  sx={{
                    p: 2,
                    height: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    Heatmap visualization would be displayed here
                  </Typography>
                </Paper>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No heatmap analysis available</Typography>
              </Box>
            )}
          </TabPanel>
        </Box>
      </Paper>
      
      {/* Export options */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Export Analysis
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleExportAnalysis(ExportFormat.JSON)}
          >
            Export as JSON
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleExportAnalysis(ExportFormat.MARKDOWN)}
          >
            Export as Markdown
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleExportAnalysis(ExportFormat.PDF)}
          >
            Export as PDF
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default VideoAnalysisPage;
