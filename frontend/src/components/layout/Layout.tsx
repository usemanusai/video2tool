import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box,
  CssBaseline,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme as useMuiTheme,
  Tooltip,
  VisuallyHidden,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import SkipLink from '@components/a11y/SkipLink';
import LanguageSelector from '@components/common/LanguageSelector';
import NotificationsPanel from '@components/collaboration/NotificationsPanel';
import ActiveUsers from '@components/collaboration/ActiveUsers';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  Folder as FolderIcon,
  VideoLibrary as VideoIcon,
  Description as DescriptionIcon,
  Task as TaskIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Integration as IntegrationIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

const drawerWidth = 240;

const Layout: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { mode, toggleColorMode } = useTheme();
  const muiTheme = useMuiTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const { t } = useTranslation();

  const [open, setOpen] = useState(!isMobile);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: t('navigation.dashboard'), icon: <DashboardIcon />, path: '/dashboard', requiresAuth: true },
    { text: t('navigation.projects'), icon: <FolderIcon />, path: '/projects', requiresAuth: true },
    { text: t('navigation.upload'), icon: <VideoIcon />, path: '/upload', requiresAuth: true },
    { text: t('navigation.integrations'), icon: <IntegrationIcon />, path: '/integrations', requiresAuth: true },
    { text: t('navigation.profile'), icon: <PersonIcon />, path: '/profile', requiresAuth: true },
  ];

  const drawer = (
    <>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: [1],
        }}
      >
        <Typography variant="h6" noWrap component="div">
          {t('app.name')}
        </Typography>
        <IconButton
          onClick={handleDrawerClose}
          aria-label={t('actions.close')}
        >
          <ChevronLeftIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      <List
        component="nav"
        aria-label="Main navigation"
      >
        {menuItems.map((item) => {
          // Skip items that require authentication if user is not authenticated
          if (item.requiresAuth && !isAuthenticated) return null;

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
                aria-current={location.pathname === item.path ? 'page' : undefined}
              >
                <ListItemIcon aria-hidden="true">{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}

        <Divider sx={{ my: 1 }} />

        {isAuthenticated ? (
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              aria-label={t('navigation.logout')}
            >
              <ListItemIcon aria-hidden="true">
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary={t('navigation.logout')} />
            </ListItemButton>
          </ListItem>
        ) : (
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigation('/login')}
              aria-label={t('navigation.login')}
            >
              <ListItemIcon aria-hidden="true">
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary={t('navigation.login')} />
            </ListItemButton>
          </ListItem>
        )}

        <ListItem disablePadding>
          <ListItemButton
            onClick={toggleColorMode}
            aria-label={t('theme.toggle')}
          >
            <ListItemIcon aria-hidden="true">
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </ListItemIcon>
            <ListItemText primary={t(mode === 'dark' ? 'theme.light' : 'theme.dark')} />
          </ListItemButton>
        </ListItem>

        {/* Language selector in drawer */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={(e) => e.currentTarget.querySelector('button')?.click()}
            aria-label={t('language.select')}
          >
            <ListItemIcon aria-hidden="true">
              <LanguageIcon />
            </ListItemIcon>
            <ListItemText primary={t('language.select')} />
            <Box sx={{ mr: -1 }}>
              <LanguageSelector variant="icon" />
            </Box>
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      {/* Skip link for keyboard accessibility */}
      <SkipLink targetId="main-content" />

      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          transition: (theme) =>
            theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          ...(open && {
            marginLeft: drawerWidth,
            width: `calc(100% - ${drawerWidth}px)`,
            transition: (theme) =>
              theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerOpen}
            sx={{
              marginRight: 5,
              ...(open && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {t('app.name')}
          </Typography>

          {/* Language selector */}
          <LanguageSelector variant="icon" />

          {/* Notifications panel */}
          {isAuthenticated && <NotificationsPanel />}

          {/* Active users */}
          {isAuthenticated && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }}>
              <ActiveUsers variant="avatars" maxUsers={3} />
            </Box>
          )}

          {isAuthenticated && (
            <Tooltip title={user?.email || ''}>
              <IconButton
                color="inherit"
                onClick={() => handleNavigation('/profile')}
                aria-label={t('navigation.profile')}
              >
                <PersonIcon />
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            color="inherit"
            onClick={toggleColorMode}
            aria-label={t('theme.toggle')}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={open}
        onClose={handleDrawerClose}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${open ? drawerWidth : 0}px)` },
          minHeight: '100vh',
          backgroundColor: (theme) => theme.palette.background.default,
          outline: 'none', // Remove focus outline for tabIndex
        }}
        aria-label="Main content"
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
