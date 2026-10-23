import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import { X, ArrowRight, TrendingUp, TrendingDown, Clock, Cpu, CheckCircle2, AlertCircle, Code, Copy, Check } from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

/**
 * Computes simple line-by-line diff markers between two text strings
 */
function computeLineDiff(codeA = '', codeB = '') {
  const linesA = codeA.split('\n');
  const linesB = codeB.split('\n');

  const maxLen = Math.max(linesA.length, linesB.length);
  const rows = [];

  for (let i = 0; i < maxLen; i++) {
    const textA = linesA[i] !== undefined ? linesA[i] : null;
    const textB = linesB[i] !== undefined ? linesB[i] : null;

    let type = 'unchanged';
    if (textA === null && textB !== null) type = 'added';
    else if (textA !== null && textB === null) type = 'removed';
    else if (textA !== textB) type = 'modified';

    rows.push({
      lineNum: i + 1,
      textA,
      textB,
      type,
    });
  }

  return rows;
}

export default function AttemptComparisonDialog({
  open,
  onClose,
  baseSubmission,
  compareSubmission,
  onLoadCodeIntoWorkspace,
}) {
  const { tokens } = useAppTheme();
  const { authFetch } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [comparisonMetrics, setComparisonMetrics] = useState(null);
  const [copiedAttempt, setCopiedAttempt] = useState(null);
  const [diffViewMode, setDiffViewMode] = useState('split'); // 'split' | 'unified'

  useEffect(() => {
    if (!open || !baseSubmission?.id || !compareSubmission?.id) {
      setComparisonMetrics(null);
      setError(null);
      return;
    }

    const fetchComparison = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(
          `/api/submissions/compare?baseId=${baseSubmission.id}&compareId=${compareSubmission.id}`
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to compare submissions.');
        }
        setComparisonMetrics(data.comparisonMetrics);
      } catch (err) {
        setError(err.message || 'Error calculating comparison metrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [open, baseSubmission?.id, compareSubmission?.id, authFetch]);

  if (!baseSubmission || !compareSubmission) return null;

  const lineDiffRows = computeLineDiff(baseSubmission.code, compareSubmission.code);

  const handleCopyCode = (text, attemptKey) => {
    navigator.clipboard.writeText(text);
    setCopiedAttempt(attemptKey);
    setTimeout(() => setCopiedAttempt(null), 2000);
  };

  const getVerdictVariant = (status) => {
    if (status === 'ACCEPTED') return 'success';
    if (status === 'WRONG_ANSWER') return 'error';
    if (status === 'TIME_LIMIT_EXCEEDED' || status === 'MEMORY_LIMIT_EXCEEDED') return 'warning';
    return 'default';
  };

  const scoreDelta = (compareSubmission.score || 0) - (baseSubmission.score || 0);
  const durationDelta = (compareSubmission.durationMs || 0) - (baseSubmission.durationMs || 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: tokens.background.default,
          color: tokens.text.primary,
          borderRadius: 2,
          border: `1px solid ${tokens.border.main}`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 2.5,
          borderBottom: `1px solid ${tokens.border.subtle}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Attempt Comparison
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {baseSubmission.problemTitle || baseSubmission.problemSlug} · Comparing 2 Candidate Evaluations
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            variant={diffViewMode === 'split' ? 'contained' : 'outlined'}
            onClick={() => setDiffViewMode('split')}
            sx={{ fontSize: '0.75rem', py: 0.25 }}
          >
            Side-by-Side
          </Button>
          <Button
            size="small"
            variant={diffViewMode === 'unified' ? 'contained' : 'outlined'}
            onClick={() => setDiffViewMode('unified')}
            sx={{ fontSize: '0.75rem', py: 0.25 }}
          >
            Unified Diff
          </Button>
          <IconButton size="small" onClick={onClose} sx={{ color: tokens.text.secondary, ml: 1 }}>
            <X size={18} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.8125rem' }}>
            {error}
          </Alert>
        )}

        {/* Head-to-Head Comparative Metric Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 1.5,
            mb: 3,
          }}
        >
          {/* 1. Score Delta Card */}
          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: tokens.background.paper,
              border: `1px solid ${tokens.border.subtle}`,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Score Outcome
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                {baseSubmission.score}%
              </Typography>
              <ArrowRight size={16} style={{ color: tokens.text.secondary }} />
              <Typography variant="h6" fontWeight={700}>
                {compareSubmission.score}%
              </Typography>
              {scoreDelta !== 0 && (
                <Chip
                  size="small"
                  label={`${scoreDelta > 0 ? '+' : ''}${scoreDelta}%`}
                  color={scoreDelta > 0 ? 'success' : 'error'}
                  sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 700 }}
                />
              )}
            </Box>
          </Box>

          {/* 2. Verdict Progression Card */}
          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: tokens.background.paper,
              border: `1px solid ${tokens.border.subtle}`,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Judge Verdict
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <StatusBadge
                variant={getVerdictVariant(baseSubmission.status)}
                size="small"
                label={baseSubmission.status}
              />
              <ArrowRight size={14} style={{ color: tokens.text.secondary }} />
              <StatusBadge
                variant={getVerdictVariant(compareSubmission.status)}
                size="small"
                label={compareSubmission.status}
              />
            </Box>
          </Box>

          {/* 3. Runtime Delta Card */}
          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: tokens.background.paper,
              border: `1px solid ${tokens.border.subtle}`,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Execution Runtime
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Clock size={16} style={{ color: tokens.text.secondary }} />
              <Typography variant="h6" fontWeight={700}>
                {baseSubmission.durationMs || 0}ms
              </Typography>
              <ArrowRight size={16} style={{ color: tokens.text.secondary }} />
              <Typography variant="h6" fontWeight={700}>
                {compareSubmission.durationMs || 0}ms
              </Typography>
              {durationDelta !== 0 && (
                <Chip
                  size="small"
                  label={`${durationDelta < 0 ? '' : '+'}${durationDelta}ms`}
                  color={durationDelta < 0 ? 'success' : 'default'}
                  sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 700 }}
                />
              )}
            </Box>
          </Box>

          {/* 4. Test Suite Pass Ratio Card */}
          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: tokens.background.paper,
              border: `1px solid ${tokens.border.subtle}`,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Tests Passed
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <CheckCircle2 size={16} style={{ color: tokens.text.secondary }} />
              <Typography variant="h6" fontWeight={700}>
                {baseSubmission.passedTests}/{baseSubmission.totalTests}
              </Typography>
              <ArrowRight size={16} style={{ color: tokens.text.secondary }} />
              <Typography variant="h6" fontWeight={700}>
                {compareSubmission.passedTests}/{compareSubmission.totalTests}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Code Comparison Section */}
        <Box sx={{ borderRadius: 1.5, border: `1px solid ${tokens.border.subtle}`, overflow: 'hidden' }}>
          {/* Attempt Column Headers */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: diffViewMode === 'split' ? { xs: '1fr', md: '1fr 1fr' } : '1fr',
              bgcolor: tokens.background.paper,
              borderBottom: `1px solid ${tokens.border.subtle}`,
            }}
          >
            {/* Base Attempt Header */}
            <Box
              sx={{
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRight: diffViewMode === 'split' ? `1px solid ${tokens.border.subtle}` : 'none',
              }}
            >
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  ATTEMPT A (Older / Base)
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {new Date(baseSubmission.createdAt).toLocaleString()} · {baseSubmission.language}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Copy code">
                  <IconButton
                    size="small"
                    onClick={() => handleCopyCode(baseSubmission.code, 'base')}
                    sx={{ color: tokens.text.secondary }}
                  >
                    {copiedAttempt === 'base' ? <Check size={16} color="green" /> : <Copy size={16} />}
                  </IconButton>
                </Tooltip>
                {onLoadCodeIntoWorkspace && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      onLoadCodeIntoWorkspace(baseSubmission.code, baseSubmission.language);
                      onClose();
                    }}
                    sx={{ fontSize: '0.6875rem', py: 0.25 }}
                  >
                    Reopen A in Workspace
                  </Button>
                )}
              </Box>
            </Box>

            {/* Compare Attempt Header */}
            {diffViewMode === 'split' && (
              <Box
                sx={{
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    ATTEMPT B (Newer / Compare)
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(compareSubmission.createdAt).toLocaleString()} · {compareSubmission.language}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title="Copy code">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyCode(compareSubmission.code, 'compare')}
                      sx={{ color: tokens.text.secondary }}
                    >
                      {copiedAttempt === 'compare' ? <Check size={16} color="green" /> : <Copy size={16} />}
                    </IconButton>
                  </Tooltip>
                  {onLoadCodeIntoWorkspace && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        onLoadCodeIntoWorkspace(compareSubmission.code, compareSubmission.language);
                        onClose();
                      }}
                      sx={{ fontSize: '0.6875rem', py: 0.25 }}
                    >
                      Reopen B in Workspace
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </Box>

          {/* Diff Content Viewer */}
          <Box
            sx={{
              maxHeight: '420px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.8125rem',
              bgcolor: tokens.background.default,
            }}
          >
            {diffViewMode === 'split' ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                }}
              >
                {/* Column A */}
                <Box
                  sx={{
                    borderRight: `1px solid ${tokens.border.subtle}`,
                    overflowX: 'auto',
                    py: 1,
                  }}
                >
                  {lineDiffRows.map((row) => (
                    <Box
                      key={`a_${row.lineNum}`}
                      sx={{
                        display: 'flex',
                        px: 1.5,
                        py: 0.2,
                        bgcolor:
                          row.type === 'removed' || row.type === 'modified'
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'transparent',
                        color:
                          row.type === 'removed' || row.type === 'modified'
                            ? tokens.status.error.main
                            : tokens.text.primary,
                        whiteSpace: 'pre',
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          color: tokens.text.secondary,
                          userSelect: 'none',
                          flexShrink: 0,
                          textAlign: 'right',
                          paddingRight: 8,
                        }}
                      >
                        {row.textA !== null ? row.lineNum : ''}
                      </span>
                      <span>{row.textA !== null ? row.textA : ''}</span>
                    </Box>
                  ))}
                </Box>

                {/* Column B */}
                <Box sx={{ overflowX: 'auto', py: 1 }}>
                  {lineDiffRows.map((row) => (
                    <Box
                      key={`b_${row.lineNum}`}
                      sx={{
                        display: 'flex',
                        px: 1.5,
                        py: 0.2,
                        bgcolor:
                          row.type === 'added' || row.type === 'modified'
                            ? 'rgba(34, 197, 94, 0.12)'
                            : 'transparent',
                        color:
                          row.type === 'added' || row.type === 'modified'
                            ? tokens.status.success.main
                            : tokens.text.primary,
                        whiteSpace: 'pre',
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          color: tokens.text.secondary,
                          userSelect: 'none',
                          flexShrink: 0,
                          textAlign: 'right',
                          paddingRight: 8,
                        }}
                      >
                        {row.textB !== null ? row.lineNum : ''}
                      </span>
                      <span>{row.textB !== null ? row.textB : ''}</span>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              /* Unified Diff View */
              <Box sx={{ py: 1, overflowX: 'auto' }}>
                {lineDiffRows.map((row) => {
                  if (row.type === 'modified') {
                    return (
                      <React.Fragment key={`u_mod_${row.lineNum}`}>
                        <Box
                          sx={{
                            display: 'flex',
                            px: 1.5,
                            py: 0.2,
                            bgcolor: 'rgba(239, 68, 68, 0.12)',
                            color: tokens.status.error.main,
                            whiteSpace: 'pre',
                          }}
                        >
                          <span style={{ width: 20, flexShrink: 0, color: tokens.status.error.main }}>-</span>
                          <span style={{ width: 36, color: tokens.text.secondary, userSelect: 'none' }}>
                            {row.lineNum}
                          </span>
                          <span>{row.textA}</span>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            px: 1.5,
                            py: 0.2,
                            bgcolor: 'rgba(34, 197, 94, 0.12)',
                            color: tokens.status.success.main,
                            whiteSpace: 'pre',
                          }}
                        >
                          <span style={{ width: 20, flexShrink: 0, color: tokens.status.success.main }}>+</span>
                          <span style={{ width: 36, color: tokens.text.secondary, userSelect: 'none' }}>
                            {row.lineNum}
                          </span>
                          <span>{row.textB}</span>
                        </Box>
                      </React.Fragment>
                    );
                  }

                  if (row.type === 'removed') {
                    return (
                      <Box
                        key={`u_rem_${row.lineNum}`}
                        sx={{
                          display: 'flex',
                          px: 1.5,
                          py: 0.2,
                          bgcolor: 'rgba(239, 68, 68, 0.12)',
                          color: tokens.status.error.main,
                          whiteSpace: 'pre',
                        }}
                      >
                        <span style={{ width: 20, flexShrink: 0, color: tokens.status.error.main }}>-</span>
                        <span style={{ width: 36, color: tokens.text.secondary, userSelect: 'none' }}>
                          {row.lineNum}
                        </span>
                        <span>{row.textA}</span>
                      </Box>
                    );
                  }

                  if (row.type === 'added') {
                    return (
                      <Box
                        key={`u_add_${row.lineNum}`}
                        sx={{
                          display: 'flex',
                          px: 1.5,
                          py: 0.2,
                          bgcolor: 'rgba(34, 197, 94, 0.12)',
                          color: tokens.status.success.main,
                          whiteSpace: 'pre',
                        }}
                      >
                        <span style={{ width: 20, flexShrink: 0, color: tokens.status.success.main }}>+</span>
                        <span style={{ width: 36, color: tokens.text.secondary, userSelect: 'none' }}>
                          {row.lineNum}
                        </span>
                        <span>{row.textB}</span>
                      </Box>
                    );
                  }

                  return (
                    <Box
                      key={`u_unch_${row.lineNum}`}
                      sx={{
                        display: 'flex',
                        px: 1.5,
                        py: 0.2,
                        whiteSpace: 'pre',
                        color: tokens.text.primary,
                      }}
                    >
                      <span style={{ width: 20, flexShrink: 0, color: tokens.text.secondary }}> </span>
                      <span style={{ width: 36, color: tokens.text.secondary, userSelect: 'none' }}>
                        {row.lineNum}
                      </span>
                      <span>{row.textA}</span>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          borderTop: `1px solid ${tokens.border.subtle}`,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Comparing {baseSubmission.problemSlug} submissions from {new Date(baseSubmission.createdAt).toLocaleDateString()}
        </Typography>
        <Button variant="outlined" onClick={onClose} sx={{ color: tokens.text.primary }}>
          Close Comparison
        </Button>
      </DialogActions>
    </Dialog>
  );
}
