import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Alert,
} from '@mui/material';
import { Sparkles, HelpCircle, Activity, ShieldCheck, Lock } from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function AICoachPanel({ problem }) {
  const { tokens } = useAppTheme();

  return (
    <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
      <Stack spacing={3}>
        {/* Header Banner */}
        <Box
          sx={{
            p: 2,
            borderRadius: 1.5,
            bgcolor: tokens.background.default,
            border: `1px solid ${tokens.border.subtle}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              bgcolor: tokens.primary.subtle,
              color: tokens.primary.main,
            }}
          >
            <Sparkles size={20} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              AI Engineering Coach
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Multi-agent mentoring powered by Gemini API.
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
          AI Coach integration is scheduled for the upcoming prompt. The capabilities below describe the
          planned multi-agent architectural pipeline.
        </Alert>

        {/* Planned Coaching Capabilities */}
        <Stack spacing={2}>
          {/* 1. Socratic Hints */}
          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: tokens.background.default,
              border: `1px solid ${tokens.border.subtle}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HelpCircle size={16} color={tokens.primary.main} />
                <Typography variant="subtitle2" fontWeight={600}>
                  3-Tier Progressive Socratic Hints
                </Typography>
              </Box>
              <StatusBadge variant="neutral" size="small" label="Stage 1" />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, display: 'block' }}>
              Delivers subtle architectural clues without giving away the full code solution, guiding you toward optimal algorithmic patterns.
            </Typography>
          </Box>

          {/* 2. Complexity Analysis */}
          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: tokens.background.default,
              border: `1px solid ${tokens.border.subtle}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Activity size={16} color={tokens.status.warning.main} />
                <Typography variant="subtitle2" fontWeight={600}>
                  Complexity &amp; Big-O Analyzer
                </Typography>
              </Box>
              <StatusBadge variant="neutral" size="small" label="Stage 2" />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, display: 'block' }}>
              Evaluates your draft code for time (O(n), O(n log n)) and auxiliary space complexity, identifying brute-force bottlenecks.
            </Typography>
          </Box>

          {/* 3. Style & Edge Cases */}
          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: tokens.background.default,
              border: `1px solid ${tokens.border.subtle}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShieldCheck size={16} color={tokens.status.success.main} />
                <Typography variant="subtitle2" fontWeight={600}>
                  Edge Case &amp; Boundary Checker
                </Typography>
              </Box>
              <StatusBadge variant="neutral" size="small" label="Stage 3" />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, display: 'block' }}>
              Flags potential integer overflow, null pointers, empty array boundaries, and off-by-one loops before final submission.
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}
