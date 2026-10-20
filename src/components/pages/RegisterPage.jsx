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
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Terminal, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppTheme } from '../../theme/ThemeContext.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const { tokens } = useAppTheme();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // 'student' | 'faculty'

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters.';
    } else if (name.trim().length > 50) {
      errors.name = 'Full name cannot exceed 50 characters.';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email format.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      errors.password = 'Password must contain both letters and numbers.';
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
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', py: { xs: 3, md: 6 }, px: 2 }}>
      <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Header */}
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
              Create an Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Join DevAssess to practice algorithms and take technical assessments.
            </Typography>
          </Box>

          {/* Error Message Alert */}
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          )}

          {/* Registration Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  Full Name
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={Boolean(fieldErrors.name)}
                  helperText={fieldErrors.name}
                  disabled={loading}
                />
              </Box>

              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  Email Address
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="email"
                  placeholder="ada@example.com"
                  autoComplete="email"
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
                  placeholder="At least 8 characters with letters & numbers"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={Boolean(fieldErrors.password)}
                  helperText={fieldErrors.password || 'Must contain at least 8 characters, letters, and numbers'}
                  disabled={loading}
                />
              </Box>

              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  Account Role
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="student">Student (Candidate Workspace)</MenuItem>
                  <MenuItem value="faculty">Faculty (Educator &amp; Problem Author)</MenuItem>
                </TextField>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.6875rem' }}>
                  Note: Administrator accounts are protected and must be provisioned internally.
                </Typography>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <UserPlus size={16} />}
                sx={{ py: 1.2, mt: 1 }}
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ my: 3, borderColor: tokens.border.subtle }} />

          {/* Login Link */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link
                to="/login"
                style={{
                  color: tokens.primary.main,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Sign in
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
