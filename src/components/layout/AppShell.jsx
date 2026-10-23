import React, { useState, useEffect } from 'react';
import { Box, Drawer, Typography } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import TopNav from './TopNav.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppShell() {
  const { user, isAuthenticated } = useAuth();
  const { tokens, mode } = useAppTheme();
  const location = useLocation();

  // Desktop sidebar collapse state
  const [collapsed, setCollapsed] = useState(false);

  // Mobile sidebar drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Active user role
  const userRole = user?.role || (isAuthenticated ? 'student' : 'guest');

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: tokens.background.default,
        color: tokens.text.primary,
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      {/* Top Navigation */}
      <TopNav
        onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)}
      />

      {/* Main Workspace Frame (Sidebar + Content) */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Desktop Sidebar */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
          />
        </Box>

        {/* Mobile Drawer Sidebar */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: 240,
              bgcolor: tokens.background.paper,
              borderRight: `1px solid ${tokens.border.subtle}`,
            },
          }}
        >
          <Sidebar
            collapsed={false}
            onToggleCollapse={() => setMobileOpen(false)}
          />
        </Drawer>

        {/* Content Viewport */}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: { xs: 2.5, sm: 4, md: 5 },
            height: 'calc(100vh - 56px - 28px)',
          }}
        >
          <Outlet context={{ user, userRole }} />
        </Box>
      </Box>

      {/* Developer Bottom Status Bar */}
      <Box
        component="footer"
        sx={{
          height: '28px',
          px: 3,
          borderTop: `1px solid ${tokens.border.subtle}`,
          bgcolor: tokens.background.paper,
          fontSize: '0.6875rem',
          color: tokens.text.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" sx={{ color: tokens.text.secondary, fontWeight: 600 }}>
            AI Coding Assessment Platform
          </Typography>
          <span style={{ color: tokens.border.strong }}>·</span>
          <Typography variant="caption" sx={{ color: tokens.text.secondary }}>
            Technical Evaluation Environment
          </Typography>
        </Box>

        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" sx={{ color: tokens.text.secondary }}>
            Role: <strong style={{ color: tokens.primary.main, textTransform: 'capitalize' }}>{userRole}</strong>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
