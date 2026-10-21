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
  XCircle,
  Clock,
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

  // Find individual test result by index if testResults exists
  const getTestResult = (index) => {
    if (!executionResult?.testResults) return null;
    return executionResult.testResults.find((r) => r.testCaseNumber === index + 1) || executionResult.testResults[index] || null;
  };

  return (
    <Box
      sx={{
        borderTop: `1px solid ${tokens.border.subtle}`,
        bgcolor: tokens.background.default,
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.2s ease',
        height: open ? 290 : 40,
        minHeight: open ? 240 : 40,
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
                          <div>Required Server Environment Variables:</div>
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
                      Execution terminated with status: {executionResult.status} ({executionResult.error?.message || 'Check stdout/stderr below'})
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
                      [EXECUTION RECORD] ID: {executionResult.executionId || 'local-dispatch'}
                    </div>
                    <div>Provider: {executionResult.provider || 'unknown'}</div>
                    <div>Runtime: {executionResult.language || selectedLanguage}</div>
                    <div>Duration: {executionResult.durationMs || 0}ms</div>
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
                    {executionResult.compileOutput && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ color: tokens.status.warning.main }}>COMPILATION LOG:</div>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{executionResult.compileOutput}</pre>
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

              {(problem?.visibleTestCases || []).map((tc, idx) => {
                const tr = getTestResult(idx);
                return (
                  <Box
                    key={tc.id || idx}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: tokens.background.paper,
                      border: `1px solid ${tr ? (tr.passed ? tokens.status.success.border : tokens.status.error.border) : tokens.border.subtle}`,
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        Test Case {idx + 1}
                      </Typography>
                      {tr && (
                        <StatusBadge
                          variant={tr.passed ? 'success' : 'error'}
                          size="small"
                          label={tr.passed ? 'PASSED' : tr.status || 'FAILED'}
                        />
                      )}
                    </Box>
                    <div><strong>Input:</strong> {tc.inputStr || JSON.stringify(tc.input)}</div>
                    <div><strong>Expected Output:</strong> {JSON.stringify(tc.expectedOutput)}</div>
                    {tr?.actualOutput !== undefined && (
                      <div style={{ color: tr.passed ? tokens.status.success.main : tokens.status.error.main, marginTop: 4 }}>
                        <strong>Actual Output:</strong> {JSON.stringify(tr.actualOutput)}
                      </div>
                    )}
                    {tc.explanation && (
                      <div style={{ color: tokens.text.secondary, marginTop: 2 }}>
                        {tc.explanation}
                      </div>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}

          {activeTab === 2 && (
            /* Submission Evaluation Tab */
            <Stack spacing={1.5}>
              {isExecuting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                  <CircularProgress size={18} sx={{ color: tokens.primary.main }} />
                  <Typography variant="body2" color="text.secondary">
                    Evaluating solution across all visible and hidden test fixtures...
                  </Typography>
                </Box>
              ) : executionResult && lastAction === 'submit' ? (
                <>
                  {executionResult.status === 'UNCONFIGURED' ? (
                    <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
                      <strong>Isolated Execution Provider Unconfigured:</strong> {executionResult.error?.message}
                      {executionResult.error?.configurationGuide && (
                        <Box sx={{ mt: 1, fontFamily: 'monospace', fontSize: '0.6875rem' }}>
                          <div>Configure in .env on server:</div>
                          {executionResult.error.configurationGuide.requiredEnvVars.map((v, i) => (
                            <div key={i} style={{ color: tokens.text.secondary }}>{v}</div>
                          ))}
                        </Box>
                      )}
                    </Alert>
                  ) : executionResult.allPassed ? (
                    <Alert severity="success" sx={{ fontSize: '0.75rem' }}>
                      <strong>All Tests Passed! (Accepted):</strong> Passed {executionResult.passedTests} / {executionResult.totalTests} total test cases in {executionResult.durationMs}ms.
                    </Alert>
                  ) : (
                    <Alert severity="error" sx={{ fontSize: '0.75rem' }}>
                      <strong>Submission Status: {executionResult.status}</strong> — Passed {executionResult.passedTests} / {executionResult.totalTests} test cases.
                    </Alert>
                  )}

                  {/* Test fixtures breakdown */}
                  {Array.isArray(executionResult.testResults) && executionResult.testResults.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {executionResult.testResults.map((tr) => (
                        <Box
                          key={tr.testCaseId || tr.testCaseNumber}
                          sx={{
                            p: 1.5,
                            borderRadius: 1,
                            bgcolor: tokens.background.paper,
                            border: `1px solid ${tr.passed ? tokens.status.success.border : tokens.status.error.border}`,
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {tr.passed ? (
                              <CheckCircle2 size={16} color={tokens.status.success.main} />
                            ) : (
                              <XCircle size={16} color={tokens.status.error.main} />
                            )}
                            <span>
                              Test Case #{tr.testCaseNumber} {tr.isHidden ? '(Secure Hidden Test Case)' : '(Visible Test Case)'}
                            </span>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {tr.durationMs !== undefined && (
                              <span style={{ color: tokens.text.secondary, fontSize: '0.6875rem' }}>
                                {tr.durationMs}ms
                              </span>
                            )}
                            <StatusBadge
                              variant={tr.passed ? 'success' : 'error'}
                              size="small"
                              label={tr.passed ? 'PASSED' : tr.status || 'FAILED'}
                            />
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Click "Submit Solution" to trigger proctored evaluation across all visible and hidden test fixtures.
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
                  Evaluation Suite Specification
                </Typography>
                <Stack spacing={0.5} sx={{ color: tokens.text.secondary }}>
                  <div>· Visible Test Fixtures: {(problem?.visibleTestCases || []).length} cases</div>
                  <div>· Hidden Evaluation Suite: {problem?.hiddenTestCasesCount || 0} cases</div>
                  <div>· Target Runtime: {selectedLanguage}</div>
                  <div>· Sandboxing: Isolated container with no host access or network egress</div>
                </Stack>
              </Box>
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
