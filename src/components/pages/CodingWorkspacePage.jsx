import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Breadcrumbs,
  Link as MuiLink,
  CircularProgress,
  Alert,
  Divider,
  TextField,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Code,
  Play,
  Send,
  Sparkles,
  CheckCircle2,
  Lock,
  Terminal,
  FileCode,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function CodingWorkspacePage() {
  const { slug } = useParams();
  const { tokens } = useAppTheme();
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0: Description, 1: Test Cases
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

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
      } catch (err) {
        setError(err.message || 'Failed to load challenge.');
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [slug, authFetch]);

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
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
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
          </CardContent>
        </Card>
      </Box>
    );
  }

  const starterCodeForLang =
    problem.starterCode?.[selectedLanguage] ||
    `// Starter code for ${selectedLanguage}\nfunction solution() {\n\n}\n`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: 2 }}>
      {/* Top Breadcrumb & Title Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
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

      {/* Main Split Workspace Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 2,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left Column: Problem Description & Test Cases */}
        <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              borderBottom: `1px solid ${tokens.border.subtle}`,
              minHeight: 42,
              '& .MuiTab-root': {
                minHeight: 42,
                fontSize: '0.8125rem',
                textTransform: 'none',
                fontWeight: 600,
              },
            }}
          >
            <Tab label="Problem Description" />
            <Tab label={`Visible Test Cases (${(problem.visibleTestCases || []).length})`} />
          </Tabs>

          <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
            {activeTab === 0 ? (
              /* Description Tab Content */
              <Stack spacing={3}>
                <Box>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7, color: tokens.text.primary }}>
                    {problem.description}
                  </Typography>
                </Box>

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
            ) : (
              /* Test Cases Tab Content */
              <Stack spacing={2}>
                <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
                  Showing visible test cases. When your solution is evaluated, it will run against both visible test fixtures and {problem.hiddenTestCasesCount || 0} secure hidden evaluation test cases.
                </Alert>

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
                      Test Fixture {idx + 1}
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
          </Box>
        </Card>

        {/* Right Column: Code Editor & Execution Shell */}
        <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Editor Header */}
          <Box
            sx={{
              p: 1.5,
              px: 2,
              borderBottom: `1px solid ${tokens.border.subtle}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: tokens.background.default,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FileCode size={16} color={tokens.primary.main} />
              <Typography variant="subtitle2" fontWeight={600}>
                Code Workspace
              </Typography>
            </Box>

            {/* Language Selector */}
            <TextField
              select
              size="small"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              sx={{ width: 140 }}
            >
              <MenuItem value="javascript">JavaScript</MenuItem>
              <MenuItem value="python">Python</MenuItem>
            </TextField>
          </Box>

          {/* Code Container Shell */}
          <Box
            sx={{
              p: 2.5,
              flex: 1,
              bgcolor: '#0d1117',
              fontFamily: 'monospace',
              fontSize: '0.8125rem',
              color: '#e6edf3',
              overflowY: 'auto',
              whiteSpace: 'pre',
              borderBottom: `1px solid ${tokens.border.subtle}`,
            }}
          >
            {starterCodeForLang}
          </Box>

          {/* Action Bar Footer */}
          <Box
            sx={{
              p: 1.5,
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: tokens.background.default,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ fontSize: '0.6875rem', color: tokens.text.secondary }}>
                Ready for editor &amp; runner integration
              </span>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Play size={14} />}
                disabled
                title="Code runner will be connected in the upcoming task"
              >
                Run Tests
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<Send size={14} />}
                disabled
                title="Code runner will be connected in the upcoming task"
              >
                Submit Solution
              </Button>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
