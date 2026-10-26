import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Sparkles,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function AICoachPanel({
  problem,
  code = '',
  language = 'javascript',
  judgeResults = null,
  previousAttempts = [],
}) {
  const { tokens } = useAppTheme();
  const { authFetch, isAuthenticated } = useAuth();

  const [mode, setMode] = useState('hint'); // 'hint' | 'review'
  
  // Hint State
  const [hints, setHints] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  
  // Review State
  const [review, setReview] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRequestHint = async () => {
    if (!isAuthenticated) {
      setError('Please log in to receive interactive AI coaching hints.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch('/api/ai/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem,
          code,
          language,
          judgeResults,
          previousAttempts: Array.isArray(previousAttempts) ? previousAttempts.length : 0,
          previousHints: hints.map((h) => h.hintText),
          hintLevel: currentLevel,
        }),
      });

      const resData = await response.json();
      if (!response.ok || resData.status !== 'success') throw new Error(resData.message);

      const newHint = resData.data.hint;
      setHints((prev) => [...prev, newHint]);
      setCurrentLevel(newHint.nextAvailableLevel);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReview = async () => {
    if (!isAuthenticated) {
      setError('Please log in to receive AI code review.');
      return;
    }
    setLoading(true);
    setError(null);
    setReview(null);

    try {
      const response = await authFetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          concept: 'Code Quality & Complexity',
          userContext: { problem: problem?.title },
        }),
      });

      const resData = await response.json();
      if (!response.ok || resData.status !== 'success') throw new Error(resData.message);

      setReview(resData.data.explanation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
      <Stack spacing={2.5}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
          <Tabs value={mode} onChange={(_, newValue) => setMode(newValue)} variant="fullWidth">
            <Tab value="hint" label="AI Coach" icon={<HelpCircle size={16} />} iconPosition="start" />
            <Tab value="review" label="Code Review" icon={<Search size={16} />} iconPosition="start" />
          </Tabs>
        </Box>

        {error && <Alert severity="error" sx={{ fontSize: '0.8125rem' }}>{error}</Alert>}

        {mode === 'hint' ? (
          /* Hint Mode UI */
          <Stack spacing={2}>
            {hints.map((hint, idx) => (
              <Card key={idx} sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper, boxShadow: 'none' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>Level {hint.hintLevel}: {hint.stageLabel}</Typography>
                  <Typography variant="body2" sx={{ my: 1 }}>{hint.hintText}</Typography>
                  <Typography variant="caption" color="text.secondary">Coach Note: {hint.rationale}</Typography>
                </CardContent>
              </Card>
            ))}
            {currentLevel !== null ? (
              <Button variant="contained" fullWidth onClick={handleRequestHint} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : <Sparkles size={16} />}>
                {loading ? 'Thinking...' : 'Get Next Hint'}
              </Button>
            ) : <Alert severity="success">All hints unlocked.</Alert>}
          </Stack>
        ) : (
          /* Code Review Mode UI */
          <Stack spacing={2}>
            {!review && (
              <Button variant="contained" fullWidth onClick={handleRequestReview} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : <Sparkles size={16} />}>
                {loading ? 'Analyzing...' : 'Run Code Review'}
              </Button>
            )}
            {review && (
              <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>Review Summary</Typography>
                  <Typography variant="body2" sx={{ my: 1 }}>{review.summary}</Typography>
                  <Typography variant="caption" fontWeight={600}>Complexity: {review.timeComplexity} Time / {review.spaceComplexity} Space</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>{review.complexityExplanation}</Typography>
                </CardContent>
              </Card>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
