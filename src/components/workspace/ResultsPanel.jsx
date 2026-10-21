import React from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ChevronDown,
  ChevronUp,
  Terminal,
  Play,
  Send,
  CheckCircle2,
  Lock,
  Layers,
  X,
  Server,
  Cpu,
} from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function ResultsPanel({
  open,
  onToggle,
  activeTab,
  onTabChange,
  problem,
  code,
  selectedLanguage,
  lastAction, // 'run' | 'submit' | null
  executionResult = null,
  isExecuting = false,
}) {
  const { tokens } = useAppTheme();

  const codeStats = {
    lines: (code || '').split('\n').length,
    chars: (code || '').length,
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'WRONG_ANSWER':
      case 'TIME_LIMIT_EXCEEDED':
      case 'MEMORY_LIMIT_EXCEEDED':
      case 'COMPILATION_ERROR':
      case 'RUNTIME_ERROR':
        return 'error';
      case 'UNCONFIGURED':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <Box
      sx={{
        borderTop: `1px solid ${tokens.border.subtle}`,
        bgcolor: tokens.background.default,
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.2s ease',
        height: open ? 260 : 40,
        minHeight: open ? 220 : 40,
        overflow: 'hidden',
      }}
    >
      {/* Top Header / Tab Bar */}
      <Box
        sx={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          borderBottom: open ? `1px solid ${tokens.border.subtle}` : 'none',
          bgcolor: tokens.background.paper,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => {
            onTabChange(val);
            if (!open) onToggle();
          }}
          sx={{
            minHeight: 38,
            '& .MuiTab-root': {
              minHeight: 38,
              fontSize: '0.75rem',
              py: 0,
              textTransform: 'none',
              fontWeight: 600,
            },
          }}
        >
          <Tab label="Execution Console" />
          <Tab label={`Visible Test Cases (${(problem?.visibleTestCases || []).length})`} />
          <Tab label="Submission Evaluation" />
        </Tabs>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {executionResult?.status && (
            <StatusBadge
              variant={getStatusBadgeVariant(executionResult.status)}
              size="small"
              label={`STATUS: ${executionResult.status}`}
            />
          )}
          <span style={{ fontSize: '0.6875rem', color: tokens.text.secondary }}>
            {codeStats.lines} lines · {codeStats.chars} chars
          </span>
          <IconButton size="small" onClick={onToggle} sx={{ p: 0.5, color: tokens.text.secondary }}>
            {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </IconButton>
        </Box>
      </Box>

      {/* Expanded Content Viewport */}
      {open && (
        <Box sx={{ p: 2, flex: 1, overflowY: 'auto', bgcolor: tokens.background.default }}>
          {activeTab === 0 && (
            /* Execution Console Tab */
            <Stack spacing={1.5}>
              {isExecuting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                  <CircularProgress size={18} sx={{ color: tokens.primary.main }} />
                  <Typography variant="body2" color="text.secondary">
                    Dispatching source code to remote isolated execution engine...
                  </Typography>
                </Box>
              ) : executionResult ? (
                <>
                  {executionResult.status === 'UNCONFIGURED' ? (
                    <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
                      <strong>Remote Judge Unconfigured:</strong> {executionResult.error?.message}
                      {executionResult.error?.configurationGuide && (
                        <Box sx={{ mt: 1, fontFamily: 'monospace', fontSize: '0.6875rem' }}>
                          <div>Required Environment Variables:</div>
                          {executionResult.error.configurationGuide.requiredEnvVars.map((v, i) => (
                            <div key={i} style={{ color: tokens.text.secondary }}>{v}</div>
                          ))}
                        </Box>
                      )}
                    </Alert>
                  ) : executionResult.status === 'SUCCESS' ? (
                    <Alert severity="success" sx={{ fontSize: '0.75rem' }}>
                      Execution completed successfully in {executionResult.durationMs}ms via {executionResult.provider}.
                    </Alert>
                  ) : (
                    <Alert severity="error" sx={{ fontSize: '0.75rem' }}>
                      Execution terminated with status: {executionResult.status} ({executionResult.error?.message || 'Process error'})
                    </Alert>
                  )}

                  {/* Standard Output & Error Display */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: '#0d1117',
                      color: '#e6edf3',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ color: tokens.primary.main, marginBottom: 4 }}>
                      [EXECUTION RECORD] ID: {executionResult.executionId}
                    </div>
                    <div>Provider: {executionResult.provider}</div>
                    <div>Runtime: {executionResult.language}</div>
                    <div>Duration: {executionResult.durationMs}ms</div>
                    {executionResult.stdout && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ color: tokens.status.success.main }}>STDOUT:</div>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{executionResult.stdout}</pre>
                      </div>
                    )}
                    {executionResult.stderr && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ color: tokens.status.error.main }}>STDERR:</div>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{executionResult.stderr}</pre>
                      </div>
                    )}
                  </Box>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Click "Run Tests" in the action bar above to dispatch your solution to the remote execution engine.
                </Typography>
              )}
            </Stack>
          )}

          {activeTab === 1 && (
            /* Test Cases Tab */
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  Visible Test Fixtures
                </Typography>
                <span style={{ fontSize: '0.6875rem', color: tokens.text.secondary }}>
                  {problem?.hiddenTestCasesCount || 0} secure hidden test cases will run on final evaluation
                </span>
              </Box>

              {(problem?.visibleTestCases || []).map((tc, idx) => (
                <Box
                  key={tc.id || idx}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: tokens.background.paper,
                    border: `1px solid ${tokens.border.subtle}`,
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                  }}
                >
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Test Case {idx + 1}
                  </Typography>
                  <div><strong>Input:</strong> {tc.inputStr || JSON.stringify(tc.input)}</div>
                  <div><strong>Expected Output:</strong> {JSON.stringify(tc.expectedOutput)}</div>
                  {tc.explanation && (
                    <div style={{ color: tokens.text.secondary, marginTop: 2 }}>
                      {tc.explanation}
                    </div>
                  )}
                </Box>
              ))}
            </Stack>
          )}

          {activeTab === 2 && (
            /* Submission Evaluation Tab */
            <Stack spacing={1.5}>
              {lastAction === 'submit' ? (
                <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
                  Evaluation runner is pending backend integration. No fake score or mock execution result has been created.
                  Your solution for <strong>{problem?.title}</strong> is drafted and preserved.
                </Alert>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Click "Submit Solution" to trigger proctored evaluation across all visible and hidden test fixtures once the grader is connected.
                </Typography>
              )}

              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: tokens.background.paper,
                  border: `1px solid ${tokens.border.subtle}`,
                  fontSize: '0.75rem',
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Evaluation Suite Details
                </Typography>
                <Stack spacing={0.5} sx={{ color: tokens.text.secondary }}>
                  <div>· Visible Test Fixtures: {(problem?.visibleTestCases || []).length} cases</div>
                  <div>· Hidden Evaluation Suite: {problem?.hiddenTestCasesCount || 0} cases</div>
                  <div>· Target Runtime: {selectedLanguage}</div>
                  <div>· Memory &amp; Execution Limits: 2000ms / 128MB</div>
                </Stack>
              </Box>
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
