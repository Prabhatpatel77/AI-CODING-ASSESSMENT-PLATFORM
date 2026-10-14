import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Stack } from '@mui/material';
import { Target, CheckCircle2, Sparkles } from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function WelcomeGoalCard({
  studentName = 'Candidate',
  dailyGoal,
  isDemo = false,
}) {
  const { tokens } = useAppTheme();

  const completed = dailyGoal?.completedCount || 0;
  const target = dailyGoal?.targetCount || 2;
  const progressPercent = Math.min(Math.round((completed / target) * 100), 100);
  const isGoalReached = completed >= target && target > 0;

  return (
    <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
          {/* Welcome Title */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
                Welcome back, {studentName}
              </Typography>
              {isDemo && (
                <StatusBadge variant="neutral" size="small" label="Demo Profile" />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Keep your momentum going. Solve coding challenges to sharpen your technical readiness.
            </Typography>
          </Box>

          {/* Daily Goal Box */}
          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: tokens.background.default,
              border: `1px solid ${tokens.border.subtle}`,
              minWidth: { sm: 260 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Target size={15} color={tokens.primary.main} />
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  {dailyGoal?.label || 'Daily Goal'}
                </Typography>
              </Box>
              <Typography variant="caption" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums', color: tokens.text.primary }}>
                {completed} / {target} Solved
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: tokens.background.subtle,
                '& .MuiLinearProgress-bar': {
                  bgcolor: isGoalReached ? tokens.status.success.main : tokens.primary.main,
                  borderRadius: 3,
                },
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Typography variant="caption" sx={{ fontSize: '0.6875rem', color: isGoalReached ? tokens.status.success.main : tokens.text.secondary }}>
                {isGoalReached ? 'Daily target achieved!' : `${target - completed} more to reach goal`}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.6875rem', color: tokens.text.secondary, fontVariantNumeric: 'tabular-nums' }}>
                {progressPercent}%
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
