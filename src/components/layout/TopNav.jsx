import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import {
  Terminal,
  Sun,
  Moon,
  User as UserIcon,
  Settings,
  LogOut,
  Menu as MenuIcon,
  ChevronDown,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function TopNav({
  onToggleMobileSidebar,
  apiStatus = 'healthy',
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const { mode, toggleMode, tokens } = useAppTheme();
  const navigate = useNavigate();

  // Top-right Profile menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path) => {
    handleCloseMenu();
    navigate(path);
  };

  const handleLogout = async () => {
    handleCloseMenu();
    await logout();
    navigate('/login', { replace: true });
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleVariant = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'faculty':
        return 'warning';
      case 'student':
      default:
        return 'info';
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: tokens.background.paper,
        borderBottom: `1px solid ${tokens.border.subtle}`,
        color: tokens.text.primary,
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3 },
          minHeight: '56px !important',
          height: '56px',
        }}
      >
        {/* Left: Mobile Toggle & Wordmark */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Mobile drawer toggle */}
          <IconButton
            size="small"
            onClick={onToggleMobileSidebar}
            sx={{
              display: { md: 'none' },
              color: tokens.text.secondary,
              p: '6px',
            }}
          >
            <MenuIcon size={18} />
          </IconButton>

          <Link
            to="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: tokens.text.primary,
            }}
          >
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '6px',
                bgcolor: tokens.primary.subtle,
                color: tokens.primary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${tokens.border.subtle}`,
              }}
            >
              <Terminal size={16} />
            </Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: '-0.02em', lineHeight: 1 }}>
              DevAssess <span style={{ color: tokens.primary.main, fontSize: '0.85em' }}>AI</span>
            </Typography>
          </Link>
        </Box>

        {/* Right: API Status, Theme Toggle & Profile Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Status Badge */}
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <StatusBadge
              variant={apiStatus === 'healthy' ? 'success' : 'error'}
              size="small"
              label={apiStatus === 'healthy' ? 'API Online' : 'Offline'}
            />
          </Box>

          {/* Theme Mode Toggle */}
          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton
              size="small"
              onClick={toggleMode}
              sx={{
                color: tokens.text.secondary,
                border: `1px solid ${tokens.border.subtle}`,
                borderRadius: '6px',
                p: '6px',
                '&:hover': {
                  color: tokens.text.primary,
                  bgcolor: tokens.background.subtle,
                },
              }}
            >
              {mode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </IconButton>
          </Tooltip>

          {/* If Authenticated: User Menu Trigger */}
          {isAuthenticated && user ? (
            <>
              <button
                onClick={handleOpenMenu}
                aria-controls={isMenuOpen ? 'profile-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={isMenuOpen ? 'true' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: tokens.background.default,
                  border: `1px solid ${tokens.border.subtle}`,
                  color: tokens.text.primary,
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: tokens.primary.subtle,
                    color: tokens.primary.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                  }}
                >
                  {getUserInitials(user.name)}
                </Box>
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </span>
                <ChevronDown size={14} color={tokens.text.secondary} />
              </button>

              {/* Profile Menu Dropdown */}
              <Menu
                id="profile-menu"
                anchorEl={anchorEl}
                open={isMenuOpen}
                onClose={handleCloseMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  sx: {
                    minWidth: 220,
                    mt: 1,
                    bgcolor: tokens.background.paper,
                    border: `1px solid ${tokens.border.subtle}`,
                    boxShadow:
                      mode === 'dark'
                        ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                        : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {user.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {user.email}
                  </Typography>
                  <StatusBadge
                    variant={getRoleVariant(user.role)}
                    size="small"
                    label={`${user.role.toUpperCase()} ACCOUNT`}
                  />
                </Box>

                <Divider sx={{ my: 0.5, borderColor: tokens.border.subtle }} />

                <MenuItem onClick={() => handleNavigate('/profile')} sx={{ fontSize: '0.8125rem' }}>
                  <ListItemIcon sx={{ minWidth: 28, color: tokens.text.secondary }}>
                    <UserIcon size={15} />
                  </ListItemIcon>
                  <ListItemText primary="Profile" primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                </MenuItem>

                <MenuItem onClick={() => handleNavigate('/settings')} sx={{ fontSize: '0.8125rem' }}>
                  <ListItemIcon sx={{ minWidth: 28, color: tokens.text.secondary }}>
                    <Settings size={15} />
                  </ListItemIcon>
                  <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                </MenuItem>

                <Divider sx={{ my: 0.5, borderColor: tokens.border.subtle }} />

                <MenuItem onClick={handleLogout} sx={{ fontSize: '0.8125rem', color: tokens.status.error.main }}>
                  <ListItemIcon sx={{ minWidth: 28, color: tokens.status.error.main }}>
                    <LogOut size={15} />
                  </ListItemIcon>
                  <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                </MenuItem>
              </Menu>
            </>
          ) : (
            /* Unauthenticated: Sign In & Register Buttons */
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                component={Link}
                to="/login"
                variant="outlined"
                size="small"
                startIcon={<LogIn size={14} />}
                sx={{ fontSize: '0.75rem', py: 0.5 }}
              >
                Sign In
              </Button>
              <Button
                component={Link}
                to="/register"
                variant="contained"
                size="small"
                startIcon={<UserPlus size={14} />}
                sx={{ fontSize: '0.75rem', py: 0.5 }}
              >
                Register
              </Button>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
