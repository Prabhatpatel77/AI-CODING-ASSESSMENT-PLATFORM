import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TextField,
  Divider,
  Checkbox,
  Chip,
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
  History,
  AlertTriangle,
  RotateCcw,
  GitCompare,
  ExternalLink,
} from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import AttemptComparisonDialog from '../history/AttemptComparisonDialog.jsx';

/**
 * Returns user-facing label and styling variant for all execution and judge verdicts.
 */
export function getVerdictMetadata(status) {
  switch (status) {
    case 'ACCEPTED':
    case 'SUCCESS':
      return {
        variant: 'success',
        label: 'ACCEPTED',
        title: 'Accepted',
        description: 'All test fixtures evaluated and passed within required resource bounds.',
      };
    case 'WRONG_ANSWER':
      return {
        variant: 'error',
        label: 'WRONG ANSWER',
        title: 'Wrong Answer',
        description: 'Solution output did not match expected test case output.',
      };
    case 'COMPILATION_ERROR':
      return {
        variant: 'error',
        label: 'COMPILATION ERROR',
        title: 'Syntax / Compilation Error',
        description: 'Solution failed compilation or encountered fatal syntax error.',
      };
    case 'RUNTIME_ERROR':
      return {
        variant: 'error',
        label: 'RUNTIME ERROR',
        title: 'Runtime Error',
        description: 'Process threw an uncaught exception or exited with a non-zero code.',
      };
    case 'TIME_LIMIT_EXCEEDED':
      return {
        variant: 'warning',
        label: 'TIME LIMIT EXCEEDED',
        title: 'Time Limit Exceeded',
        description: 'Process exceeded maximum CPU or wall-clock execution threshold.',
      };
    case 'MEMORY_LIMIT_EXCEEDED':
      return {
        variant: 'error',
        label: 'MEMORY LIMIT EXCEEDED',
        title: 'Memory Limit Exceeded',
        description: 'Process allocated more resident memory than permitted by sandbox cgroups.',
      };
    case 'INTERNAL_ERROR':
      return {
        variant: 'error',
        label: 'INTERNAL JUDGE FAILURE',
        title: 'Internal Judge Failure',
        description: 'Execution sandbox host was unreachable, timed out, or encountered an internal error.',
      };
    case 'RUNNING':
      return {
        variant: 'neutral',
        label: 'RUNNING',
        title: 'Running Sandbox...',
        description: 'Executing source code inside remote ephemeral container...',
      };
    case 'PENDING':
      return {
        variant: 'neutral',
        label: 'QUEUED',
        title: 'In Judge Queue',
        description: 'Submission has been scheduled and is awaiting an available sandbox worker.',
      };
    case 'UNCONFIGURED':
      return {
        variant: 'warning',
        label: 'JUDGE UNCONFIGURED',
        title: 'Sandbox Unconfigured',
        description: 'Remote code execution service is not configured. Untrusted code is protected against local execution.',
      };
    default:
      return {
        variant: 'neutral',
        label: status || 'UNKNOWN',
        title: status || 'Execution Record',
        description: '',
      };
  }
}

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
  customInput = '',
  onCustomInputChange = () => {},
  useCustomInput = false,
  onToggleCustomInput = () => {},
  submissions = [],
  onSelectSubmission = () => {},
  onRetry = null,
}) {
  const { tokens } = useAppTheme();
  const navigate = useNavigate();

  // Comparison selection state in workspace
  const [compareSelected, setCompareSelected] = useState([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  const codeStats = {
    lines: (code || '').split('\n').length,
    chars: (code || '').length,
  };

  const currentVerdict = executionResult?.status ? getVerdictMetadata(executionResult.status) : null;

  // Toggle selection for comparison in workspace
  const handleToggleCompare = (sub) => {
    setCompareSelected((prev) => {
      const exists = prev.some((item) => item.id === sub.id);
      if (exists) {
        return prev.filter((item) => item.id !== sub.id);
      }
      if (prev.length >= 2) {
        return [prev[1], sub];
      }
      return [...prev, sub];
    });
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
        height: open ? 310 : 40,
        minHeight: open ? 260 : 40,
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
          flexShrink: 0,
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
          <Tab label={`Test Cases (${(problem?.visibleTestCases || []).length})`} />
          <Tab label="Submission Verdict" />
          <Tab label={`Submissions (${submissions.length})`} />
        </Tabs>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isExecuting ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={12} sx={{ color: tokens.primary.main }} />
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: tokens.primary.main }}>
                {lastAction === 'submit' ? 'EVALUATING...' : 'EXECUTING...'}
              </span>
            </Box>
          ) : currentVerdict ? (
            <StatusBadge
              variant={currentVerdict.variant}
              size="small"
              label={currentVerdict.label}
            />
          ) : null}

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
          {/* TAB 0: Execution Console */}
          {activeTab === 0 && (
            <Stack spacing={1.5}>
              {isExecuting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                  <CircularProgress size={18} sx={{ color: tokens.primary.main }} />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {lastAction === 'submit' ? 'Dispatching to Evaluation Suite' : 'Executing in Isolated Sandbox'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Container namespaces active. No untrusted code executes on the application web server.
                    </Typography>
                  </Box>
                </Box>
              ) : executionResult ? (
                <>
                  {/* Verdict Banner */}
                  {executionResult.status === 'UNCONFIGURED' ? (
                    <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
                      <strong>Remote Judge Sandbox Unconfigured:</strong> {executionResult.error?.message}
                      {executionResult.error?.configurationGuide && (
                        <Box sx={{ mt: 1, fontFamily: 'monospace', fontSize: '0.6875rem' }}>
                          <div>Required Environment Variables in .env:</div>
                          {executionResult.error.configurationGuide.requiredEnvVars.map((v, i) => (
                            <div key={i} style={{ color: tokens.text.secondary }}>{v}</div>
                          ))}
                        </Box>
                      )}
                    </Alert>
                  ) : currentVerdict?.variant === 'success' ? (
                    <Alert severity="success" sx={{ fontSize: '0.75rem' }}>
                      <strong>{currentVerdict.title}:</strong> {currentVerdict.description} ({executionResult.durationMs}ms via {executionResult.provider || 'judge'})
                    </Alert>
                  ) : (
                    <Alert severity={currentVerdict?.variant === 'warning' ? 'warning' : 'error'} sx={{ fontSize: '0.75rem' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <strong>{currentVerdict?.title || executionResult.status}:</strong>{' '}
                          {executionResult.error?.message || currentVerdict?.description || 'Execution terminated with errors.'}
                        </div>
                        {onRetry && (
                          <Button size="small" variant="outlined" onClick={onRetry} startIcon={<RotateCcw size={12} />}>
                            Retry
                          </Button>
                        )}
                      </Box>
                    </Alert>
                  )}

                  {/* Standard Output & Console Logs */}
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
                    <div style={{ color: tokens.primary.main, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>[EXECUTION RECORD] ID: {executionResult.executionId || 'local-dispatch'}</span>
                      <span>{executionResult.durationMs || 0}ms · {executionResult.memoryUsedKb ? `${executionResult.memoryUsedKb}KB` : 'isolated'}</span>
                    </div>
                    <div>Provider: {executionResult.provider || 'ephemeral-sandbox'}</div>
                    <div>Runtime: {executionResult.language || selectedLanguage}</div>

                    {executionResult.stdout ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ color: tokens.status.success.main, fontWeight: 700 }}>STDOUT:</div>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#f0f6fc' }}>{executionResult.stdout}</pre>
                      </div>
                    ) : null}

                    {executionResult.stderr ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ color: tokens.status.error.main, fontWeight: 700 }}>STDERR:</div>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#ff7b72' }}>{executionResult.stderr}</pre>
                      </div>
                    ) : null}

                    {executionResult.compileOutput ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ color: tokens.status.warning.main, fontWeight: 700 }}>COMPILATION LOGS:</div>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#d29922' }}>{executionResult.compileOutput}</pre>
                      </div>
                    ) : null}
                  </Box>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Click "Run Tests" in the action bar above to execute sample test cases or custom input in the isolated sandbox.
                </Typography>
              )}
            </Stack>
          )}

          {/* TAB 1: Test Cases (Sample Fixtures + Custom Input) */}
          {activeTab === 1 && (
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    size="small"
                    variant={!useCustomInput ? 'contained' : 'outlined'}
                    onClick={() => onToggleCustomInput(false)}
                    sx={{ fontSize: '0.6875rem', py: 0.25 }}
                  >
                    Permitted Sample Fixtures ({(problem?.visibleTestCases || []).length})
                  </Button>
                  <Button
                    size="small"
                    variant={useCustomInput ? 'contained' : 'outlined'}
                    onClick={() => onToggleCustomInput(true)}
                    sx={{ fontSize: '0.6875rem', py: 0.25 }}
                  >
                    Custom Test Input
                  </Button>
                </Box>
                <span style={{ fontSize: '0.6875rem', color: tokens.text.secondary }}>
                  {problem?.hiddenTestCasesCount || 0} secure hidden test cases reserved for Submit
                </span>
              </Box>

              {useCustomInput ? (
                /* Custom Test Input Editor */
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: tokens.background.paper, border: `1px solid ${tokens.border.subtle}` }}>
                  <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                    Custom STDIN / Input Arguments:
                  </Typography>
                  <TextField
                    multiline
                    rows={3}
                    fullWidth
                    size="small"
                    value={customInput}
                    onChange={(e) => onCustomInputChange(e.target.value)}
                    placeholder='Enter custom input string or JSON, e.g. {"nums": [3, 2, 4], "target": 6}'
                    sx={{
                      '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.75rem' },
                      mb: 1,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Click "Run Tests" to dispatch your solution with this custom input to the sandbox container.
                  </Typography>
                </Box>
              ) : (
                /* Permitted Sample Fixtures */
                (problem?.visibleTestCases || []).map((tc, idx) => {
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
                })
              )}
            </Stack>
          )}

          {/* TAB 2: Submission Verdict (Formal Submission) */}
          {activeTab === 2 && (
            <Stack spacing={1.5}>
              {isExecuting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                  <CircularProgress size={18} sx={{ color: tokens.primary.main }} />
                  <Typography variant="body2" color="text.secondary">
                    Running proctored evaluation across all visible and hidden test fixtures...
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
                  ) : executionResult.status === 'ACCEPTED' ? (
                    <Alert severity="success" sx={{ fontSize: '0.75rem' }}>
                      <strong>Submission Accepted!</strong> Passed {executionResult.passedTests} / {executionResult.totalTests} test cases in {executionResult.durationMs}ms. Score: 100%.
                    </Alert>
                  ) : (
                    <Alert severity="error" sx={{ fontSize: '0.75rem' }}>
                      <strong>Submission Verdict: {executionResult.status}</strong> — Passed {executionResult.passedTests} / {executionResult.totalTests} test cases.
                    </Alert>
                  )}

                  {/* Evaluation Test Suite Breakdown */}
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
                  Click "Submit Solution" to trigger proctored evaluation across all visible and hidden test fixtures and record a formal candidate submission.
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
                  Evaluation Specification
                </Typography>
                <Stack spacing={0.5} sx={{ color: tokens.text.secondary }}>
                  <div>· Visible Test Fixtures: {(problem?.visibleTestCases || []).length} cases</div>
                  <div>· Hidden Evaluation Suite: {problem?.hiddenTestCasesCount || 0} cases</div>
                  <div>· Target Runtime: {selectedLanguage}</div>
                  <div>· Anti-Cheat: Duplicate submissions within 5s are automatically debounced</div>
                </Stack>
              </Box>
            </Stack>
          )}

          {/* TAB 3: Submissions History */}
          {activeTab === 3 && (
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Past Submissions for {problem?.title}
                  </Typography>
                  <span style={{ fontSize: '0.6875rem', color: tokens.text.secondary, marginLeft: 8 }}>
                    {submissions.length} submission{submissions.length === 1 ? '' : 's'} recorded
                  </span>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {submissions.length >= 2 && (
                    <Button
                      size="small"
                      variant={compareSelected.length === 2 ? 'contained' : 'outlined'}
                      startIcon={<GitCompare size={14} />}
                      disabled={compareSelected.length !== 2}
                      onClick={() => setCompareDialogOpen(true)}
                      sx={{ fontSize: '0.6875rem', py: 0.25 }}
                    >
                      Compare Selected ({compareSelected.length}/2)
                    </Button>
                  )}
                  {problem?.slug && (
                    <Button
                      size="small"
                      variant="text"
                      endIcon={<ExternalLink size={12} />}
                      onClick={() => navigate(`/submissions?problemSlug=${problem.slug}`)}
                      sx={{ fontSize: '0.6875rem', py: 0.25 }}
                    >
                      All Submissions
                    </Button>
                  )}
                </Box>
              </Box>

              {compareSelected.length === 1 && (
                <Alert severity="info" sx={{ py: 0.5, fontSize: '0.6875rem' }}>
                  Select one more attempt using the checkbox to compare code diff and metrics.
                </Alert>
              )}

              {submissions.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center', bgcolor: tokens.background.paper, borderRadius: 1, border: `1px solid ${tokens.border.subtle}` }}>
                  <Typography variant="body2" color="text.secondary">
                    No submissions recorded yet for this challenge.
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Click "Submit Solution" to run your solution against the full evaluation suite.
                  </Typography>
                </Box>
              ) : (
                submissions.map((sub, idx) => {
                  const meta = getVerdictMetadata(sub.status);
                  const isChecked = compareSelected.some((item) => item.id === sub.id);
                  return (
                    <Box
                      key={sub.id || idx}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: isChecked ? 'rgba(59, 130, 246, 0.08)' : tokens.background.paper,
                        border: `1px solid ${isChecked ? tokens.primary.main : tokens.border.subtle}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox
                          size="small"
                          checked={isChecked}
                          onChange={() => handleToggleCompare(sub)}
                          sx={{ p: 0.25 }}
                        />
                        <StatusBadge variant={meta.variant} size="small" label={meta.label} />
                        <Typography variant="body2" fontWeight={600}>
                          Score: {sub.score}% ({sub.passedTests}/{sub.totalTests} tests)
                        </Typography>
                        <span style={{ fontSize: '0.6875rem', color: tokens.text.secondary }}>
                          · {sub.language} · {sub.durationMs}ms
                        </span>
                        {sub.assessmentTitle && (
                          <Chip
                            size="small"
                            label={sub.assessmentTitle}
                            sx={{ height: 20, fontSize: '0.625rem', bgcolor: tokens.primary.subtle, color: tokens.primary.main }}
                          />
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '0.6875rem', color: tokens.text.secondary }}>
                          {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onSelectSubmission(sub)}
                          sx={{ fontSize: '0.6875rem', py: 0.25 }}
                        >
                          Load Code
                        </Button>
                      </Box>
                    </Box>
                  );
                })
              )}

              {/* Compare Dialog */}
              {compareSelected.length === 2 && (
                <AttemptComparisonDialog
                  open={compareDialogOpen}
                  onClose={() => setCompareDialogOpen(false)}
                  baseSubmission={compareSelected[0]}
                  compareSubmission={compareSelected[1]}
                  onLoadCodeIntoWorkspace={(loadedCode, loadedLang) => {
                    onSelectSubmission({ code: loadedCode, language: loadedLang });
                    setCompareDialogOpen(false);
                  }}
                />
              )}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
