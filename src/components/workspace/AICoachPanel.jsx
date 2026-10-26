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
  Divider,
} from '@mui/material';
import {
  Sparkles,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
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
  const { tokens, mode } = useAppTheme();
  const { authFetch, isAuthenticated } = useAuth();

  const [hints, setHints] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getStageBadgeVariant = (level) => {
    switch (level) {
      case 1:
        return 'info';
      case 2:
        return 'warning';
      case 3:
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getStageTitle = (level) => {
    switch (level) {
      case 1:
        return 'Level 1: Conceptual Clue';
      case 2:
        return 'Level 2: Algorithmic Direction';
      case 3:
        return 'Level 3: Specific Guidance';
      default:
        return `Hint Level ${level}`;
    }
  };

  const handleRequestHint = async () => {
    if (!isAuthenticated) {
      setError('Please log in to receive interactive AI coaching hints.');
      return;
    }

    if (!code || !code.trim()) {
      setError('Please write some initial code or thoughts in the editor before requesting a hint.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authFetch('/api/ai/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: {
            title: problem?.title || 'Coding Problem',
            description: problem?.description || '',
            constraints: problem?.constraints || [],
          },
          code,
          language,
          judgeResults,
          previousAttempts: Array.isArray(previousAttempts) ? previousAttempts.length : 0,
          previousHints: hints.map((h) => h.hintText),
          hintLevel: currentLevel,
        }),
      });

      const resData = await response.json();

      if (!response.ok || resData.status !== 'success') {
        const errorMsg = resData.message || 'Failed to generate hint from AI coach.';
        throw new Error(errorMsg);
      }

      const newHint = resData.data.hint;
      setHints((prev) => [...prev, newHint]);
      setCurrentLevel(newHint.nextAvailableLevel);
    } catch (err) {
      setError(err.message || 'An error occurred while contacting the hint agent.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetHints = () => {
    setHints([]);
    setCurrentLevel(1);
    setError(null);
  };

  return (
    <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
      <Stack spacing={2.5}>
        {/* Header Banner */}
        <Box
          sx={{
            p: 2,
            borderRadius: 1.5,
            bgcolor: tokens.background.default,
            border: `1px solid ${tokens.border.subtle}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
                Adaptive Socratic Mentor
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Progressive hints without spoiling the solution.
              </Typography>
            </Box>
          </Box>

          {hints.length > 0 && (
            <Button
              size="small"
              variant="text"
              onClick={handleResetHints}
              startIcon={<RotateCcw size={13} />}
              sx={{ fontSize: '0.75rem', color: tokens.text.secondary }}
            >
              Reset
            </Button>
          )}
        </Box>

        {/* Error Notification */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            icon={<AlertCircle size={16} />}
            sx={{ fontSize: '0.8125rem' }}
          >
            {error}
          </Alert>
        )}

        {/* Hints Progress Bar / Overview */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            bgcolor: tokens.background.default,
            border: `1px solid ${tokens.border.subtle}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            Progressive Tiers Unlocked: <strong>{hints.length} of 3</strong>
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {[1, 2, 3].map((lvl) => {
              const isUnlocked = hints.some((h) => h.hintLevel === lvl);
              return (
                <Box
                  key={lvl}
                  sx={{
                    width: 24,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: isUnlocked ? tokens.primary.main : tokens.border.strong,
                    transition: 'background-color 0.2s ease',
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Unlocked Hints List */}
        {hints.length > 0 && (
          <Stack spacing={2}>
            {hints.map((hint, idx) => (
              <Card
                key={idx}
                sx={{
                  border: `1px solid ${tokens.border.subtle}`,
                  bgcolor: tokens.background.paper,
                  boxShadow: 'none',
                }}
              >
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Lightbulb size={16} color={tokens.primary.main} />
                      <Typography variant="subtitle2" fontWeight={700}>
                        {getStageTitle(hint.hintLevel)}
                      </Typography>
                    </Box>
                    <StatusBadge
                      variant={getStageBadgeVariant(hint.hintLevel)}
                      size="small"
                      label={hint.stageLabel || `Tier ${hint.hintLevel}`}
                    />
                  </Box>

                  {/* Concept Tag */}
                  {hint.concept && (
                    <Box sx={{ mb: 1.5 }}>
                      <Chip
                        label={`Concept: ${hint.concept}`}
                        size="small"
                        sx={{
                          fontSize: '0.6875rem',
                          height: 20,
                          bgcolor: tokens.background.default,
                          border: `1px solid ${tokens.border.subtle}`,
                          color: tokens.text.secondary,
                        }}
                      />
                    </Box>
                  )}

                  {/* Socratic Hint Body */}
                  <Typography
                    variant="body2"
                    sx={{
                      lineHeight: 1.6,
                      color: tokens.text.primary,
                      whiteSpace: 'pre-wrap',
                      mb: 1.5,
                    }}
                  >
                    {hint.hintText}
                  </Typography>

                  {/* Rationale Footer */}
                  {hint.rationale && (
                    <Box
                      sx={{
                        p: 1.25,
                        borderRadius: 1,
                        bgcolor: tokens.background.default,
                        borderLeft: `3px solid ${tokens.primary.main}`,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: tokens.text.secondary, display: 'block' }}>
                        <strong style={{ color: tokens.text.primary }}>Coach Note: </strong>
                        {hint.rationale}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        {/* Action Button to Request Next Hint */}
        {currentLevel !== null ? (
          <Box sx={{ pt: 1 }}>
            <Button
              variant="contained"
              fullWidth
              disabled={loading}
              onClick={handleRequestHint}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Sparkles size={16} />}
              endIcon={!loading && <ArrowRight size={14} />}
              sx={{
                py: 1.2,
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              {loading
                ? 'Consulting AI Mentor...'
                : hints.length === 0
                ? 'Request Conceptual Clue (Level 1)'
                : currentLevel === 2
                ? 'Request Algorithmic Direction (Level 2)'
                : 'Request Specific Guidance (Level 3)'}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              {hints.length === 0
                ? 'Analyzes your current code draft and test verdict to deliver a subtle nudge.'
                : 'Builds upon previous clues without revealing the code solution.'}
            </Typography>
          </Box>
        ) : (
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
            <CheckCircle2 size={18} color={tokens.status.success.main} />
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                All 3 Progressive Hint Tiers Unlocked
              </Typography>
              <Typography variant="caption" color="text.secondary">
                You have received all available hints for this challenge. Review your logic and submit your solution.
              </Typography>
            </Box>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
