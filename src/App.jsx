import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import {
  Code,
  CheckCircle2,
  RefreshCw,
  Server,
  Zap,
  Bug,
} from 'lucide-react';

// Dark developer-first Material UI theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1', // Electric Indigo
    },
    secondary: {
      main: '#10b981', // Emerald
    },
    background: {
      default: '#090d16',
      paper: '#111827',
    },
    text: {
      primary: '#f9fafb',
      secondary: '#9ca3af',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
  },
});

export default function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);

  // Test error handling state
  const [testErrorResponse, setTestErrorResponse] = useState(null);
  const [testingError, setTestingError] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      const elapsed = Math.round(performance.now() - start);

      if (!res.ok) {
        throw new Error(data.message || `Health check failed with status ${res.status}`);
      }

      setHealth(data);
      setLatency(elapsed);
    } catch (err) {
      console.error('Failed to fetch health check:', err);
      setError(err.message || 'Could not connect to backend Express server.');
    } finally {
      setLoading(false);
    }
  };

  const testErrorHandling = async () => {
    setTestingError(true);
    setTestErrorResponse(null);
    try {
      const res = await fetch('/api/unhandled-test-route');
      const data = await res.json();
      setTestErrorResponse({
        httpStatus: res.status,
        body: data,
      });
    } catch (err) {
      setTestErrorResponse({
        httpStatus: 'Network Error',
        body: { error: err.message },
      });
    } finally {
      setTestingError(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top App Bar */}
        <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(99, 102, 241, 0.15)',
                  color: 'primary.main',
                }}
              >
                <Code size={20} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  AI Coding Assessment Platform
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Project Foundation
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {health && (
                <Chip
                  icon={<CheckCircle2 size={14} style={{ color: '#10b981' }} />}
                  label="API Connected"
                  color="success"
                  size="small"
                  variant="outlined"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                />
              )}
            </Box>
          </Toolbar>
        </AppBar>

        {/* Main Content Area */}
        <Container maxWidth="md" sx={{ py: 6, flex: 1 }}>
          <Stack spacing={4}>
            {/* Header Hero */}
            <Box sx={{ textAlign: 'center', spaceY: 1 }}>
              <Typography variant="h4" fontWeight={800} gutterBottom>
                Core Foundation Initialized
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
                React 19 + Vite frontend integrated with Material UI v6 and Node.js + Express backend.
                Ready for iterative feature implementation.
              </Typography>
            </Box>

            {/* Error State */}
            {error && (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={fetchHealth}
                    startIcon={<RefreshCw size={14} />}
                  >
                    Retry
                  </Button>
                }
              >
                {error}
              </Alert>
            )}

            {/* Loading State */}
            {loading && !health && (
              <Card sx={{ p: 6, textAlign: 'center' }}>
                <CircularProgress size={32} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Connecting to Express backend at <code>/api/health</code>...
                </Typography>
              </Card>
            )}

            {/* Health-Check Status Card (Success State) */}
            {health && (
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Server size={18} color="#6366f1" />
                        <Typography variant="h6" fontWeight={700}>
                          Backend Health Check
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={fetchHealth}
                        startIcon={<RefreshCw size={14} />}
                        disabled={loading}
                      >
                        Refresh
                      </Button>
                    </Box>
                  }
                  subheader="Live diagnostics reported by Node.js Express server"
                />
                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
                <CardContent>
                  <Stack spacing={2.5}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                      <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Service Status
                        </Typography>
                        <Typography variant="body1" fontWeight={700} color="secondary.main">
                          {health.status.toUpperCase()}
                        </Typography>
                      </Box>

                      <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          API Response Latency
                        </Typography>
                        <Typography variant="body1" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {latency} ms
                        </Typography>
                      </Box>

                      <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Node.js Runtime
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                          {health.nodeVersion}
                        </Typography>
                      </Box>

                      <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Environment Mode
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                          {health.environment}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Server Uptime
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {health.uptime} seconds ({Math.floor(health.uptime / 60)}m {Math.floor(health.uptime % 60)}s)
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Basic Error Handling Verification Section */}
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Bug size={18} color="#6366f1" />
                    <Typography variant="h6" fontWeight={700}>
                      Error Handling Middleware Verification
                    </Typography>
                  </Box>
                }
                subheader="Test the centralized Express error handler with an unhandled route"
              />
              <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Click the button below to trigger a request to <code>GET /api/unhandled-test-route</code> and verify
                    that the backend responds with a structured JSON 404 error envelope.
                  </Typography>

                  <Box>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={testErrorHandling}
                      disabled={testingError}
                      startIcon={testingError ? <CircularProgress size={16} color="inherit" /> : <Zap size={16} />}
                    >
                      {testingError ? 'Requesting...' : 'Trigger Unhandled Route Test'}
                    </Button>
                  </Box>

                  {testErrorResponse && (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'background.default',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Received HTTP {testErrorResponse.httpStatus} Response:
                      </Typography>
                      <pre style={{ margin: 0, color: '#f87171' }}>
                        {JSON.stringify(testErrorResponse.body, null, 2)}
                      </pre>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Architecture Overview */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Foundational Architecture Summary
                </Typography>
                <Stack spacing={1} sx={{ color: 'text.secondary', fontSize: 13 }}>
                  <Typography variant="inherit">
                    • <strong>Frontend</strong>: React 19 + Vite with Material UI v6 component layer.
                  </Typography>
                  <Typography variant="inherit">
                    • <strong>Backend</strong>: Node.js Express server mounting <code>/api/health</code> with request logging.
                  </Typography>
                  <Typography variant="inherit">
                    • <strong>Dev Integration</strong>: Vite dev middlewares mounted directly inside Express (<code>server.js</code>).
                  </Typography>
                  <Typography variant="inherit">
                    • <strong>Configuration</strong>: Environment variables documented in <code>.env.example</code>.
                  </Typography>
                  <Typography variant="inherit">
                    • <strong>Codebase</strong>: Pure JavaScript &amp; JSX; no TypeScript or premature database/execution code.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
