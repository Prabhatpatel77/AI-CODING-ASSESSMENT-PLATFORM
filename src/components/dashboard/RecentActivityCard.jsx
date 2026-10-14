import React from 'react';
import { Card, CardContent, Typography, Box, Button, Stack } from '@mui/material';
import { History, CheckCircle2, Clock, XCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function RecentActivityCard({ activities = [] }) {
  const { tokens } = useAppTheme();

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircle2 size={15} color={tokens.status.success.main} />;
      case 'Wrong Answer':
        return <XCircle size={15} color={tokens.status.error.main} />;
      case 'In Progress':
      default:
        return <Clock size={15} color={tokens.status.warning.main} />;
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Accepted':
        return 'success';
      case 'Wrong Answer':
        return 'error';
      case 'In Progress':
      default:
        return 'warning';
    }
  };

  return (
    <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History size={16} color={tokens.primary.main} />
            <Typography variant="h4" fontWeight={600}>
              Recent Activity
            </Typography>
          </Box>
          <Button
            component={Link}
            to="/progress"
            variant="text"
            size="small"
            endIcon={<ArrowRight size={13} />}
            sx={{ fontSize: '0.75rem' }}
          >
            Full History
          </Button>
        </Box>

        {activities.length === 0 ? (
          <Box
            sx={{
              p: 3,
              borderRadius: 1.5,
              bgcolor: tokens.background.default,
              border: `1px solid ${tokens.border.subtle}`,
              textAlign: 'center',
            }}
          >
            <History size={22} color={tokens.text.secondary} style={{ margin: '0 auto 8px auto' }} />
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
              No recent activity recorded
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              Your submissions, test fixture evaluations, and hint unlocks will populate here.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {activities.map((act) => (
              <Box
                key={act.id}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: tokens.background.default,
                  border: `1px solid ${tokens.border.subtle}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {getStatusIcon(act.status)}
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {act.problemTitle}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {act.language} · {act.timestamp}
                    </Typography>
                  </Box>
                </Box>

                <StatusBadge variant={getStatusVariant(act.status)} size="small" label={act.status} />
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
