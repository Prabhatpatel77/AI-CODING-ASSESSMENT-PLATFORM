import React from 'react';
import { Card, CardContent, Typography, Box, Button, LinearProgress } from '@mui/material';
import { Play, ArrowRight, BookOpen, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function ContinueLearningCard({ item }) {
  const { tokens } = useAppTheme();

  if (!item) {
    return (
      <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Continue Learning
              </Typography>
              <Typography variant="h4" fontWeight={600} sx={{ mb: 0.5 }}>
                Ready to begin your first challenge
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a recommended challenge below to initialize your coding workspace and test runner.
              </Typography>
            </Box>

            <Button
              component={Link}
              to="/practice"
              variant="contained"
              size="small"
              endIcon={<ArrowRight size={14} />}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Browse Library
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="caption" fontWeight={600} color="text.secondary">
            Continue Learning · In Progress
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.75rem', color: tokens.text.secondary }}>
            <Clock size={13} />
            <span>Worked {item.lastWorkedAt}</span>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
              <Typography variant="h4" fontWeight={700}>
                {item.title}
              </Typography>
              <StatusBadge variant={getDifficultyVariant(item.difficulty)} size="small" label={item.difficulty} />
              <span style={{ fontSize: '0.75rem', color: tokens.text.secondary }}>
                {item.category} · {item.language}
              </span>
            </Box>

            {/* Completion percentage bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, maxWidth: 380 }}>
              <LinearProgress
                variant="determinate"
                value={item.percentCompleted}
                sx={{
                  flex: 1,
                  height: 5,
                  borderRadius: 2.5,
                  bgcolor: tokens.background.subtle,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: tokens.primary.main,
                  },
                }}
              />
              <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums', color: tokens.text.secondary }}>
                {item.percentCompleted}% solution drafted
              </Typography>
            </Box>
          </Box>

          <Button
            component={Link}
            to="/practice"
            variant="contained"
            size="small"
            startIcon={<Play size={14} />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Resume Problem
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
