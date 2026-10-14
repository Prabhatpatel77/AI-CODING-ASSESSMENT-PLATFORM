import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Alert,
  Skeleton,
  ButtonGroup,
} from '@mui/material';
import { RefreshCw, Sparkles, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import { EMPTY_DASHBOARD_DATA, DEMO_PREVIEW_DASHBOARD_DATA } from '../../contracts/dashboardContracts.js';
import WelcomeGoalCard from '../dashboard/WelcomeGoalCard.jsx';
import MetricSummaries from '../dashboard/MetricSummaries.jsx';
import ContinueLearningCard from '../dashboard/ContinueLearningCard.jsx';
import RecommendedProblemsCard from '../dashboard/RecommendedProblemsCard.jsx';
import UpcomingAssessmentsCard from '../dashboard/UpcomingAssessmentsCard.jsx';
import RecentActivityCard from '../dashboard/RecentActivityCard.jsx';

export default function StudentDashboard() {
  const { tokens } = useAppTheme();

  // Mode: 'empty' (Default: true empty state) | 'demo' (Preview populated state)
  const [dataMode, setDataMode] = useState('empty');

  // Loading and Error state simulations
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const activeData = dataMode === 'demo' ? DEMO_PREVIEW_DASHBOARD_DATA : EMPTY_DASHBOARD_DATA;

  const handleSimulateReload = () => {
    setLoading(true);
    setHasError(false);
    setTimeout(() => {
      setLoading(false);
    }, 400);
  };

  const handleTriggerError = () => {
    setHasError(true);
  };

  return (
    <Box sx={{ maxWidth: 1120, mx: 'auto', py: 1 }}>
      {/* State Switcher & Contract Notification Toolbar */}
      <Box
        sx={{
          mb: 3.5,
          p: 2,
          borderRadius: 1.5,
          bgcolor: tokens.background.paper,
          border: `1px solid ${tokens.border.subtle}`,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { md: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Student Dashboard Workspace
            </Typography>
            <StatusBadge
              variant={dataMode === 'empty' ? 'neutral' : 'info'}
              size="small"
              label={dataMode === 'empty' ? 'Explicit Empty State (Default)' : 'Demo Preview Dataset'}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {dataMode === 'empty'
              ? 'Showing unattempted new-student state. No fabricated analytics presented as actual student metrics.'
              : 'Showing sample demo data contract to evaluate populated layout behavior and progress indicators.'}
          </Typography>
        </Box>

        {/* State Toggles (Empty / Demo Preview / Loading / Error) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <ButtonGroup size="small" variant="outlined" sx={{ bgcolor: tokens.background.default }}>
            <Button
              onClick={() => {
                setDataMode('empty');
                setHasError(false);
              }}
              variant={dataMode === 'empty' && !hasError ? 'contained' : 'outlined'}
              sx={{ fontSize: '0.6875rem' }}
            >
              Empty State
            </Button>
            <Button
              onClick={() => {
                setDataMode('demo');
                setHasError(false);
              }}
              variant={dataMode === 'demo' && !hasError ? 'contained' : 'outlined'}
              sx={{ fontSize: '0.6875rem' }}
            >
              Demo Preview
            </Button>
          </ButtonGroup>

          <Button
            size="small"
            variant="outlined"
            onClick={handleSimulateReload}
            disabled={loading}
            startIcon={<RefreshCw size={12} className={loading ? 'animate-spin' : ''} />}
            sx={{ fontSize: '0.6875rem' }}
          >
            Test Loading
          </Button>

          <Button
            size="small"
            variant="outlined"
            onClick={() => setHasError(!hasError)}
            color={hasError ? 'error' : 'inherit'}
            sx={{ fontSize: '0.6875rem' }}
          >
            {hasError ? 'Clear Error' : 'Test Error'}
          </Button>
        </Box>
      </Box>

      {/* Error State Banner */}
      {hasError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => setHasError(false)}>
              Dismiss
            </Button>
          }
        >
          Unable to synchronize student learning telemetry with backend repository. Click "Dismiss" or switch presets.
        </Alert>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <Stack spacing={3}>
          <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 2, bgcolor: tokens.background.subtle }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <Skeleton variant="rectangular" height={130} sx={{ borderRadius: 2, bgcolor: tokens.background.subtle }} />
            <Skeleton variant="rectangular" height={130} sx={{ borderRadius: 2, bgcolor: tokens.background.subtle }} />
            <Skeleton variant="rectangular" height={130} sx={{ borderRadius: 2, bgcolor: tokens.background.subtle }} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 3 }}>
            <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2, bgcolor: tokens.background.subtle }} />
            <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2, bgcolor: tokens.background.subtle }} />
          </Box>
        </Stack>
      ) : (
        /* Populated or Empty Dashboard Content */
        <Stack spacing={3}>
          {/* 1. Welcome & Daily Learning Goal */}
          <WelcomeGoalCard
            studentName={activeData.studentName}
            dailyGoal={activeData.dailyGoal}
            isDemo={dataMode === 'demo'}
          />

          {/* 2. Solved Problems, Accuracy, and Learning Streak Summaries */}
          <MetricSummaries
            metrics={activeData.metrics}
            streak={activeData.streak}
          />

          {/* 3. Balanced 2-Column Responsive Workspace Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            {/* Left Column: Continue Learning & Recommended Problems */}
            <Stack spacing={3}>
              <ContinueLearningCard item={activeData.continueLearning} />
              <RecommendedProblemsCard problems={activeData.recommendedProblems} />
            </Stack>

            {/* Right Column: Upcoming Assessments & Recent Activity */}
            <Stack spacing={3}>
              <UpcomingAssessmentsCard assessments={activeData.upcomingAssessments} />
              <RecentActivityCard activities={activeData.recentActivity} />
            </Stack>
          </Box>
        </Stack>
      )}
    </Box>
  );
}
