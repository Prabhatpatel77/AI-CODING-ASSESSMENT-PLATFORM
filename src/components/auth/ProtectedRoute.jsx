import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, CircularProgress } from '@mui/material';
import { Lock, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { user, loading, isAuthenticated } = useAuth();
  const { tokens } = useAppTheme();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <CircularProgress size={32} sx={{ color: tokens.primary.main }} />
        <Typography variant="body2" color="text.secondary">
          Authenticating session...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based permission
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Box sx={{ maxWidth: 640, mx: 'auto', py: 6, px: 2 }}>
        <Card sx={{ border: `1px solid ${tokens.status.error.border}`, bgcolor: tokens.background.paper }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: tokens.status.error.subtle,
                color: tokens.status.error.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <ShieldAlert size={24} />
            </Box>

            <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
              Access Restricted
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
              <StatusBadge variant="error" size="small" label={`Requires: ${allowedRoles.join(', ')}`} />
              <StatusBadge variant="neutral" size="small" label={`Your Role: ${user.role}`} />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
              You do not have the required permissions to access this module. Please switch to an authorized
              account or return to your student workspace.
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button component={Link} to="/" variant="contained" size="small" startIcon={<ArrowLeft size={14} />}>
                Return to Dashboard
              </Button>
              <Button component={Link} to="/login" variant="outlined" size="small">
                Sign In With Another Account
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return children;
}
