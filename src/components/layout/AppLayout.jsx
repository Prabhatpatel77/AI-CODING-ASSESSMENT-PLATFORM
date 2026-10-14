import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import AppHeader from './AppHeader.jsx';

export default function AppLayout({
  children,
  activeNav,
  onNavChange,
  navItems = [],
  apiStatus = 'healthy',
  onPrimaryAction,
  primaryActionLabel,
  maxWidth = 'lg',
}) {
  const { mode, tokens } = useAppTheme();

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
      {/* Top Header */}
      <AppHeader
        activeNav={activeNav}
        onNavChange={onNavChange}
        navItems={navItems}
        apiStatus={apiStatus}
        onPrimaryAction={onPrimaryAction}
        primaryActionLabel={primaryActionLabel}
      />

      {/* Main Content Area */}
      <Box component="main" sx={{ flex: 1, py: { xs: 3, md: 5 } }}>
        <Container maxWidth={maxWidth} sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          {children}
        </Container>
      </Box>

      {/* Developer Bottom Status Bar */}
      <Box
        component="footer"
        sx={{
          py: 1,
          px: { xs: 2, sm: 4 },
          borderTop: `1px solid ${tokens.border.subtle}`,
          bgcolor: tokens.background.paper,
          fontSize: '0.6875rem',
          color: tokens.text.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: tokens.status.success.main,
              }}
            />
            <span style={{ fontFamily: 'monospace' }}>API {apiStatus.toUpperCase()}</span>
          </Box>
          <span style={{ color: tokens.border.strong }}>·</span>
          <span>Theme: <strong style={{ color: tokens.text.primary, textTransform: 'capitalize' }}>{mode}</strong></span>
          <span style={{ color: tokens.border.strong }}>·</span>
          <span>Accent: <strong style={{ color: tokens.primary.main }}>Violet (#8b5cf6)</strong></span>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'monospace' }}>
          <span>Press <kbd style={{ padding: '1px 4px', borderRadius: 3, border: `1px solid ${tokens.border.strong}` }}>Tab</kbd> to inspect focus rings</span>
        </Box>
      </Box>
    </Box>
  );
}
