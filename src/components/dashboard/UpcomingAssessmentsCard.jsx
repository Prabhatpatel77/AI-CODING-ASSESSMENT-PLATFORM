import React from 'react';
import { Card, CardContent, Typography, Box, Button, Stack } from '@mui/material';
import { Award, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function UpcomingAssessmentsCard({ assessments = [] }) {
  const { tokens } = useAppTheme();

  return (
    <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Award size={16} color={tokens.status.warning.main} />
            <Typography variant="h4" fontWeight={600}>
              Upcoming Assessments
            </Typography>
          </Box>
          <Button
            component={Link}
            to="/assessments"
            variant="text"
            size="small"
            endIcon={<ArrowRight size={13} />}
            sx={{ fontSize: '0.75rem' }}
          >
            All Exams
          </Button>
        </Box>

        {assessments.length === 0 ? (
          <Box
            sx={{
              p: 3,
              borderRadius: 1.5,
              bgcolor: tokens.background.default,
              border: `1px solid ${tokens.border.subtle}`,
              textAlign: 'center',
            }}
          >
            <Calendar size={22} color={tokens.text.secondary} style={{ margin: '0 auto 8px auto' }} />
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
              No assessments scheduled
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              Your assigned technical examinations and timed cohort evaluations will appear here.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {assessments.map((item) => (
              <Box
                key={item.id}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: tokens.background.default,
                  border: `1px solid ${tokens.border.subtle}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {item.title}
                    </Typography>
                    {item.isMandatory && (
                      <StatusBadge variant="warning" size="small" label="Required" />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <span>{item.track}</span>
                    <span>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />
                      {item.durationMinutes} min
                    </span>
                    <span>·</span>
                    <span>{item.scheduledDate}</span>
                  </Typography>
                </Box>

                <Button
                  component={Link}
                  to="/assessments"
                  variant="outlined"
                  size="small"
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  View Details
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
