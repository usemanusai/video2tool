import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Paper,
  TextField,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  VpnKey as VpnKeyIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Security as SecurityIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme as useAppTheme } from '@/hooks/useTheme';
import PageHeader from '@/components/common/PageHeader';
import ContentCard from '@/components/common/ContentCard';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorMessage from '@/components/common/ErrorMessage';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { mode, toggleColorMode } = useAppTheme();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Profile form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  // Password change dialog
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Logout confirmation dialog
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  
  // Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  
  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, you would update the user profile on the server
      // For now, we'll just show a success message
      
      setTimeout(() => {
        setLoading(false);
        alert('Profile updated successfully');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      setLoading(false);
    }
  };
  
  const handleOpenPasswordDialog = () => {
    setOpenPasswordDialog(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
  };
  
  const handleClosePasswordDialog = () => {
    setOpenPasswordDialog(false);
  };
  
  const handleChangePassword = async () => {
    // Validate passwords
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    
    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      setPasswordError(null);
      
      // In a real implementation, you would change the password on the server
      // For now, we'll just show a success message
      
      setTimeout(() => {
        setLoading(false);
        handleClosePasswordDialog();
        alert('Password changed successfully');
      }, 1000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
      setLoading(false);
    }
  };
  
  const handleOpenLogoutDialog = () => {
    setOpenLogoutDialog(true);
  };
  
  const handleCloseLogoutDialog = () => {
    setOpenLogoutDialog(false);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  if (loading) {
    return <LoadingScreen message="Updating profile..." />;
  }

  return (
    <Box>
      <PageHeader
        title="Profile"
        subtitle="Manage your account settings"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Profile' },
        ]}
      />
      
      {error && <ErrorMessage message={error} />}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <ContentCard title="Account">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: theme.palette.primary.main,
                  fontSize: 40,
                  mb: 2,
                }}
              >
                {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
              </Avatar>
              <Typography variant="h6">{user?.full_name || 'User'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </Typography>
            </Box>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Change Password"
                  secondary="Update your password"
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleOpenPasswordDialog}
                >
                  Change
                </Button>
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemIcon>
                  <PaletteIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Theme"
                  secondary={`${mode === 'dark' ? 'Dark' : 'Light'} mode`}
                />
                <Switch
                  checked={mode === 'dark'}
                  onChange={toggleColorMode}
                  inputProps={{ 'aria-label': 'toggle theme' }}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemIcon>
                  <NotificationsIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Email Notifications"
                  secondary="Receive email updates"
                />
                <Switch
                  checked={emailNotifications}
                  onChange={() => setEmailNotifications(!emailNotifications)}
                  inputProps={{ 'aria-label': 'toggle notifications' }}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem button onClick={handleOpenLogoutDialog}>
                <ListItemIcon>
                  <LogoutIcon color="error" />
                </ListItemIcon>
                <ListItemText
                  primary="Logout"
                  secondary="Sign out of your account"
                  primaryTypographyProps={{ color: 'error' }}
                />
              </ListItem>
            </List>
          </ContentCard>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <ContentCard title="Profile Information">
            <Box component="form" noValidate sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                fullWidth
                id="fullName"
                label="Full Name"
                name="fullName"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <PersonIcon color="action" sx={{ mr: 1 }} />
                  ),
                }}
              />
              
              <TextField
                margin="normal"
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <EmailIcon color="action" sx={{ mr: 1 }} />
                  ),
                }}
              />
              
              <Button
                type="button"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                onClick={handleUpdateProfile}
              >
                Update Profile
              </Button>
            </Box>
          </ContentCard>
          
          <ContentCard title="Usage Statistics" sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography variant="h4" color="primary">
                    0
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Projects
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography variant="h4" color="primary">
                    0
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Videos Analyzed
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography variant="h4" color="primary">
                    0
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tasks Generated
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </ContentCard>
        </Grid>
      </Grid>
      
      {/* Password Change Dialog */}
      <Dialog open={openPasswordDialog} onClose={handleClosePasswordDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}
          
          <TextField
            margin="dense"
            fullWidth
            id="currentPassword"
            label="Current Password"
            type="password"
            variant="outlined"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <VpnKeyIcon color="action" sx={{ mr: 1 }} />
              ),
            }}
          />
          
          <TextField
            margin="dense"
            fullWidth
            id="newPassword"
            label="New Password"
            type="password"
            variant="outlined"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <VpnKeyIcon color="action" sx={{ mr: 1 }} />
              ),
            }}
          />
          
          <TextField
            margin="dense"
            fullWidth
            id="confirmPassword"
            label="Confirm New Password"
            type="password"
            variant="outlined"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <VpnKeyIcon color="action" sx={{ mr: 1 }} />
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog}>Cancel</Button>
          <Button onClick={handleChangePassword} variant="contained">
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Logout Confirmation Dialog */}
      <Dialog open={openLogoutDialog} onClose={handleCloseLogoutDialog}>
        <DialogTitle>Logout</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to log out?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLogoutDialog}>Cancel</Button>
          <Button onClick={handleLogout} color="error">
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
