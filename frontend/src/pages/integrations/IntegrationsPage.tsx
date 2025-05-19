import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  IconButton,
  Tooltip,
  Chip,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Link as LinkIcon,
  GitHub as GitHubIcon,
  Dashboard as TrelloIcon,
  Assignment as ClickUpIcon,
} from '@mui/icons-material';
import { integrationService } from '@/api/integrationService';
import { IntegrationType } from '@/types/api';
import PageHeader from '@/components/common/PageHeader';
import ContentCard from '@/components/common/ContentCard';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorMessage from '@/components/common/ErrorMessage';

interface IntegrationConfig {
  type: IntegrationType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  authFields: {
    apiKey?: boolean;
    apiToken: boolean;
  };
}

const integrationConfigs: IntegrationConfig[] = [
  {
    type: IntegrationType.TRELLO,
    name: 'Trello',
    description: 'Create boards, lists, and cards in Trello',
    icon: <TrelloIcon />,
    color: '#0079BF',
    authFields: {
      apiKey: true,
      apiToken: true,
    },
  },
  {
    type: IntegrationType.GITHUB,
    name: 'GitHub Issues',
    description: 'Create repositories and issues in GitHub',
    icon: <GitHubIcon />,
    color: '#24292e',
    authFields: {
      apiToken: true,
    },
  },
  {
    type: IntegrationType.CLICKUP,
    name: 'ClickUp',
    description: 'Create spaces, lists, and tasks in ClickUp',
    icon: <ClickUpIcon />,
    color: '#7B68EE',
    authFields: {
      apiToken: true,
    },
  },
];

const IntegrationsPage: React.FC = () => {
  const theme = useTheme();
  
  const [availableIntegrations, setAvailableIntegrations] = useState<string[]>([]);
  const [initializedIntegrations, setInitializedIntegrations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Auth dialog
  const [openAuthDialog, setOpenAuthDialog] = useState(false);
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<IntegrationType | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Export dialog
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [exportIntegrationType, setExportIntegrationType] = useState<IntegrationType | null>(null);
  const [taskTaskId, setTaskTaskId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Fetch integrations on mount
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setLoading(true);
        
        // Get available integration types
        const types = await integrationService.getIntegrationTypes();
        setAvailableIntegrations(types);
        
        // Get initialized integrations
        const initialized = await integrationService.getInitializedIntegrations();
        setInitializedIntegrations(initialized);
      } catch (err: any) {
        setError(err.message || 'Failed to load integrations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchIntegrations();
  }, []);

  const handleOpenAuthDialog = (integrationType: IntegrationType) => {
    setSelectedIntegrationType(integrationType);
    setApiKey('');
    setApiToken('');
    setAuthError(null);
    setOpenAuthDialog(true);
  };

  const handleCloseAuthDialog = () => {
    setOpenAuthDialog(false);
  };

  const handleAuthenticate = async () => {
    if (!selectedIntegrationType) return;
    
    try {
      setAuthenticating(true);
      setAuthError(null);
      
      const config = integrationConfigs.find((c) => c.type === selectedIntegrationType);
      
      if (!config) {
        throw new Error('Invalid integration type');
      }
      
      // Validate required fields
      if (config.authFields.apiKey && !apiKey) {
        throw new Error('API Key is required');
      }
      
      if (!apiToken) {
        throw new Error('API Token is required');
      }
      
      const result = await integrationService.authenticateIntegration({
        integration_type: selectedIntegrationType,
        api_key: config.authFields.apiKey ? apiKey : undefined,
        api_token: apiToken,
      });
      
      if (result.success) {
        // Update initialized integrations
        const initialized = await integrationService.getInitializedIntegrations();
        setInitializedIntegrations(initialized);
        handleCloseAuthDialog();
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleOpenExportDialog = (integrationType: IntegrationType) => {
    setExportIntegrationType(integrationType);
    setTaskTaskId('');
    setProjectName('');
    setExportError(null);
    setOpenExportDialog(true);
  };

  const handleCloseExportDialog = () => {
    setOpenExportDialog(false);
  };

  const handleExport = async () => {
    if (!exportIntegrationType || !taskTaskId || !projectName) return;
    
    try {
      setExporting(true);
      setExportError(null);
      
      await integrationService.exportToIntegration(
        taskTaskId,
        exportIntegrationType,
        projectName
      );
      
      handleCloseExportDialog();
    } catch (err: any) {
      setExportError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const isIntegrationInitialized = (type: IntegrationType) => {
    return initializedIntegrations.includes(type);
  };

  if (loading) {
    return <LoadingScreen message="Loading integrations..." />;
  }

  return (
    <Box>
      <PageHeader
        title="Integrations"
        subtitle="Connect with project management tools"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Integrations' },
        ]}
      />
      
      {error && <ErrorMessage message={error} />}
      
      <Grid container spacing={3}>
        {integrationConfigs.map((integration) => (
          <Grid item key={integration.type} xs={12} sm={6} md={4}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderTop: `4px solid ${integration.color}`,
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: integration.color,
                      color: 'white',
                      mr: 2,
                    }}
                  >
                    {integration.icon}
                  </Box>
                  <Typography variant="h6" component="h2">
                    {integration.name}
                  </Typography>
                  {isIntegrationInitialized(integration.type) && (
                    <Chip
                      icon={<CheckIcon />}
                      label="Connected"
                      color="success"
                      size="small"
                      sx={{ ml: 'auto' }}
                    />
                  )}
                </Box>
                
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {integration.description}
                </Typography>
              </CardContent>
              <CardActions>
                {isIntegrationInitialized(integration.type) ? (
                  <>
                    <Button
                      size="small"
                      onClick={() => handleOpenExportDialog(integration.type)}
                    >
                      Export Tasks
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleOpenAuthDialog(integration.type)}
                    >
                      Reconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    size="small"
                    onClick={() => handleOpenAuthDialog(integration.type)}
                  >
                    Connect
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Authentication Dialog */}
      <Dialog open={openAuthDialog} onClose={handleCloseAuthDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedIntegrationType && (
            <>
              Connect to{' '}
              {integrationConfigs.find((c) => c.type === selectedIntegrationType)?.name}
            </>
          )}
        </DialogTitle>
        <DialogContent>
          {authError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {authError}
            </Alert>
          )}
          
          {selectedIntegrationType && (
            <Box sx={{ mt: 1 }}>
              {integrationConfigs.find((c) => c.type === selectedIntegrationType)
                ?.authFields.apiKey && (
                <TextField
                  margin="dense"
                  id="apiKey"
                  label="API Key"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  sx={{ mb: 2 }}
                />
              )}
              
              <TextField
                margin="dense"
                id="apiToken"
                label="API Token"
                type="text"
                fullWidth
                variant="outlined"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {selectedIntegrationType === IntegrationType.TRELLO && (
                  <>
                    You can find your Trello API Key and Token in the{' '}
                    <a
                      href="https://trello.com/app-key"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Trello Developer API Keys
                    </a>{' '}
                    page.
                  </>
                )}
                
                {selectedIntegrationType === IntegrationType.GITHUB && (
                  <>
                    You can create a GitHub Personal Access Token in your{' '}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      GitHub Settings
                    </a>
                    . Make sure to enable the 'repo' scope.
                  </>
                )}
                
                {selectedIntegrationType === IntegrationType.CLICKUP && (
                  <>
                    You can find your ClickUp API Token in your{' '}
                    <a
                      href="https://app.clickup.com/settings/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ClickUp Settings
                    </a>{' '}
                    under 'Apps'.
                  </>
                )}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAuthDialog}>Cancel</Button>
          <Button
            onClick={handleAuthenticate}
            variant="contained"
            disabled={authenticating}
            startIcon={authenticating ? <CircularProgress size={20} /> : null}
          >
            {authenticating ? 'Connecting...' : 'Connect'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Export Dialog */}
      <Dialog open={openExportDialog} onClose={handleCloseExportDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {exportIntegrationType && (
            <>
              Export Tasks to{' '}
              {integrationConfigs.find((c) => c.type === exportIntegrationType)?.name}
            </>
          )}
        </DialogTitle>
        <DialogContent>
          {exportError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {exportError}
            </Alert>
          )}
          
          <TextField
            margin="dense"
            id="taskTaskId"
            label="Task Set ID"
            type="text"
            fullWidth
            variant="outlined"
            value={taskTaskId}
            onChange={(e) => setTaskTaskId(e.target.value)}
            sx={{ mb: 2 }}
            helperText="Enter the ID of the task set you want to export"
          />
          
          <TextField
            margin="dense"
            id="projectName"
            label="Project Name"
            type="text"
            fullWidth
            variant="outlined"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            helperText="Enter a name for the project in the integration"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExportDialog}>Cancel</Button>
          <Button
            onClick={handleExport}
            variant="contained"
            disabled={exporting || !taskTaskId || !projectName}
            startIcon={exporting ? <CircularProgress size={20} /> : null}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IntegrationsPage;
