import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Terminal, LogIn, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppTheme } from '../../theme/ThemeContext.jsx';

export default function LoginPage() {
  const { login, sessionExpired, clearSessionExpiredAlert } = useAuth();
  const { tokens } = useAppTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email format (e.g. student@example.com).';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) return;

    try {
      setLoading(true);
      await login({ email: email.trim(), password });
      const destination = location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 440, mx: 'auto', py: { xs: 4, md: 8 }, px: 2 }}>
      <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Brand & Heading */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '8px',
                bgcolor: tokens.primary.subtle,
                color: tokens.primary.main,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
                border: `1px solid ${tokens.border.subtle}`,
              }}
            >
              <Terminal size={22} />
            </Box>
            <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
              Sign In to DevAssess
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Access your workspace, code assessments, and progress.
            </Typography>
          </Box>

          {/* Session Expiry Banner */}
          {sessionExpired && (
            <Alert
              severity="warning"
              sx={{ mb: 2.5 }}
              onClose={clearSessionExpiredAlert}
            >
              Your session has expired. Please sign in to re-authenticate.
            </Alert>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  Email Address
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="email"
                  placeholder="student@example.com"
                  autoComplete="username"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={Boolean(fieldErrors.email)}
                  helperText={fieldErrors.email}
                  disabled={loading}
                />
              </Box>

              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  Password
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={Boolean(fieldErrors.password)}
                  helperText={fieldErrors.password}
                  disabled={loading}
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LogIn size={16} />}
                sx={{ py: 1.2, mt: 1 }}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ my: 3, borderColor: tokens.border.subtle }} />

          {/* Registration Link */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account yet?{' '}
              <Link
                to="/register"
                style={{
                  color: tokens.primary.main,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Create an account
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
