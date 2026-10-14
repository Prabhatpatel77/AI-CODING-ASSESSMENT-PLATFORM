import React from 'react';
import { Box, AppBar, Toolbar, Typography, Button, IconButton, Tooltip } from '@mui/material';
import { Terminal, Sun, Moon, ShieldCheck } from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function AppHeader({
  activeNav = 'workspace',
  onNavChange,
  navItems = [],
  apiStatus = 'healthy',
  onPrimaryAction,
  primaryActionLabel = 'New Session',
}) {
  const { mode, toggleMode, tokens } = useAppTheme();

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: tokens.background.paper,
        borderBottom: `1px solid ${tokens.border.subtle}`,
        color: tokens.text.primary,
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3, md: 4 },
          minHeight: '56px !important',
          gap: { xs: 2, md: 4 },
        }}
      >
        {/* Zone 1: Wordmark & Brand Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '6px',
              bgcolor: tokens.primary.subtle,
              color: tokens.primary.main,
              border: `1px solid ${tokens.border.subtle}`,
            }}
          >
            <Terminal size={18} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{
                letterSpacing: '-0.02em',
                color: tokens.text.primary,
                whiteSpace: 'nowrap',
              }}
            >
              DevAssess <span style={{ color: tokens.primary.main, fontSize: '0.85em' }}>AI</span>
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: tokens.text.secondary,
                display: { xs: 'none', sm: 'inline-block' },
                fontSize: '0.6875rem',
                fontFamily: 'monospace',
              }}
            >
              v0.1-workspace
            </Typography>
          </Box>
        </Box>

        {/* Zone 2: Navigation Links (Single-line with subtle hover underlines) */}
        {navItems.length > 0 && (
          <Box
            component="nav"
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 3,
            }}
          >
            {navItems.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavChange && onNavChange(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? tokens.primary.main : tokens.text.secondary,
                    borderBottom: isActive ? `2px solid ${tokens.primary.main}` : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </Box>
        )}

        {/* Zone 3: Actions & Theme Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          {/* Status Indicator */}
          <StatusBadge
            variant={apiStatus === 'healthy' ? 'success' : 'error'}
            size="small"
            label={apiStatus === 'healthy' ? 'Online' : 'Offline'}
          />

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

          {/* Primary Action Button */}
          {onPrimaryAction && (
            <Button
              variant="contained"
              size="small"
              onClick={onPrimaryAction}
              sx={{
                whiteSpace: 'nowrap',
                fontWeight: 600,
                fontSize: '0.8125rem',
              }}
            >
              {primaryActionLabel}
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
