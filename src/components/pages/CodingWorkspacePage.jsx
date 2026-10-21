import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  Stack,
  Breadcrumbs,
  Link as MuiLink,
  CircularProgress,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  ArrowLeft,
  Play,
  Send,
  RotateCcw,
  Settings,
  Sparkles,
  FileCode,
  CheckCircle2,
  Lock,
  GripVertical,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import EditorPreferencesDialog from '../workspace/EditorPreferencesDialog.jsx';
import ResultsPanel from '../workspace/ResultsPanel.jsx';
import AICoachPanel from '../workspace/AICoachPanel.jsx';

export default function CodingWorkspacePage() {
  const { slug } = useParams();
  const { tokens, mode } = useAppTheme();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Problem data
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Language & Code state
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Editor preferences
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('devassess_editor_prefs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      fontSize: 14,
      tabSize: 2,
      minimap: false,
      wordWrap: true,
    };
  });
  const [prefsDialogOpen, setPrefsDialogOpen] = useState(false);

  // Reset confirmation dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Left panel tabs (0: Description, 1: Visible Tests, 2: AI Coach)
  const [leftTab, setLeftTab] = useState(0);

  // Mobile navigation tabs (0: Problem, 1: Editor, 2: Tests, 3: AI Coach)
  const [mobileTab, setMobileTab] = useState(1);

  // Results panel state
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsTab, setResultsTab] = useState(0); // 0: Console, 1: Tests, 2: Submission
  const [lastAction, setLastAction] = useState(null); // 'run' | 'submit' | null
  const [executionResult, setExecutionResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Desktop resizable divider state
  const [leftWidthPercent, setLeftWidthPercent] = useState(45);
  const isDraggingRef = useRef(false);

  // Save editor preferences
  const handleUpdatePreferences = (newPrefs) => {
    setPreferences(newPrefs);
    try {
      localStorage.setItem('devassess_editor_prefs', JSON.stringify(newPrefs));
    } catch {}
  };

  // Draft storage key generator
  const getDraftKey = useCallback(
    (lang) => `devassess_draft_${slug}_${lang}`,
    [slug]
  );

  // Fetch problem details from real API
  useEffect(() => {
    const fetchProblem = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/problems/${slug}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Problem not found or inaccessible.');
        }

        setProblem(data.problem);

        // Ensure selected language is genuinely supported
        const supported = data.problem.supportedLanguages || ['javascript', 'python'];
        const initialLang = supported.includes('javascript') ? 'javascript' : supported[0];
        setSelectedLanguage(initialLang);

        // Load preserved draft or starter code
        const draftKey = `devassess_draft_${slug}_${initialLang}`;
        const savedDraft = sessionStorage.getItem(draftKey);
        const starter = data.problem.starterCode?.[initialLang] || '';

        if (savedDraft !== null) {
          setCode(savedDraft);
          setIsDirty(savedDraft !== starter);
        } else {
          setCode(starter);
          setIsDirty(false);
        }
      } catch (err) {
        setError(err.message || 'Failed to load challenge.');
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [slug, authFetch]);

  // Handle language switch
  const handleLanguageChange = (newLang) => {
    if (!problem) return;
    setSelectedLanguage(newLang);

    // Load preserved draft for new language, or fallback to starter code
    const draftKey = getDraftKey(newLang);
    const savedDraft = sessionStorage.getItem(draftKey);
    const starter = problem.starterCode?.[newLang] || '';

    if (savedDraft !== null) {
      setCode(savedDraft);
      setIsDirty(savedDraft !== starter);
    } else {
      setCode(starter);
      setIsDirty(false);
    }
  };

  // Handle editor code change
  const handleEditorChange = (value) => {
    const newCode = value || '';
    setCode(newCode);

    if (problem) {
      sessionStorage.setItem(getDraftKey(selectedLanguage), newCode);
      const starter = problem.starterCode?.[selectedLanguage] || '';
      setIsDirty(newCode !== starter);
    }
  };

  // Reset code to starter template
  const handleConfirmReset = () => {
    if (!problem) return;
    const starter = problem.starterCode?.[selectedLanguage] || '';
    setCode(starter);
    setIsDirty(false);
    sessionStorage.removeItem(getDraftKey(selectedLanguage));
    setResetDialogOpen(false);
  };

  // Handle Run action (executes against visible test cases via isolated sandbox)
  const handleRunTests = async () => {
    setLastAction('run');
    setResultsTab(0); // Console / visible tests output tab
    setResultsOpen(true);
    setIsExecuting(true);

    try {
      const endpoint = problem ? `/api/problems/${problem.slug}/run` : '/api/execution/run';
      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: selectedLanguage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setExecutionResult(data.execution);
      } else {
        setExecutionResult({
          status: 'INTERNAL_ERROR',
          error: { message: data.message || 'Execution request failed' },
          provider: 'unknown',
          durationMs: 0,
        });
      }
    } catch (err) {
      setExecutionResult({
        status: 'INTERNAL_ERROR',
        error: { message: err.message },
        provider: 'unknown',
        durationMs: 0,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle Submit action (evaluates against complete test suite via isolated sandbox)
  const handleDoneSubmit = async () => {
    setLastAction('submit');
    setResultsTab(2); // Submission evaluation tab
    setResultsOpen(true);
    setIsExecuting(true);

    try {
      const endpoint = problem ? `/api/problems/${problem.slug}/submit` : '/api/execution/run';
      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: selectedLanguage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setExecutionResult(data.evaluation || data.execution);
      } else {
        setExecutionResult({
          status: 'INTERNAL_ERROR',
          error: { message: data.message || 'Submission request failed' },
          provider: 'unknown',
          durationMs: 0,
        });
      }
    } catch (err) {
      setExecutionResult({
        status: 'INTERNAL_ERROR',
        error: { message: err.message },
        provider: 'unknown',
        durationMs: 0,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Desktop splitter drag handlers
  const handleMouseDown = () => {
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const windowWidth = window.innerWidth;
      const newPercent = (e.clientX / windowWidth) * 100;
      if (newPercent >= 28 && newPercent <= 65) {
        setLeftWidthPercent(newPercent);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <CircularProgress size={32} sx={{ color: tokens.primary.main }} />
        <Typography variant="body2" color="text.secondary">
          Loading challenge workspace...
        </Typography>
      </Box>
    );
  }

  if (error || !problem) {
    return (
      <Box sx={{ maxWidth: 640, mx: 'auto', py: 6, px: 2 }}>
        <Card sx={{ border: `1px solid ${tokens.status.error.border}`, bgcolor: tokens.background.paper }}>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
              Problem Unavailable
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {error || 'The requested challenge does not exist or has not been published.'}
            </Typography>
            <Button
              component={Link}
              to="/practice"
              variant="contained"
              size="small"
              startIcon={<ArrowLeft size={14} />}
            >
              Back to Practice Library
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  const genuinelySupportedLanguages = problem.supportedLanguages || ['javascript', 'python'];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', gap: 1.5, overflow: 'hidden' }}>
      {/* Top Workspace Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, flexShrink: 0 }}>
        <Box>
          <Breadcrumbs aria-label="breadcrumb" sx={{ fontSize: '0.75rem', color: tokens.text.secondary, mb: 0.5 }}>
            <MuiLink component={Link} to="/" underline="hover" sx={{ color: tokens.text.secondary }}>
              Home
            </MuiLink>
            <MuiLink component={Link} to="/practice" underline="hover" sx={{ color: tokens.text.secondary }}>
              Practice
            </MuiLink>
            <Typography sx={{ fontSize: '0.75rem', color: tokens.text.primary, fontWeight: 600 }}>
              {problem.title}
            </Typography>
          </Breadcrumbs>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
              {problem.title}
            </Typography>
            <StatusBadge variant={getDifficultyVariant(problem.difficulty)} size="small" label={problem.difficulty} />
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {(problem.topics || []).map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: '0.6875rem',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    backgroundColor: tokens.background.subtle,
                    color: tokens.text.secondary,
                    border: `1px solid ${tokens.border.subtle}`,
                  }}
                >
                  {t}
                </span>
              ))}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isDirty && (
            <span style={{ fontSize: '0.6875rem', color: tokens.status.warning.main, fontWeight: 600 }}>
              ● Draft preserved in session
            </span>
          )}
          <Button
            component={Link}
            to="/practice"
            variant="outlined"
            size="small"
            startIcon={<ArrowLeft size={14} />}
          >
            Practice Library
          </Button>
        </Box>
      </Box>

      {/* Mobile Responsive Mode Switcher */}
      {isMobile && (
        <Tabs
          value={mobileTab}
          onChange={(_, val) => setMobileTab(val)}
          variant="fullWidth"
          sx={{
            minHeight: 38,
            bgcolor: tokens.background.paper,
            borderRadius: 1,
            border: `1px solid ${tokens.border.subtle}`,
            '& .MuiTab-root': { minHeight: 38, fontSize: '0.75rem', py: 0, textTransform: 'none', fontWeight: 600 },
          }}
        >
          <Tab label="Problem" />
          <Tab label="Code Editor" />
          <Tab label="Test Cases" />
          <Tab label="AI Coach" />
        </Tabs>
      )}

      {/* Main Workspace Frame (Desktop Split or Mobile Tabs) */}
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 2,
        }}
      >
        {/* Left Panel: Problem, Test Cases & AI Coach */}
        {(!isMobile || mobileTab === 0 || mobileTab === 2 || mobileTab === 3) && (
          <Card
            sx={{
              width: isMobile ? '100%' : `${leftWidthPercent}%`,
              border: `1px solid ${tokens.border.subtle}`,
              bgcolor: tokens.background.paper,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* Desktop Tabs Header */}
            {!isMobile && (
              <Tabs
                value={leftTab}
                onChange={(_, val) => setLeftTab(val)}
                sx={{
                  borderBottom: `1px solid ${tokens.border.subtle}`,
                  minHeight: 40,
                  bgcolor: tokens.background.default,
                  '& .MuiTab-root': { minHeight: 40, fontSize: '0.75rem', py: 0, textTransform: 'none', fontWeight: 600 },
                }}
              >
                <Tab label="Description" />
                <Tab label={`Visible Test Cases (${(problem.visibleTestCases || []).length})`} />
                <Tab label="AI Mentor" icon={<Sparkles size={14} />} iconPosition="start" />
              </Tabs>
            )}

            {/* Tab Views */}
            <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
              {(isMobile ? mobileTab === 0 : leftTab === 0) && (
                /* Description Tab */
                <Stack spacing={3}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7, color: tokens.text.primary }}>
                    {problem.description}
                  </Typography>

                  {/* Examples */}
                  {problem.examples && problem.examples.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                        Examples
                      </Typography>
                      <Stack spacing={2}>
                        {problem.examples.map((ex, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              p: 2,
                              borderRadius: 1.5,
                              bgcolor: tokens.background.default,
                              border: `1px solid ${tokens.border.subtle}`,
                              fontSize: '0.8125rem',
                              fontFamily: 'monospace',
                            }}
                          >
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              Example {idx + 1}
                            </Typography>
                            <div><strong>Input:</strong> {ex.input}</div>
                            <div><strong>Output:</strong> {ex.output}</div>
                            {ex.explanation && (
                              <div style={{ marginTop: 4, color: tokens.text.secondary }}>
                                <strong>Explanation:</strong> {ex.explanation}
                              </div>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Constraints */}
                  {problem.constraints && problem.constraints.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                        Constraints
                      </Typography>
                      <Stack spacing={0.5} component="ul" sx={{ pl: 2, m: 0, color: tokens.text.secondary, fontSize: '0.8125rem' }}>
                        {problem.constraints.map((c, idx) => (
                          <li key={idx} style={{ fontFamily: 'monospace' }}>
                            {c}
                          </li>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              )}

              {(isMobile ? mobileTab === 2 : leftTab === 1) && (
                /* Visible Test Cases Tab */
                <Stack spacing={2}>
                  <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: tokens.background.default, border: `1px solid ${tokens.border.subtle}`, fontSize: '0.75rem' }}>
                    Showing visible test fixtures. When final evaluation is triggered, your solution runs against visible tests plus {problem.hiddenTestCasesCount || 0} secure hidden test cases.
                  </Box>

                  {(problem.visibleTestCases || []).map((tc, idx) => (
                    <Box
                      key={tc.id || idx}
                      sx={{
                        p: 2,
                        borderRadius: 1.5,
                        bgcolor: tokens.background.default,
                        border: `1px solid ${tokens.border.subtle}`,
                        fontSize: '0.8125rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Test Case {idx + 1}
                      </Typography>
                      <div><strong>Input:</strong> {tc.inputStr || JSON.stringify(tc.input)}</div>
                      <div><strong>Expected Output:</strong> {JSON.stringify(tc.expectedOutput)}</div>
                      {tc.explanation && (
                        <div style={{ marginTop: 4, color: tokens.text.secondary, fontSize: '0.75rem' }}>
                          {tc.explanation}
                        </div>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}

              {(isMobile ? mobileTab === 3 : leftTab === 2) && (
                /* AI Mentor Panel */
                <AICoachPanel problem={problem} />
              )}
            </Box>
          </Card>
        )}

        {/* Desktop Draggable Resize Splitter Handle */}
        {!isMobile && (
          <Box
            onMouseDown={handleMouseDown}
            sx={{
              width: 8,
              cursor: 'col-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'transparent',
              transition: 'background-color 0.15s ease',
              '&:hover': {
                bgcolor: tokens.primary.subtle,
              },
            }}
          >
            <GripVertical size={14} color={tokens.text.secondary} />
          </Box>
        )}

        {/* Right Panel: Monaco Editor & Collapsible Results Panel */}
        {(!isMobile || mobileTab === 1) && (
          <Card
            sx={{
              flex: 1,
              border: `1px solid ${tokens.border.subtle}`,
              bgcolor: tokens.background.paper,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            {/* Editor Top Toolbar */}
            <Box
              sx={{
                height: 44,
                px: 2,
                borderBottom: `1px solid ${tokens.border.subtle}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: tokens.background.default,
                flexShrink: 0,
              }}
            >
              {/* Left: Language Selector for Genuinely Supported Languages */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FileCode size={16} color={tokens.primary.main} />
                <TextField
                  select
                  size="small"
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  sx={{
                    width: 140,
                    '& .MuiSelect-select': { py: 0.5, fontSize: '0.8125rem', fontWeight: 600 },
                  }}
                >
                  {genuinelySupportedLanguages.map((lang) => (
                    <MenuItem key={lang} value={lang} sx={{ fontSize: '0.8125rem', textTransform: 'capitalize' }}>
                      {lang === 'javascript' ? 'JavaScript' : lang === 'python' ? 'Python' : lang}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Right: Reset Button & Preferences Dialog Trigger */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Reset to original starter code">
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setResetDialogOpen(true)}
                    startIcon={<RotateCcw size={13} />}
                    sx={{ fontSize: '0.75rem', color: tokens.text.secondary }}
                  >
                    Reset
                  </Button>
                </Tooltip>

                <Tooltip title="Editor Preferences">
                  <IconButton size="small" onClick={() => setPrefsDialogOpen(true)} sx={{ p: 0.75, color: tokens.text.secondary }}>
                    <Settings size={16} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Monaco Editor Container */}
            <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <Editor
                height="100%"
                language={selectedLanguage === 'python' ? 'python' : 'javascript'}
                value={code}
                theme={mode === 'dark' ? 'vs-dark' : 'light'}
                onChange={handleEditorChange}
                options={{
                  fontSize: preferences.fontSize || 14,
                  tabSize: preferences.tabSize || 2,
                  minimap: { enabled: Boolean(preferences.minimap) },
                  wordWrap: preferences.wordWrap ? 'on' : 'off',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: 'on',
                  fontFamily: 'JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, monospace',
                  padding: { top: 10, bottom: 10 },
                }}
              />
            </Box>

            {/* Editor Action Bar (Run & Submit) */}
            <Box
              sx={{
                height: 48,
                px: 2,
                borderTop: `1px solid ${tokens.border.subtle}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: tokens.background.paper,
                flexShrink: 0,
              }}
            >
              <Button
                size="small"
                variant="text"
                onClick={() => setResultsOpen(!resultsOpen)}
                sx={{ fontSize: '0.75rem', color: tokens.text.secondary }}
              >
                {resultsOpen ? 'Collapse Results' : 'View Results Panel'}
              </Button>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleRunTests}
                  startIcon={<Play size={14} />}
                >
                  Run Tests
                </Button>

                <Button
                  variant="contained"
                  size="small"
                  onClick={handleDoneSubmit}
                  startIcon={<Send size={14} />}
                >
                  Submit Solution
                </Button>
              </Box>
            </Box>

            {/* Collapsible Results Panel */}
            <ResultsPanel
              open={resultsOpen}
              onToggle={() => setResultsOpen(!resultsOpen)}
              activeTab={resultsTab}
              onTabChange={setResultsTab}
              problem={problem}
              code={code}
              selectedLanguage={selectedLanguage}
              lastAction={lastAction}
            />
          </Card>
        )}
      </Box>

      {/* Editor Preferences Dialog */}
      <EditorPreferencesDialog
        open={prefsDialogOpen}
        onClose={() => setPrefsDialogOpen(false)}
        preferences={preferences}
        onChangePreferences={handleUpdatePreferences}
      />

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        maxWidth="xs"
        PaperProps={{ sx: { bgcolor: tokens.background.paper, border: `1px solid ${tokens.border.subtle}`, borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>Reset Code to Starter Template?</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            This will discard any draft changes you have made in {selectedLanguage} for this problem and restore the initial template.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, borderTop: `1px solid ${tokens.border.subtle}` }}>
          <Button onClick={() => setResetDialogOpen(false)} size="small">
            Cancel
          </Button>
          <Button onClick={handleConfirmReset} variant="contained" color="error" size="small">
            Reset to Starter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
