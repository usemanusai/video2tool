import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Jira as JiraIcon,
  Trello as TrelloIcon,
  Inventory as AzureIcon,
  Assignment as AsanaIcon,
  Inventory2 as ClickUpIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

// Integration interface
interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  isConnected: boolean;
  lastSynced?: string;
  settings?: Record<string, any>;
}

// Component props
interface IntegrationSettingsProps {
  onConnect: (integrationId: string, settings: Record<string, any>) => Promise<void>;
  onDisconnect: (integrationId: string) => Promise<void>;
  onUpdateSettings: (
    integrationId: string,
    settings: Record<string, any>
  ) => Promise<void>;
  onSync: (integrationId: string) => Promise<void>;
}

const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({
  onConnect,
  onDisconnect,
  onUpdateSettings,
  onSync,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // State
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<string | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<Record<string, any>>({});
  const [processingIntegration, setProcessingIntegration] = useState<string | null>(null);
  
  // Initialize integrations
  useEffect(() => {
    // In a real implementation, you would fetch integrations from the API
    // For now, we'll use mock data
    const mockIntegrations: Integration[] = [
      {
        id: 'github',
        name: 'GitHub',
        description: t('integrations.github.description'),
        icon: <GitHubIcon />,
        isConnected: false,
        settings: {
          repository: '',
          branch: 'main',
          path: '',
          autoSync: false,
        },
      },
      {
        id: 'jira',
        name: 'Jira',
        description: t('integrations.jira.description'),
        icon: <JiraIcon />,
        isConnected: false,
        settings: {
          url: '',
          project: '',
          issueType: 'Task',
          autoSync: false,
        },
      },
      {
        id: 'trello',
        name: 'Trello',
        description: t('integrations.trello.description'),
        icon: <TrelloIcon />,
        isConnected: false,
        settings: {
          board: '',
          list: '',
          autoSync: false,
        },
      },
      {
        id: 'azure',
        name: 'Azure DevOps',
        description: t('integrations.azure.description'),
        icon: <AzureIcon />,
        isConnected: false,
        settings: {
          organization: '',
          project: '',
          board: '',
          autoSync: false,
        },
      },
      {
        id: 'asana',
        name: 'Asana',
        description: t('integrations.asana.description'),
        icon: <AsanaIcon />,
        isConnected: false,
        settings: {
          workspace: '',
          project: '',
          autoSync: false,
        },
      },
      {
        id: 'clickup',
        name: 'ClickUp',
        description: t('integrations.clickup.description'),
        icon: <ClickUpIcon />,
        isConnected: false,
        settings: {
          workspace: '',
          list: '',
          autoSync: false,
        },
      },
    ];
    
    setIntegrations(mockIntegrations);
    setLoading(false);
  }, [t]);
  
  // Handle connect
  const handleConnect = async (integrationId: string) => {
    try {
      setProcessingIntegration(integrationId);
      setError(null);
      
      // Get integration
      const integration = integrations.find((i) => i.id === integrationId);
      if (!integration) return;
      
      // Connect
      await onConnect(integrationId, integration.settings || {});
      
      // Update integration
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integrationId
            ? { ...i, isConnected: true, lastSynced: new Date().toISOString() }
            : i
        )
      );
    } catch (err: any) {
      setError(err.message || t('integrations.error.connect'));
    } finally {
      setProcessingIntegration(null);
    }
  };
  
  // Handle disconnect
  const handleDisconnect = async (integrationId: string) => {
    try {
      setProcessingIntegration(integrationId);
      setError(null);
      
      // Disconnect
      await onDisconnect(integrationId);
      
      // Update integration
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integrationId ? { ...i, isConnected: false, lastSynced: undefined } : i
        )
      );
    } catch (err: any) {
      setError(err.message || t('integrations.error.disconnect'));
    } finally {
      setProcessingIntegration(null);
    }
  };
  
  // Handle sync
  const handleSync = async (integrationId: string) => {
    try {
      setProcessingIntegration(integrationId);
      setError(null);
      
      // Sync
      await onSync(integrationId);
      
      // Update integration
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integrationId ? { ...i, lastSynced: new Date().toISOString() } : i
        )
      );
    } catch (err: any) {
      setError(err.message || t('integrations.error.sync'));
    } finally {
      setProcessingIntegration(null);
    }
  };
  
  // Open settings dialog
  const openSettingsDialog = (integrationId: string) => {
    const integration = integrations.find((i) => i.id === integrationId);
    if (!integration) return;
    
    setEditingIntegration(integrationId);
    setCurrentSettings(integration.settings || {});
    setSettingsDialogOpen(true);
  };
  
  // Close settings dialog
  const closeSettingsDialog = () => {
    setSettingsDialogOpen(false);
    setEditingIntegration(null);
    setCurrentSettings({});
  };
  
  // Handle settings change
  const handleSettingsChange = (key: string, value: any) => {
    setCurrentSettings((prev) => ({ ...prev, [key]: value }));
  };
  
  // Save settings
  const saveSettings = async () => {
    if (!editingIntegration) return;
    
    try {
      setProcessingIntegration(editingIntegration);
      setError(null);
      
      // Update settings
      await onUpdateSettings(editingIntegration, currentSettings);
      
      // Update integration
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === editingIntegration ? { ...i, settings: currentSettings } : i
        )
      );
      
      closeSettingsDialog();
    } catch (err: any) {
      setError(err.message || t('integrations.error.settings'));
    } finally {
      setProcessingIntegration(null);
    }
  };
  
  // Render settings fields
  const renderSettingsFields = () => {
    if (!editingIntegration) return null;
    
    const integration = integrations.find((i) => i.id === editingIntegration);
    if (!integration) return null;
    
    switch (editingIntegration) {
      case 'github':
        return (
          <>
            <TextField
              fullWidth
              label={t('integrations.github.repository')}
              value={currentSettings.repository || ''}
              onChange={(e) => handleSettingsChange('repository', e.target.value)}
              margin="normal"
              helperText={t('integrations.github.repositoryHelp')}
            />
            <TextField
              fullWidth
              label={t('integrations.github.branch')}
              value={currentSettings.branch || 'main'}
              onChange={(e) => handleSettingsChange('branch', e.target.value)}
              margin="normal"
              helperText={t('integrations.github.branchHelp')}
            />
            <TextField
              fullWidth
              label={t('integrations.github.path')}
              value={currentSettings.path || ''}
              onChange={(e) => handleSettingsChange('path', e.target.value)}
              margin="normal"
              helperText={t('integrations.github.pathHelp')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.autoSync || false}
                  onChange={(e) => handleSettingsChange('autoSync', e.target.checked)}
                />
              }
              label={t('integrations.autoSync')}
            />
          </>
        );
      case 'jira':
        return (
          <>
            <TextField
              fullWidth
              label={t('integrations.jira.url')}
              value={currentSettings.url || ''}
              onChange={(e) => handleSettingsChange('url', e.target.value)}
              margin="normal"
              helperText={t('integrations.jira.urlHelp')}
            />
            <TextField
              fullWidth
              label={t('integrations.jira.project')}
              value={currentSettings.project || ''}
              onChange={(e) => handleSettingsChange('project', e.target.value)}
              margin="normal"
              helperText={t('integrations.jira.projectHelp')}
            />
            <TextField
              fullWidth
              label={t('integrations.jira.issueType')}
              value={currentSettings.issueType || 'Task'}
              onChange={(e) => handleSettingsChange('issueType', e.target.value)}
              margin="normal"
              helperText={t('integrations.jira.issueTypeHelp')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={currentSettings.autoSync || false}
                  onChange={(e) => handleSettingsChange('autoSync', e.target.checked)}
                />
              }
              label={t('integrations.autoSync')}
            />
          </>
        );
      // Add cases for other integrations
      default:
        return (
          <Typography color="text.secondary">
            {t('integrations.noSettings')}
          </Typography>
        );
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {integrations.map((integration) => (
          <Grid item xs={12} sm={6} md={4} key={integration.id}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Box sx={{ mr: 1 }}>{integration.icon}</Box>
                  <Typography variant="h6">{integration.name}</Typography>
                  {integration.isConnected && (
                    <Chip
                      label={t('integrations.connected')}
                      color="success"
                      size="small"
                      sx={{ ml: 'auto' }}
                    />
                  )}
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {integration.description}
                </Typography>
                
                {integration.isConnected && integration.lastSynced && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('integrations.lastSynced', {
                      time: new Date(integration.lastSynced).toLocaleString(),
                    })}
                  </Typography>
                )}
              </CardContent>
              
              <CardActions>
                {integration.isConnected ? (
                  <>
                    <Button
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={() => handleSync(integration.id)}
                      disabled={processingIntegration === integration.id}
                    >
                      {processingIntegration === integration.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        t('integrations.sync')
                      )}
                    </Button>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => openSettingsDialog(integration.id)}
                    >
                      {t('integrations.settings')}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDisconnect(integration.id)}
                      disabled={processingIntegration === integration.id}
                      sx={{ ml: 'auto' }}
                    >
                      {processingIntegration === integration.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        t('integrations.disconnect')
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="small"
                    color="primary"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleConnect(integration.id)}
                    disabled={processingIntegration === integration.id}
                    fullWidth
                  >
                    {processingIntegration === integration.id ? (
                      <CircularProgress size={20} />
                    ) : (
                      t('integrations.connect')
                    )}
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={closeSettingsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingIntegration &&
            t('integrations.settingsTitle', {
              name: integrations.find((i) => i.id === editingIntegration)?.name,
            })}
        </DialogTitle>
        
        <DialogContent dividers>
          {renderSettingsFields()}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={closeSettingsDialog} startIcon={<CloseIcon />}>
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={saveSettings}
            color="primary"
            variant="contained"
            startIcon={
              processingIntegration === editingIntegration ? (
                <CircularProgress size={20} />
              ) : (
                <CheckIcon />
              )
            }
            disabled={processingIntegration === editingIntegration}
          >
            {t('actions.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IntegrationSettings;
