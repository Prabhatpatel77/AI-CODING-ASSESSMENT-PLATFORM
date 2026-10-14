import React from 'react';
import { Box, Typography, Card, CardContent, Button, Stack, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Construction, CheckCircle2 } from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function RoutePlaceholder({
  title,
  subtitle,
  category = 'Student Area',
  roleRequired = null, // 'Student' | 'Faculty' | 'Admin'
  plannedCapabilities = [],
  breadcrumbs = [],
}) {
  const { tokens } = useAppTheme();
  const navigate = useNavigate();

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', py: 1 }}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <Breadcrumbs
          aria-label="breadcrumb"
          sx={{ mb: 2, fontSize: '0.75rem', color: tokens.text.secondary }}
        >
          <MuiLink
            component={Link}
            to="/"
            underline="hover"
            sx={{ color: tokens.text.secondary, '&:hover': { color: tokens.primary.main } }}
          >
            Home
          </MuiLink>
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return isLast ? (
              <Typography key={idx} sx={{ fontSize: '0.75rem', color: tokens.text.primary, fontWeight: 600 }}>
                {crumb.label}
              </Typography>
            ) : (
              <MuiLink
                key={idx}
                component={Link}
                to={crumb.path}
                underline="hover"
                sx={{ color: tokens.text.secondary, '&:hover': { color: tokens.primary.main } }}
              >
                {crumb.label}
              </MuiLink>
            );
          })}
        </Breadcrumbs>
      )}

      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Typography variant="h2" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
              {title}
            </Typography>
            {roleRequired ? (
              <StatusBadge variant="warning" size="small" label={`${roleRequired} Protected`} />
            ) : (
              <StatusBadge variant="info" size="small" label={category} />
            )}
          </Box>
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowLeft size={14} />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
      </Box>

      {/* Placeholder Specification Card */}
      <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={3}>
            {/* Status notification banner */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 1.5,
                bgcolor: tokens.background.default,
                border: `1px solid ${tokens.border.subtle}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
              }}
            >
              {roleRequired ? (
                <Lock size={20} color={tokens.status.warning.main} style={{ flexShrink: 0, marginTop: 2 }} />
              ) : (
                <Construction size={20} color={tokens.primary.main} style={{ flexShrink: 0, marginTop: 2 }} />
              )}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ color: tokens.text.primary, mb: 0.5 }}>
                  {roleRequired ? `Role-Protected Route (${roleRequired} Area)` : 'Planned Feature Module'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {roleRequired
                    ? `This route is reserved for authenticated ${roleRequired.toLowerCase()} accounts. The application shell provides full navigation routing to this module in advance of backend role-based access control (RBAC).`
                    : 'This route shell is registered and accessible via React Router. The underlying feature view will be implemented in accordance with the phased project roadmap.'}
                </Typography>
              </Box>
            </Box>

            {/* Planned Capabilities Checklist */}
            {plannedCapabilities.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontWeight: 600 }}>
                  Planned Capabilities for this Module
                </Typography>
                <Stack spacing={1.5}>
                  {plannedCapabilities.map((cap, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <CheckCircle2 size={16} color={tokens.primary.main} style={{ flexShrink: 0, marginTop: 2 }} />
                      <Typography variant="body2" sx={{ color: tokens.text.secondary }}>
                        {cap}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
