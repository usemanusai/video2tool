import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Chip,
  IconButton,
  Button,
  TextField,
  Grid,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
  Architecture as ArchitectureIcon,
  DataObject as DataObjectIcon,
  Api as ApiIcon,
  Storage as StorageIcon,
  DesignServices as DesignIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Specification section interface
interface SpecSection {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'code' | 'json' | 'diagram';
  language?: string;
  children?: SpecSection[];
}

// Specification interface
interface Specification {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  sections: SpecSection[];
}

// Component props
interface SpecificationVisualizerProps {
  specification: Specification;
  editable?: boolean;
  onSave?: (updatedSpec: Specification) => void;
}

const SpecificationVisualizer: React.FC<SpecificationVisualizerProps> = ({
  specification,
  editable = false,
  onSave,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editedSpec, setEditedSpec] = useState<Specification>(specification);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      if (prev.includes(sectionId)) {
        return prev.filter((id) => id !== sectionId);
      } else {
        return [...prev, sectionId];
      }
    });
  };
  
  // Check if section matches search query
  const matchesSearch = (section: SpecSection): boolean => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    if (
      section.title.toLowerCase().includes(query) ||
      section.content.toLowerCase().includes(query)
    ) {
      return true;
    }
    
    if (section.children) {
      return section.children.some((child) => matchesSearch(child));
    }
    
    return false;
  };
  
  // Copy content to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a snackbar notification here
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    if (editMode) {
      // Discard changes
      setEditedSpec(specification);
    }
    setEditMode(!editMode);
  };
  
  // Save changes
  const saveChanges = () => {
    if (onSave) {
      onSave(editedSpec);
    }
    setEditMode(false);
  };
  
  // Update section content
  const updateSectionContent = (sectionId: string, content: string) => {
    const updateSection = (sections: SpecSection[]): SpecSection[] => {
      return sections.map((section) => {
        if (section.id === sectionId) {
          return { ...section, content };
        }
        
        if (section.children) {
          return {
            ...section,
            children: updateSection(section.children),
          };
        }
        
        return section;
      });
    };
    
    setEditedSpec((prev) => ({
      ...prev,
      sections: updateSection(prev.sections),
    }));
  };
  
  // Render section content
  const renderSectionContent = (section: SpecSection) => {
    if (editMode) {
      return (
        <TextField
          fullWidth
          multiline
          minRows={4}
          maxRows={20}
          value={
            editedSpec.sections
              .flatMap((s) => (s.children ? [s, ...s.children] : [s]))
              .find((s) => s.id === section.id)?.content || ''
          }
          onChange={(e) => updateSectionContent(section.id, e.target.value)}
          variant="outlined"
          sx={{ mt: 1, mb: 2 }}
        />
      );
    }
    
    switch (section.type) {
      case 'code':
      case 'json':
        return (
          <Box sx={{ position: 'relative', mt: 1, mb: 2 }}>
            <IconButton
              size="small"
              onClick={() => copyToClipboard(section.content)}
              sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
            <SyntaxHighlighter
              language={section.language || 'javascript'}
              style={tomorrow}
              customStyle={{
                margin: 0,
                borderRadius: theme.shape.borderRadius,
              }}
            >
              {section.content}
            </SyntaxHighlighter>
          </Box>
        );
      case 'diagram':
        // For diagrams, you could integrate with a diagram rendering library
        // For now, we'll just display it as code
        return (
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('specifications.diagram')}
            </Typography>
            <SyntaxHighlighter
              language="markdown"
              style={tomorrow}
              customStyle={{
                margin: 0,
                borderRadius: theme.shape.borderRadius,
              }}
            >
              {section.content}
            </SyntaxHighlighter>
          </Box>
        );
      case 'text':
      default:
        return (
          <Typography variant="body1" sx={{ mt: 1, mb: 2, whiteSpace: 'pre-wrap' }}>
            {section.content}
          </Typography>
        );
    }
  };
  
  // Render section
  const renderSection = (section: SpecSection, level = 0) => {
    if (!matchesSearch(section)) {
      return null;
    }
    
    const isExpanded = expandedSections.includes(section.id);
    const hasChildren = section.children && section.children.length > 0;
    
    return (
      <React.Fragment key={section.id}>
        <ListItem
          button
          onClick={() => toggleSection(section.id)}
          sx={{ pl: level * 2 }}
        >
          <ListItemIcon>
            {section.type === 'code' ? (
              <CodeIcon />
            ) : section.type === 'json' ? (
              <DataObjectIcon />
            ) : section.type === 'diagram' ? (
              <ArchitectureIcon />
            ) : (
              <DescriptionIcon />
            )}
          </ListItemIcon>
          <ListItemText primary={section.title} />
          {hasChildren && (isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />)}
        </ListItem>
        
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ pl: (level + 1) * 2, pr: 2, py: 1 }}>
            {renderSectionContent(section)}
            
            {hasChildren && (
              <List disablePadding>
                {section.children!.map((child) => renderSection(child, level + 1))}
              </List>
            )}
          </Box>
        </Collapse>
      </React.Fragment>
    );
  };
  
  // Tabs content
  const tabContent = [
    // Document View
    <Box key="document">
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder={t('specifications.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
          }}
          variant="outlined"
          size="small"
        />
      </Box>
      
      <List>
        {specification.sections.map((section) => renderSection(section))}
      </List>
    </Box>,
    
    // Overview
    <Box key="overview">
      <Typography variant="h6" gutterBottom>
        {specification.title}
      </Typography>
      <Typography variant="body1" paragraph>
        {specification.description}
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" color="text.secondary">
            {t('specifications.created')}
          </Typography>
          <Typography variant="body1">
            {new Date(specification.created_at).toLocaleDateString()}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" color="text.secondary">
            {t('specifications.updated')}
          </Typography>
          <Typography variant="body1">
            {new Date(specification.updated_at).toLocaleDateString()}
          </Typography>
        </Grid>
      </Grid>
      
      <Typography variant="h6" gutterBottom>
        {t('specifications.sections')}
      </Typography>
      <List>
        {specification.sections.map((section) => (
          <ListItem key={section.id}>
            <ListItemIcon>
              {section.type === 'code' ? (
                <CodeIcon />
              ) : section.type === 'json' ? (
                <DataObjectIcon />
              ) : section.type === 'diagram' ? (
                <ArchitectureIcon />
              ) : (
                <DescriptionIcon />
              )}
            </ListItemIcon>
            <ListItemText
              primary={section.title}
              secondary={
                section.children
                  ? `${section.children.length} ${t('specifications.subsections')}`
                  : null
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>,
  ];
  
  return (
    <Box>
      <Paper sx={{ mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="specification tabs"
          >
            <Tab label={t('specifications.document')} />
            <Tab label={t('specifications.overview')} />
          </Tabs>
        </Box>
        
        {editable && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            {editMode ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={saveChanges}
                >
                  {t('actions.save')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={toggleEditMode}
                >
                  {t('actions.cancel')}
                </Button>
              </Box>
            ) : (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={toggleEditMode}
              >
                {t('actions.edit')}
              </Button>
            )}
          </Box>
        )}
        
        <Box sx={{ p: 2 }}>{tabContent[activeTab]}</Box>
      </Paper>
    </Box>
  );
};

export default SpecificationVisualizer;
