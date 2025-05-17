import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  useTheme,
} from '@mui/material';
import {
  Description as DocumentIcon,
  Code as CodeIcon,
  Image as ImageIcon,
  DataObject as JsonIcon,
  TableChart as CsvIcon,
  PictureAsPdf as PdfIcon,
  GitHub as GitHubIcon,
  Jira as JiraIcon,
  Trello as TrelloIcon,
  Inventory as AzureIcon,
  Assignment as AsanaIcon,
  Inventory2 as ClickUpIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

// Export format interface
interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  contentTypes: ('specifications' | 'tasks' | 'analysis')[];
}

// Export destination interface
interface ExportDestination {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requiresAuth: boolean;
  isConnected: boolean;
}

// Component props
interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  availableContentTypes: ('specifications' | 'tasks' | 'analysis')[];
  connectedServices: string[];
}

// Export options interface
export interface ExportOptions {
  format: string;
  destination: string;
  contentTypes: ('specifications' | 'tasks' | 'analysis')[];
  includeImages: boolean;
  includeCode: boolean;
  includeDiagrams: boolean;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  onExport,
  availableContentTypes,
  connectedServices,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // Export formats
  const exportFormats: ExportFormat[] = [
    {
      id: 'markdown',
      name: t('export.formats.markdown'),
      description: t('export.formats.markdownDesc'),
      icon: <DocumentIcon />,
      contentTypes: ['specifications', 'tasks', 'analysis'],
    },
    {
      id: 'html',
      name: t('export.formats.html'),
      description: t('export.formats.htmlDesc'),
      icon: <CodeIcon />,
      contentTypes: ['specifications', 'tasks', 'analysis'],
    },
    {
      id: 'pdf',
      name: t('export.formats.pdf'),
      description: t('export.formats.pdfDesc'),
      icon: <PdfIcon />,
      contentTypes: ['specifications', 'tasks', 'analysis'],
    },
    {
      id: 'json',
      name: t('export.formats.json'),
      description: t('export.formats.jsonDesc'),
      icon: <JsonIcon />,
      contentTypes: ['specifications', 'tasks', 'analysis'],
    },
    {
      id: 'csv',
      name: t('export.formats.csv'),
      description: t('export.formats.csvDesc'),
      icon: <CsvIcon />,
      contentTypes: ['tasks'],
    },
    {
      id: 'images',
      name: t('export.formats.images'),
      description: t('export.formats.imagesDesc'),
      icon: <ImageIcon />,
      contentTypes: ['analysis'],
    },
  ];
  
  // Export destinations
  const exportDestinations: ExportDestination[] = [
    {
      id: 'download',
      name: t('export.destinations.download'),
      description: t('export.destinations.downloadDesc'),
      icon: <DocumentIcon />,
      requiresAuth: false,
      isConnected: true,
    },
    {
      id: 'github',
      name: t('export.destinations.github'),
      description: t('export.destinations.githubDesc'),
      icon: <GitHubIcon />,
      requiresAuth: true,
      isConnected: connectedServices.includes('github'),
    },
    {
      id: 'jira',
      name: t('export.destinations.jira'),
      description: t('export.destinations.jiraDesc'),
      icon: <JiraIcon />,
      requiresAuth: true,
      isConnected: connectedServices.includes('jira'),
    },
    {
      id: 'trello',
      name: t('export.destinations.trello'),
      description: t('export.destinations.trelloDesc'),
      icon: <TrelloIcon />,
      requiresAuth: true,
      isConnected: connectedServices.includes('trello'),
    },
    {
      id: 'azure',
      name: t('export.destinations.azure'),
      description: t('export.destinations.azureDesc'),
      icon: <AzureIcon />,
      requiresAuth: true,
      isConnected: connectedServices.includes('azure'),
    },
    {
      id: 'asana',
      name: t('export.destinations.asana'),
      description: t('export.destinations.asanaDesc'),
      icon: <AsanaIcon />,
      requiresAuth: true,
      isConnected: connectedServices.includes('asana'),
    },
    {
      id: 'clickup',
      name: t('export.destinations.clickup'),
      description: t('export.destinations.clickupDesc'),
      icon: <ClickUpIcon />,
      requiresAuth: true,
      isConnected: connectedServices.includes('clickup'),
    },
  ];
  
  // State
  const [selectedFormat, setSelectedFormat] = useState('markdown');
  const [selectedDestination, setSelectedDestination] = useState('download');
  const [selectedContentTypes, setSelectedContentTypes] = useState<
    ('specifications' | 'tasks' | 'analysis')[]
  >(availableContentTypes);
  const [includeImages, setIncludeImages] = useState(true);
  const [includeCode, setIncludeCode] = useState(true);
  const [includeDiagrams, setIncludeDiagrams] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get selected format
  const getSelectedFormat = () => {
    return exportFormats.find((format) => format.id === selectedFormat);
  };
  
  // Get selected destination
  const getSelectedDestination = () => {
    return exportDestinations.find(
      (destination) => destination.id === selectedDestination
    );
  };
  
  // Handle content type toggle
  const handleContentTypeToggle = (
    contentType: 'specifications' | 'tasks' | 'analysis'
  ) => {
    setSelectedContentTypes((prev) => {
      if (prev.includes(contentType)) {
        return prev.filter((type) => type !== contentType);
      } else {
        return [...prev, contentType];
      }
    });
  };
  
  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    
    try {
      await onExport({
        format: selectedFormat,
        destination: selectedDestination,
        contentTypes: selectedContentTypes,
        includeImages,
        includeCode,
        includeDiagrams,
      });
      
      onClose();
    } catch (err: any) {
      setError(err.message || t('export.error'));
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('export.title')}</DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          {/* Export Format */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              {t('export.selectFormat')}
            </Typography>
            
            <FormControl component="fieldset">
              <RadioGroup
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
              >
                {exportFormats.map((format) => (
                  <Paper
                    key={format.id}
                    elevation={selectedFormat === format.id ? 3 : 1}
                    sx={{
                      mb: 1,
                      p: 1,
                      border:
                        selectedFormat === format.id
                          ? `1px solid ${theme.palette.primary.main}`
                          : '1px solid transparent',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                      },
                    }}
                    onClick={() => setSelectedFormat(format.id)}
                  >
                    <FormControlLabel
                      value={format.id}
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ mr: 1 }}>{format.icon}</Box>
                          <Box>
                            <Typography variant="subtitle2">
                              {format.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {format.description}
                            </Typography>
                          </Box>
                        </Box>
                      }
                      sx={{ width: '100%', m: 0 }}
                    />
                  </Paper>
                ))}
              </RadioGroup>
            </FormControl>
          </Grid>
          
          {/* Export Destination */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              {t('export.selectDestination')}
            </Typography>
            
            <FormControl component="fieldset">
              <RadioGroup
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
              >
                {exportDestinations.map((destination) => (
                  <Paper
                    key={destination.id}
                    elevation={selectedDestination === destination.id ? 3 : 1}
                    sx={{
                      mb: 1,
                      p: 1,
                      border:
                        selectedDestination === destination.id
                          ? `1px solid ${theme.palette.primary.main}`
                          : '1px solid transparent',
                      cursor: destination.isConnected ? 'pointer' : 'not-allowed',
                      opacity: destination.isConnected ? 1 : 0.5,
                      '&:hover': {
                        borderColor: destination.isConnected
                          ? theme.palette.primary.main
                          : undefined,
                      },
                    }}
                    onClick={() => {
                      if (destination.isConnected) {
                        setSelectedDestination(destination.id);
                      }
                    }}
                  >
                    <FormControlLabel
                      value={destination.id}
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ mr: 1 }}>{destination.icon}</Box>
                          <Box>
                            <Typography variant="subtitle2">
                              {destination.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {destination.description}
                            </Typography>
                            {!destination.isConnected && destination.requiresAuth && (
                              <Typography
                                variant="caption"
                                color="error"
                                sx={{ display: 'block' }}
                              >
                                {t('export.notConnected')}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      }
                      sx={{ width: '100%', m: 0 }}
                      disabled={!destination.isConnected}
                    />
                  </Paper>
                ))}
              </RadioGroup>
            </FormControl>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        {/* Export Options */}
        <Typography variant="h6" gutterBottom>
          {t('export.options')}
        </Typography>
        
        <Grid container spacing={3}>
          {/* Content Types */}
          <Grid item xs={12} md={6}>
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">
                {t('export.contentTypes')}
              </FormLabel>
              
              <Box sx={{ mt: 1 }}>
                {availableContentTypes.map((contentType) => (
                  <FormControlLabel
                    key={contentType}
                    control={
                      <Checkbox
                        checked={selectedContentTypes.includes(contentType)}
                        onChange={() => handleContentTypeToggle(contentType)}
                        disabled={
                          getSelectedFormat()?.contentTypes.includes(
                            contentType
                          ) === false
                        }
                      />
                    }
                    label={t(`export.contentType.${contentType}`)}
                  />
                ))}
              </Box>
            </FormControl>
          </Grid>
          
          {/* Include Options */}
          <Grid item xs={12} md={6}>
            <FormControl component="fieldset">
              <FormLabel component="legend">
                {t('export.includeOptions')}
              </FormLabel>
              
              <Box sx={{ mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeImages}
                      onChange={(e) => setIncludeImages(e.target.checked)}
                    />
                  }
                  label={t('export.includeImages')}
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeCode}
                      onChange={(e) => setIncludeCode(e.target.checked)}
                    />
                  }
                  label={t('export.includeCode')}
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeDiagrams}
                      onChange={(e) => setIncludeDiagrams(e.target.checked)}
                    />
                  }
                  label={t('export.includeDiagrams')}
                />
              </Box>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={isExporting}>
          {t('actions.cancel')}
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          color="primary"
          disabled={
            isExporting ||
            selectedContentTypes.length === 0 ||
            !getSelectedDestination()?.isConnected
          }
          startIcon={isExporting ? <CircularProgress size={20} /> : null}
        >
          {isExporting ? t('export.exporting') : t('export.export')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;
