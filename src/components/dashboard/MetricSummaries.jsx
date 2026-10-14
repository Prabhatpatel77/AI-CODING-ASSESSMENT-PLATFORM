import React from 'react';
import { Card, CardContent, Typography, Box, Stack } from '@mui/material';
import { CheckCircle2, Percent, Flame, Calendar } from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';

export default function MetricSummaries({ metrics, streak }) {
  const { tokens } = useAppTheme();

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
        gap: 2.5,
      }}
    >
      {/* 1. Solved Problems Card */}
      <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              Problems Solved
            </Typography>
            <CheckCircle2 size={16} color={tokens.status.success.main} />
          </Box>

          <Typography variant="h3" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums', mb: 2 }}>
            {metrics?.solvedTotal ?? 0}
          </Typography>

          {/* Difficulty breakdown */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 1, borderTop: `1px solid ${tokens.border.subtle}`, fontSize: '0.75rem' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: tokens.status.success.main }} />
              <span style={{ color: tokens.text.secondary }}>Easy:</span>
              <strong style={{ fontFamily: 'monospace' }}>{metrics?.easySolved ?? 0}</strong>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: tokens.status.warning.main }} />
              <span style={{ color: tokens.text.secondary }}>Med:</span>
              <strong style={{ fontFamily: 'monospace' }}>{metrics?.mediumSolved ?? 0}</strong>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: tokens.status.error.main }} />
              <span style={{ color: tokens.text.secondary }}>Hard:</span>
              <strong style={{ fontFamily: 'monospace' }}>{metrics?.hardSolved ?? 0}</strong>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 2. Accuracy Rate Card */}
      <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              Submission Accuracy
            </Typography>
            <Percent size={16} color={tokens.primary.main} />
          </Box>

          <Typography variant="h3" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums', mb: 2 }}>
            {metrics?.accuracyRate !== null && metrics?.accuracyRate !== undefined
              ? `${metrics.accuracyRate}%`
              : '--%'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: `1px solid ${tokens.border.subtle}`, fontSize: '0.75rem', color: tokens.text.secondary }}>
            <span>
              {metrics?.attemptedTotal
                ? `${metrics.attemptedTotal} total submissions`
                : 'No submissions recorded'}
            </span>
            <span>
              {metrics?.solvedTotal ? `${metrics.solvedTotal} accepted` : 'Start practicing'}
            </span>
          </Box>
        </CardContent>
      </Card>

      {/* 3. Learning Streak Card */}
      <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              Current Learning Streak
            </Typography>
            <Flame size={16} color={streak?.currentDays > 0 ? tokens.status.warning.main : tokens.text.secondary} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
            <Typography variant="h3" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {streak?.currentDays ?? 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              days active
            </Typography>
            {streak?.longestDays > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                Best: {streak.longestDays}d
              </Typography>
            )}
          </Box>

          {/* 7-day dot indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: `1px solid ${tokens.border.subtle}` }}>
            {daysOfWeek.map((day, idx) => {
              const isActive = Boolean(streak?.weeklyActivity?.[idx]);
              return (
                <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.625rem', color: tokens.text.secondary }}>
                    {day}
                  </Typography>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: isActive ? tokens.status.warning.main : tokens.background.subtle,
                      border: `1px solid ${isActive ? tokens.status.warning.main : tokens.border.strong}`,
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
