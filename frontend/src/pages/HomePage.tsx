import React from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardMedia,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Import icons
import {
  VideoLibrary as VideoIcon,
  Code as CodeIcon,
  Task as TaskIcon,
  Extension as IntegrationIcon, // Using Extension icon instead of Integration
} from '@mui/icons-material';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const features = [
    {
      title: 'Video Analysis',
      description: 'Upload videos and get detailed analysis of UI/UX elements and workflows.',
      icon: <VideoIcon fontSize="large" color="primary" />,
    },
    {
      title: 'Specification Generation',
      description: 'Automatically generate detailed software specifications from video content.',
      icon: <CodeIcon fontSize="large" color="primary" />,
    },
    {
      title: 'Task Creation',
      description: 'Convert specifications into actionable development tasks with dependencies.',
      icon: <TaskIcon fontSize="large" color="primary" />,
    },
    {
      title: 'Project Management Integration',
      description: 'Export tasks to popular project management tools like Trello, GitHub, and ClickUp.',
      icon: <IntegrationIcon fontSize="large" color="primary" />,
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          pt: 8,
          pb: 6,
          borderRadius: 2,
          mb: 6,
          boxShadow: 1,
        }}
      >
        <Container maxWidth="lg">
          <Typography
            component="h1"
            variant="h2"
            align="center"
            color="text.primary"
            gutterBottom
            sx={{ fontWeight: 'bold' }}
          >
            Video2Tool
          </Typography>
          <Typography variant="h5" align="center" color="text.secondary" paragraph>
            Transform videos into software development specifications and tasks.
            Analyze UI/UX, generate detailed specifications, and create actionable tasks
            for your development team.
          </Typography>
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate(isAuthenticated ? '/upload' : '/register')}
              sx={{ px: 4, py: 1.5, borderRadius: 2 }}
            >
              {isAuthenticated ? 'Upload Video' : 'Get Started'}
            </Button>
            {!isAuthenticated && (
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{ ml: 2, px: 4, py: 1.5, borderRadius: 2 }}
              >
                Log In
              </Button>
            )}
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography
          variant="h4"
          component="h2"
          align="center"
          color="text.primary"
          gutterBottom
          sx={{ mb: 6 }}
        >
          Key Features
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item key={index} xs={12} sm={6} md={3}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6,
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: 3,
                  }}
                >
                  {feature.icon}
                </Box>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h3" align="center">
                    {feature.title}
                  </Typography>
                  <Typography align="center" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ bgcolor: 'background.paper', py: 8, borderRadius: 2, boxShadow: 1 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            component="h2"
            align="center"
            color="text.primary"
            gutterBottom
            sx={{ mb: 6 }}
          >
            How It Works
          </Typography>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  1. Upload a Video
                </Typography>
                <Typography paragraph>
                  Upload a video or provide a URL. Our system processes the video, transcribes the content,
                  and analyzes visual elements.
                </Typography>
                <Typography variant="h6" gutterBottom>
                  2. Generate Specifications
                </Typography>
                <Typography paragraph>
                  AI analyzes the video content to create detailed software specifications,
                  identifying UI components, user flows, and functional requirements.
                </Typography>
                <Typography variant="h6" gutterBottom>
                  3. Create Development Tasks
                </Typography>
                <Typography paragraph>
                  Convert specifications into actionable development tasks with dependencies,
                  priorities, and estimates.
                </Typography>
                <Typography variant="h6" gutterBottom>
                  4. Export to Your Tools
                </Typography>
                <Typography paragraph>
                  Export tasks to your preferred project management tools or download as
                  JSON, Markdown, or PDF.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  bgcolor: 'grey.200',
                  height: 300,
                  borderRadius: 2,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6" color="text.secondary">
                  [Workflow Diagram]
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            p: 6,
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to Transform Your Development Process?
          </Typography>
          <Typography variant="h6" paragraph>
            Start converting videos into actionable development tasks today.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => navigate(isAuthenticated ? '/upload' : '/register')}
            sx={{ mt: 2, px: 4, py: 1.5, borderRadius: 2 }}
          >
            {isAuthenticated ? 'Upload Video' : 'Get Started'}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;
