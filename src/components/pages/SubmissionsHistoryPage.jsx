import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Filter,
  ArrowUpDown,
  History,
  Code,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Eye,
  ExternalLink,
  GitCompare,
  RotateCcw,
  Award,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import AttemptComparisonDialog from '../history/AttemptComparisonDialog.jsx';

export default function SubmissionsHistoryPage() {
  const { tokens } = useAppTheme();
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Submissions & Pagination state
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
    hasMore: false,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedProblem, setSelectedProblem] = useState(searchParams.get('problemSlug') || 'all');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'all');
  const [selectedLanguage, setSelectedLanguage] = useState(searchParams.get('language') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page'), 10) || 1);
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get('limit'), 10) || 10);

  // Available problems list for dropdown
  const [problemsList, setProblemsList] = useState([]);

  // Comparison selection state (max 2)
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  // Inspection modal state
  const [inspectSubmission, setInspectSubmission] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Load available problems for filtering
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const res = await authFetch('/api/problems?limit=100');
        if (res.ok) {
          const data = await res.json();
          setProblemsList(data.problems || []);
        }
      } catch {}
    };
    fetchProblems();
  }, [authFetch]);

  // Fetch submissions from API
  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        sortBy,
      });

      if (selectedProblem && selectedProblem !== 'all') {
        queryParams.set('problemSlug', selectedProblem);
      }
      if (selectedStatus && selectedStatus !== 'all') {
        queryParams.set('status', selectedStatus);
      }
      if (selectedLanguage && selectedLanguage !== 'all') {
        queryParams.set('language', selectedLanguage);
      }
      if (searchQuery.trim()) {
        queryParams.set('search', searchQuery.trim());
      }

      const res = await authFetch(`/api/submissions?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to retrieve submission history.');
      }

      setSubmissions(data.submissions || []);
      setPagination(
        data.pagination || {
          page: currentPage,
          limit: pageSize,
          totalCount: data.submissions?.length || 0,
          totalPages: 1,
          hasMore: false,
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  }, [authFetch, currentPage, pageSize, sortBy, selectedProblem, selectedStatus, selectedLanguage, searchQuery]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Selection toggle for comparison
  const handleToggleSelectCompare = (sub) => {
    setSelectedForCompare((prev) => {
      const exists = prev.some((item) => item.id === sub.id);
      if (exists) {
        return prev.filter((item) => item.id !== sub.id);
      }
      if (prev.length >= 2) {
        // Replace second item if already 2 selected
        return [prev[1], sub];
      }
      return [...prev, sub];
    });
  };

  const handleOpenCompare = () => {
    if (selectedForCompare.length === 2) {
      setCompareDialogOpen(true);
    }
  };

  const handleLoadCodeIntoWorkspace = (codeToLoad, lang) => {
    if (!inspectSubmission?.problemSlug && selectedForCompare.length === 0) return;
    const targetSlug = inspectSubmission?.problemSlug || selectedForCompare[0]?.problemSlug;
    if (targetSlug) {
      sessionStorage.setItem(`devassess_draft_${targetSlug}_${lang || 'javascript'}`, codeToLoad);
      navigate(`/practice/${targetSlug}`);
    }
  };

  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Verdict style mapper
  const getVerdictVariant = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return 'success';
      case 'WRONG_ANSWER':
        return 'error';
      case 'TIME_LIMIT_EXCEEDED':
      case 'MEMORY_LIMIT_EXCEEDED':
        return 'warning';
      case 'COMPILATION_ERROR':
      case 'RUNTIME_ERROR':
        return 'error';
      default:
        return 'default';
    }
  };

  // Quick stats calculation
  const totalSubmissions = pagination.totalCount;
  const acceptedCount = submissions.filter((s) => s.status === 'ACCEPTED').length;
  const avgDuration =
    submissions.length > 0
      ? Math.round(submissions.reduce((acc, s) => acc + (s.durationMs || 0), 0) / submissions.length)
      : 0;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <History size={26} color={tokens.primary.main} />
              <Typography variant="h5" fontWeight={700}>
                Submission History
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Review candidate execution telemetry, inspect test breakdowns, reopen past solutions in Monaco, and compare attempts.
            </Typography>
          </Box>

          {/* Compare Launcher Floating Pill */}
          {selectedForCompare.length > 0 && (
            <Card
              sx={{
                p: 1.5,
                bgcolor: tokens.background.paper,
                border: `1px solid ${tokens.primary.main}`,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <GitCompare size={18} color={tokens.primary.main} />
              <Typography variant="body2" fontWeight={600}>
                {selectedForCompare.length === 1
                  ? '1 selected (pick 1 more to compare)'
                  : '2 attempts selected'}
              </Typography>
              <Button
                size="small"
                variant="contained"
                disabled={selectedForCompare.length !== 2}
                onClick={handleOpenCompare}
                sx={{ fontSize: '0.75rem', py: 0.5 }}
              >
                Compare Attempts
              </Button>
              <IconButton size="small" onClick={() => setSelectedForCompare([])}>
                <X size={14} />
              </IconButton>
            </Card>
          )}
        </Box>
      </Box>

      {/* Quick Summary Metric Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card sx={{ bgcolor: tokens.background.paper, border: `1px solid ${tokens.border.subtle}` }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Total Submissions
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
              {totalSubmissions}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: tokens.background.paper, border: `1px solid ${tokens.border.subtle}` }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Page Pass Rate
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5, color: tokens.status.success.main }}>
              {submissions.length > 0 ? `${Math.round((acceptedCount / submissions.length) * 100)}%` : '0%'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: tokens.background.paper, border: `1px solid ${tokens.border.subtle}` }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Avg Execution Time
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
              {avgDuration} ms
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: tokens.background.paper, border: `1px solid ${tokens.border.subtle}` }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              User Role Context
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5, textTransform: 'capitalize' }}>
              {user?.role || 'Student'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filter and Control Bar */}
      <Card sx={{ mb: 3, bgcolor: tokens.background.paper, border: `1px solid ${tokens.border.subtle}` }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr', md: '2.5fr 1.5fr 1.5fr 1.5fr 1.5fr' },
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            {/* Search Input */}
            <TextField
              size="small"
              placeholder="Search by problem, title, ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color={tokens.text.secondary} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Problem Filter */}
            <FormControl size="small">
              <InputLabel>Problem</InputLabel>
              <Select
                value={selectedProblem}
                label="Problem"
                onChange={(e) => {
                  setSelectedProblem(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="all">All Problems</MenuItem>
                {problemsList.map((p) => (
                  <MenuItem key={p.slug} value={p.slug}>
                    {p.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Status / Verdict Filter */}
            <FormControl size="small">
              <InputLabel>Verdict</InputLabel>
              <Select
                value={selectedStatus}
                label="Verdict"
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="all">All Verdicts</MenuItem>
                <MenuItem value="ACCEPTED">Accepted</MenuItem>
                <MenuItem value="WRONG_ANSWER">Wrong Answer</MenuItem>
                <MenuItem value="TIME_LIMIT_EXCEEDED">Time Limit</MenuItem>
                <MenuItem value="MEMORY_LIMIT_EXCEEDED">Memory Limit</MenuItem>
                <MenuItem value="COMPILATION_ERROR">Compilation Error</MenuItem>
                <MenuItem value="RUNTIME_ERROR">Runtime Error</MenuItem>
                <MenuItem value="UNCONFIGURED">Unconfigured</MenuItem>
              </Select>
            </FormControl>

            {/* Language Filter */}
            <FormControl size="small">
              <InputLabel>Language</InputLabel>
              <Select
                value={selectedLanguage}
                label="Language"
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="all">All Languages</MenuItem>
                <MenuItem value="javascript">JavaScript</MenuItem>
                <MenuItem value="python">Python</MenuItem>
              </Select>
            </FormControl>

            {/* Sort Filter */}
            <FormControl size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="oldest">Oldest First</MenuItem>
                <MenuItem value="highest_score">Highest Score</MenuItem>
                <MenuItem value="fastest">Fastest Execution</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Main Submissions Table */}
      <Card sx={{ bgcolor: tokens.background.paper, border: `1px solid ${tokens.border.subtle}`, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <CircularProgress size={32} sx={{ color: tokens.primary.main }} />
            <Typography variant="body2" color="text.secondary">
              Querying persistent submission records...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : submissions.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <History size={48} color={tokens.text.secondary} style={{ opacity: 0.5, marginBottom: 12 }} />
            <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
              No submissions found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Try adjusting your filter criteria or solve challenges in the Practice workspace.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/practice')}>
              Go to Practice Challenges
            </Button>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="medium">
                <TableHead sx={{ bgcolor: tokens.background.default }}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Tooltip title="Select up to 2 attempts to compare">
                        <Box sx={{ display: 'flex', alignItems: 'center', pl: 1 }}>
                          <GitCompare size={16} color={tokens.text.secondary} />
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: tokens.text.secondary }}>
                      VERDICT
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: tokens.text.secondary }}>
                      CHALLENGE
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: tokens.text.secondary }}>
                      SCORE & TESTS
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: tokens.text.secondary }}>
                      RUNTIME
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: tokens.text.secondary }}>
                      ASSESSMENT
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: tokens.text.secondary }}>
                      SUBMITTED
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: tokens.text.secondary }}>
                      ACTIONS
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {submissions.map((sub) => {
                    const isSelected = selectedForCompare.some((item) => item.id === sub.id);
                    return (
                      <TableRow
                        key={sub.id}
                        hover
                        sx={{
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'inherit',
                          '&:last-child td, &:last-child th': { border: 0 },
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            onChange={() => handleToggleSelectCompare(sub)}
                          />
                        </TableCell>

                        {/* Verdict */}
                        <TableCell>
                          <StatusBadge
                            variant={getVerdictVariant(sub.status)}
                            size="small"
                            label={sub.status}
                          />
                        </TableCell>

                        {/* Challenge Title */}
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': { color: tokens.primary.main, textDecoration: 'underline' },
                            }}
                            onClick={() => navigate(`/practice/${sub.problemSlug}`)}
                          >
                            {sub.problemTitle || sub.problemSlug}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {sub.language} · ID: {sub.id?.slice(0, 16)}...
                          </Typography>
                        </TableCell>

                        {/* Score & Tests */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={700}>
                              {sub.score}%
                            </Typography>
                            <span style={{ fontSize: '0.75rem', color: tokens.text.secondary }}>
                              ({sub.passedTests}/{sub.totalTests} passed)
                            </span>
                          </Box>
                        </TableCell>

                        {/* Runtime */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Clock size={14} color={tokens.text.secondary} />
                            <Typography variant="body2">{sub.durationMs || 0}ms</Typography>
                          </Box>
                        </TableCell>

                        {/* Assessment */}
                        <TableCell>
                          {sub.assessmentTitle || sub.assessmentId ? (
                            <Chip
                              size="small"
                              icon={<Award size={12} />}
                              label={sub.assessmentTitle || sub.assessmentId}
                              sx={{
                                height: 22,
                                fontSize: '0.6875rem',
                                bgcolor: tokens.primary.subtle,
                                color: tokens.primary.main,
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: tokens.text.secondary }}>Standard Practice</span>
                          )}
                        </TableCell>

                        {/* Submitted Time */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </TableCell>

                        {/* Action Buttons */}
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Inspect complete execution telemetry">
                              <IconButton
                                size="small"
                                onClick={() => setInspectSubmission(sub)}
                                sx={{ color: tokens.text.secondary }}
                              >
                                <Eye size={16} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Reopen code in Monaco Workspace">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ExternalLink size={14} />}
                                onClick={() => {
                                  sessionStorage.setItem(
                                    `devassess_draft_${sub.problemSlug}_${sub.language}`,
                                    sub.code
                                  );
                                  navigate(`/practice/${sub.problemSlug}`);
                                }}
                                sx={{ fontSize: '0.75rem', py: 0.25 }}
                              >
                                Reopen Code
                              </Button>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination Controls */}
            <Box
              sx={{
                p: 2,
                borderTop: `1px solid ${tokens.border.subtle}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Showing {(currentPage - 1) * pageSize + 1} -{' '}
                  {Math.min(currentPage * pageSize, pagination.totalCount)} of {pagination.totalCount} submissions
                </Typography>

                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    sx={{ fontSize: '0.75rem', height: 28 }}
                  >
                    <MenuItem value={10}>10 / page</MenuItem>
                    <MenuItem value={25}>25 / page</MenuItem>
                    <MenuItem value={50}>50 / page</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  variant="outlined"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  startIcon={<ChevronLeft size={16} />}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Previous
                </Button>

                <Typography variant="caption" fontWeight={600} sx={{ px: 1 }}>
                  Page {pagination.page} of {pagination.totalPages}
                </Typography>

                <Button
                  size="small"
                  variant="outlined"
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  endIcon={<ChevronRight size={16} />}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Next
                </Button>
              </Stack>
            </Box>
          </>
        )}
      </Card>

      {/* Attempt Comparison Dialog */}
      {selectedForCompare.length === 2 && (
        <AttemptComparisonDialog
          open={compareDialogOpen}
          onClose={() => setCompareDialogOpen(false)}
          baseSubmission={selectedForCompare[0]}
          compareSubmission={selectedForCompare[1]}
          onLoadCodeIntoWorkspace={handleLoadCodeIntoWorkspace}
        />
      )}

      {/* Single Submission Detail / Inspection Modal */}
      {inspectSubmission && (
        <Dialog
          open={Boolean(inspectSubmission)}
          onClose={() => setInspectSubmission(null)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: tokens.background.default,
              color: tokens.text.primary,
              borderRadius: 2,
              border: `1px solid ${tokens.border.main}`,
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
                Submission Inspection
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {inspectSubmission.problemTitle || inspectSubmission.problemSlug} · Evaluated by {inspectSubmission.provider || 'isolated-judge'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setInspectSubmission(null)}>
              <X size={18} />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 2.5 }}>
            {/* Metadata Chips */}
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2.5, gap: 1 }}>
              <StatusBadge
                variant={getVerdictVariant(inspectSubmission.status)}
                size="medium"
                label={inspectSubmission.status}
              />
              <Chip size="small" label={`Score: ${inspectSubmission.score}%`} sx={{ fontWeight: 700 }} />
              <Chip size="small" label={`Tests: ${inspectSubmission.passedTests} / ${inspectSubmission.totalTests}`} />
              <Chip size="small" label={`Runtime: ${inspectSubmission.durationMs || 0} ms`} />
              {inspectSubmission.memoryUsedKb && (
                <Chip size="small" label={`Memory: ${Math.round(inspectSubmission.memoryUsedKb / 1024)} MB`} />
              )}
              <Chip size="small" label={`Language: ${inspectSubmission.language}`} />
              <Chip size="small" label={new Date(inspectSubmission.createdAt).toLocaleString()} />
            </Stack>

            {/* Test Results Breakdown */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Test Suite Evaluation
            </Typography>
            <Stack spacing={1} sx={{ mb: 3 }}>
              {(inspectSubmission.testResults || []).map((tr, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: tokens.background.paper,
                    border: `1px solid ${tr.passed ? tokens.status.success.border : tokens.status.error.border}`,
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={700}>
                      {tr.isHidden ? `Hidden Test Case ${tr.testCaseNumber || idx + 1} (Confidential)` : `Test Case ${tr.testCaseNumber || idx + 1}`}
                    </Typography>
                    <StatusBadge
                      variant={tr.passed ? 'success' : 'error'}
                      size="small"
                      label={tr.passed ? 'PASSED' : tr.status || 'FAILED'}
                    />
                  </Box>

                  {tr.isHidden ? (
                    <Typography variant="caption" color="text.secondary">
                      Input and expected output redacted to preserve test integrity.
                    </Typography>
                  ) : (
                    <>
                      <div><strong>Input:</strong> {tr.inputStr || JSON.stringify(tr.input)}</div>
                      <div><strong>Expected:</strong> {JSON.stringify(tr.expectedOutput)}</div>
                      {tr.actualOutput !== undefined && (
                        <div><strong>Actual:</strong> {JSON.stringify(tr.actualOutput)}</div>
                      )}
                    </>
                  )}
                </Box>
              ))}
            </Stack>

            {/* Submitted Source Code */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Submitted Code
              </Typography>
              <Button
                size="small"
                startIcon={copiedCode ? <Check size={14} color="green" /> : <Copy size={14} />}
                onClick={() => handleCopyCode(inspectSubmission.code)}
                sx={{ fontSize: '0.75rem' }}
              >
                {copiedCode ? 'Copied' : 'Copy Code'}
              </Button>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: tokens.background.paper,
                border: `1px solid ${tokens.border.subtle}`,
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                maxHeight: '260px',
                overflowY: 'auto',
                whiteSpace: 'pre',
              }}
            >
              {inspectSubmission.code}
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2, borderTop: `1px solid ${tokens.border.subtle}` }}>
            <Button
              variant="contained"
              startIcon={<ExternalLink size={14} />}
              onClick={() => {
                sessionStorage.setItem(
                  `devassess_draft_${inspectSubmission.problemSlug}_${inspectSubmission.language}`,
                  inspectSubmission.code
                );
                navigate(`/practice/${inspectSubmission.problemSlug}`);
              }}
            >
              Reopen in Workspace
            </Button>
            <Button variant="outlined" onClick={() => setInspectSubmission(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
