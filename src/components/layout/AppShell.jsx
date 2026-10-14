import React, { useState, useEffect } from 'react';
import { Box, Drawer } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import TopNav from './TopNav.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppShell() {
  const { tokens, mode } = useAppTheme();
  const location = useLocation();

  // Desktop sidebar collapse state
  const [collapsed, setCollapsed] = useState(false);

  // Mobile sidebar drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Simulated role state ('student' | 'faculty' | 'admin')
  const [currentRole, setCurrentRole] = useState('student');

  // Live health state from /api/health
  const [apiStatus, setApiStatus] = useState('healthy');
  const [uptime, setUptime] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setApiStatus(data.status || 'healthy');
        setUptime(data.uptime);
      })
      .catch(() => setApiStatus('offline'));
  }, []);

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
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        apiStatus={apiStatus}
      />

      {/* Main Workspace Frame (Sidebar + Content) */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Desktop Sidebar */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
            userRole={currentRole}
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
            userRole={currentRole}
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
          <Outlet context={{ currentRole, apiStatus }} />
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: apiStatus === 'healthy' ? tokens.status.success.main : tokens.status.error.main,
              }}
            />
            <span style={{ fontFamily: 'monospace' }}>API {apiStatus.toUpperCase()}</span>
          </Box>
          <span style={{ color: tokens.border.strong }}>·</span>
          <span>Route: <strong style={{ color: tokens.text.primary, fontFamily: 'monospace' }}>{location.pathname}</strong></span>
          <span style={{ color: tokens.border.strong }}>·</span>
          <span>Role: <strong style={{ color: tokens.primary.main, textTransform: 'capitalize' }}>{currentRole}</strong></span>
        </Box>

        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2 }}>
          <span>Theme: <strong style={{ color: tokens.text.primary, textTransform: 'capitalize' }}>{mode}</strong></span>
          {uptime !== null && (
            <>
              <span style={{ color: tokens.border.strong }}>·</span>
              <span style={{ fontFamily: 'monospace' }}>Uptime: {Math.round(uptime)}s</span>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
