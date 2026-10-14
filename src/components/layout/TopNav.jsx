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
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import {
  Terminal,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  Shield,
  Menu as MenuIcon,
  ChevronDown,
} from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function TopNav({
  onToggleMobileSidebar,
  currentRole,
  onRoleChange,
  apiStatus = 'healthy',
}) {
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

          {/* User Profile & Settings Menu Trigger */}
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
                width: 22,
                height: 22,
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
              U
            </Box>
            <span style={{ textTransform: 'capitalize' }}>{currentRole}</span>
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
                minWidth: 200,
                mt: 1,
                bgcolor: tokens.background.paper,
                border: `1px solid ${tokens.border.subtle}`,
                boxShadow: mode === 'dark'
                  ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Demo Candidate
              </Typography>
              <Typography variant="caption" color="text.secondary">
                candidate@devassess.io
              </Typography>
            </Box>

            <Divider sx={{ my: 0.5, borderColor: tokens.border.subtle }} />

            <MenuItem onClick={() => handleNavigate('/profile')} sx={{ fontSize: '0.8125rem' }}>
              <ListItemIcon sx={{ minWidth: 28, color: tokens.text.secondary }}>
                <User size={15} />
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

            {/* Role Switcher for previewing protected areas */}
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" sx={{ color: tokens.text.secondary, fontWeight: 600, display: 'block', mb: 0.5 }}>
                Simulate Role
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {['student', 'faculty', 'admin'].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      onRoleChange(r);
                      handleCloseMenu();
                    }}
                    style={{
                      flex: 1,
                      padding: '3px 4px',
                      fontSize: '0.6875rem',
                      fontWeight: currentRole === r ? 700 : 500,
                      borderRadius: '4px',
                      border: currentRole === r ? `1px solid ${tokens.primary.main}` : `1px solid ${tokens.border.strong}`,
                      backgroundColor: currentRole === r ? tokens.primary.subtle : 'transparent',
                      color: currentRole === r ? tokens.primary.main : tokens.text.secondary,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </Box>
            </Box>

            <Divider sx={{ my: 0.5, borderColor: tokens.border.subtle }} />

            <MenuItem onClick={handleCloseMenu} sx={{ fontSize: '0.8125rem', color: tokens.status.error.main }}>
              <ListItemIcon sx={{ minWidth: 28, color: tokens.status.error.main }}>
                <LogOut size={15} />
              </ListItemIcon>
              <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: '0.8125rem' }} />
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
