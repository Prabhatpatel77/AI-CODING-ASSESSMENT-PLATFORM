import React from 'react';
import { Card, CardContent, Typography, Box, Button, Stack } from '@mui/material';
import { Sparkles, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function RecommendedProblemsCard({ problems = [] }) {
  const { tokens } = useAppTheme();

  const getDifficultyVariant = (diff) => {
    switch (diff) {
      case 'Easy':
        return 'success';
      case 'Medium':
        return 'warning';
      case 'Hard':
        return 'error';
      default:
        return 'neutral';
    }
  };

  return (
    <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Sparkles size={16} color={tokens.primary.main} />
            <Typography variant="h4" fontWeight={600}>
              Recommended Challenges
            </Typography>
          </Box>
          <Button
            component={Link}
            to="/practice"
            variant="text"
            size="small"
            endIcon={<ArrowRight size={13} />}
            sx={{ fontSize: '0.75rem' }}
          >
            View All Problems
          </Button>
        </Box>

        <Stack spacing={1.5}>
          {problems.map((prob) => (
            <Box
              key={prob.id}
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: tokens.background.default,
                border: `1px solid ${tokens.border.subtle}`,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { sm: 'center' },
                gap: 1.5,
                transition: 'border-color 0.15s ease',
                '&:hover': {
                  borderColor: tokens.border.strong,
                },
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {prob.title}
                  </Typography>
                  <StatusBadge variant={getDifficultyVariant(prob.difficulty)} size="small" label={prob.difficulty} />
                  <span style={{ fontSize: '0.6875rem', color: tokens.text.secondary }}>
                    {prob.category}
                  </span>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <span>{prob.reason}</span>
                  <span>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} />
                    {prob.estimatedMinutes} min
                  </span>
                </Typography>
              </Box>

              <Button
                component={Link}
                to="/practice"
                variant="outlined"
                size="small"
                sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, whiteSpace: 'nowrap' }}
              >
                Solve Challenge
              </Button>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
