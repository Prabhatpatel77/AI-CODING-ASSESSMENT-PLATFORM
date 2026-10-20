import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  MenuItem,
  Stack,
  Alert,
  Skeleton,
  Pagination,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Code,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Circle,
  HelpCircle,
  SlidersHorizontal,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function PracticePage() {
  const { tokens } = useAppTheme();
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  // Filter and query states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [topic, setTopic] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'solved' | 'unsolved'
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Data states
  const [problems, setProblems] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // User submissions map (problemId -> boolean isSolved)
  // Kept empty by default until real submission records exist
  const [solvedProblemIds] = useState(new Set());

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch unique topics list from backend
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await fetch('/api/problems/meta/topics');
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.topics)) {
          setAvailableTopics(data.topics);
        }
      } catch (err) {
        console.warn('Could not load topics metadata:', err);
      }
    };
    fetchTopics();
  }, []);

  // Fetch problems from real backend API
  const fetchProblems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
      });

      if (difficulty !== 'all') params.append('difficulty', difficulty);
      if (topic !== 'all') params.append('topic', topic);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());

      const res = await authFetch(`/api/problems?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to retrieve problems from server.');
      }

      let items = data.problems || [];

      // Filter by solved/unsolved status if requested
      if (statusFilter === 'solved') {
        items = items.filter((p) => solvedProblemIds.has(p.id) || solvedProblemIds.has(p.slug));
      } else if (statusFilter === 'unsolved') {
        items = items.filter((p) => !solvedProblemIds.has(p.id) && !solvedProblemIds.has(p.slug));
      }

      setProblems(items);
      setTotalCount(data.total || items.length);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Problem list fetch error:', err);
      setError(err.message || 'Could not connect to problem API.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, difficulty, topic, debouncedSearch, sortBy, statusFilter, solvedProblemIds, authFetch]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setDifficulty('all');
    setTopic('all');
    setStatusFilter('all');
    setSortBy('newest');
    setPage(1);
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

  const hasActiveFilters =
    search.trim() !== '' || difficulty !== 'all' || topic !== 'all' || statusFilter !== 'all' || sortBy !== 'newest';

  return (
    <Box sx={{ maxWidth: 1140, mx: 'auto', py: 1 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 0.75,
              borderRadius: 1,
              bgcolor: tokens.primary.subtle,
              color: tokens.primary.main,
            }}
          >
            <Code size={18} />
          </Box>
          <Typography variant="h2" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
            Practice Library
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
          Master foundational algorithms and data structures. Filter challenges by topic, difficulty,
          or keyword to practice with visible test fixtures and multi-language starter templates.
        </Typography>
      </Box>

      {/* Filter & Search Bar */}
      <Card sx={{ mb: 3.5, border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            {/* Top Row: Search & Status Filter */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 200px' },
                gap: 2,
              }}
            >
              {/* Search input */}
              <TextField
                fullWidth
                size="small"
                placeholder="Search problems by title, keyword, or topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Search size={16} color={tokens.text.secondary} style={{ marginRight: 8 }} />
                  ),
                  endAdornment: search ? (
                    <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.5 }}>
                      <X size={14} />
                    </IconButton>
                  ) : null,
                }}
              />

              {/* Solved / Unsolved Filter */}
              <TextField
                select
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="unsolved">Unsolved</MenuItem>
                <MenuItem value="solved">Solved</MenuItem>
              </TextField>
            </Box>

            {/* Bottom Row: Difficulty, Topic, Sort By, and Reset */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr auto' },
                gap: 1.5,
                alignItems: 'center',
              }}
            >
              {/* Difficulty filter */}
              <TextField
                select
                size="small"
                label="Difficulty"
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="all">All Difficulties</MenuItem>
                <MenuItem value="Easy">Easy</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Hard">Hard</MenuItem>
              </TextField>

              {/* Topic filter */}
              <TextField
                select
                size="small"
                label="Topic Tag"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="all">All Topics</MenuItem>
                {availableTopics.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>

              {/* Sort By selector */}
              <TextField
                select
                size="small"
                label="Sort By"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="oldest">Oldest First</MenuItem>
                <MenuItem value="title_asc">Title (A-Z)</MenuItem>
                <MenuItem value="title_desc">Title (Z-A)</MenuItem>
                <MenuItem value="difficulty_asc">Difficulty (Easy to Hard)</MenuItem>
                <MenuItem value="difficulty_desc">Difficulty (Hard to Easy)</MenuItem>
              </TextField>

              {/* Reset Filters action */}
              {hasActiveFilters && (
                <Button
                  variant="text"
                  size="small"
                  onClick={handleResetFilters}
                  sx={{ color: tokens.text.secondary, textDecoration: 'underline', minWidth: 'auto', px: 1 }}
                >
                  Reset
                </Button>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Error State Banner */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={fetchProblems} startIcon={<RefreshCw size={14} />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Solved Filter Informational Notice when no solved problems exist */}
      {statusFilter === 'solved' && solvedProblemIds.size === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No solved problem records exist for your student account yet. Problems are marked solved
          only after submitting a solution that passes all test fixtures.
        </Alert>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={54}
                  sx={{ borderRadius: 1.5, bgcolor: tokens.background.subtle }}
                />
              ))}
            </Stack>
          </Box>
        </Card>
      ) : problems.length === 0 ? (
        /* Empty State */
        <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper, textAlign: 'center', py: 6, px: 3 }}>
          <HelpCircle size={36} color={tokens.text.secondary} style={{ margin: '0 auto 12px auto' }} />
          <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
            No matching problems found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto', mb: 3 }}>
            No published problems matched your current filter and search criteria.
            Try adjusting your search terms or clearing your filters.
          </Typography>
          <Button variant="outlined" size="small" onClick={handleResetFilters}>
            Clear All Filters
          </Button>
        </Card>
      ) : (
        /* Responsive Problems Table & Cards */
        <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.paper }}>
          {/* Desktop Table View */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <TableContainer>
              <Table aria-label="Problems table">
                <TableHead sx={{ bgcolor: tokens.background.default }}>
                  <TableRow>
                    <TableCell sx={{ color: tokens.text.secondary, fontWeight: 600, fontSize: '0.75rem', width: 48 }}>
                      #
                    </TableCell>
                    <TableCell sx={{ color: tokens.text.secondary, fontWeight: 600, fontSize: '0.75rem' }}>
                      Problem Title
                    </TableCell>
                    <TableCell sx={{ color: tokens.text.secondary, fontWeight: 600, fontSize: '0.75rem', width: 120 }}>
                      Difficulty
                    </TableCell>
                    <TableCell sx={{ color: tokens.text.secondary, fontWeight: 600, fontSize: '0.75rem' }}>
                      Topics
                    </TableCell>
                    <TableCell sx={{ color: tokens.text.secondary, fontWeight: 600, fontSize: '0.75rem', width: 120 }}>
                      Languages
                    </TableCell>
                    <TableCell align="right" sx={{ color: tokens.text.secondary, fontWeight: 600, fontSize: '0.75rem', width: 120 }}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {problems.map((problem, idx) => {
                    const isSolved = solvedProblemIds.has(problem.id) || solvedProblemIds.has(problem.slug);

                    return (
                      <TableRow
                        key={problem.slug}
                        hover
                        sx={{
                          '&:last-child td, &:last-child th': { border: 0 },
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        onClick={() => navigate(`/practice/${problem.slug}`)}
                      >
                        <TableCell sx={{ color: tokens.text.secondary, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {(page - 1) * limit + idx + 1}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {isSolved ? (
                              <CheckCircle2 size={16} color={tokens.status.success.main} />
                            ) : (
                              <Circle size={14} color={tokens.text.disabled} />
                            )}
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{
                                color: tokens.text.primary,
                                '&:hover': { color: tokens.primary.main },
                              }}
                            >
                              {problem.title}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <StatusBadge variant={getDifficultyVariant(problem.difficulty)} size="small" label={problem.difficulty} />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {(problem.topics || []).slice(0, 3).map((topicName) => (
                              <span
                                key={topicName}
                                style={{
                                  fontSize: '0.6875rem',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  backgroundColor: tokens.background.default,
                                  border: `1px solid ${tokens.border.subtle}`,
                                  color: tokens.text.secondary,
                                }}
                              >
                                {topicName}
                              </span>
                            ))}
                            {(problem.topics || []).length > 3 && (
                              <span style={{ fontSize: '0.6875rem', color: tokens.text.secondary }}>
                                +{problem.topics.length - 3}
                              </span>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: tokens.text.secondary, textTransform: 'capitalize' }}>
                          {(problem.supportedLanguages || []).join(', ')}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/practice/${problem.slug}`);
                            }}
                            endIcon={<ArrowRight size={13} />}
                            sx={{ fontSize: '0.75rem', py: 0.5 }}
                          >
                            Solve
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Mobile Card View */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, p: 2 }}>
            <Stack spacing={1.5}>
              {problems.map((problem) => (
                <Box
                  key={problem.slug}
                  onClick={() => navigate(`/practice/${problem.slug}`)}
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: tokens.background.default,
                    border: `1px solid ${tokens.border.subtle}`,
                    cursor: 'pointer',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {problem.title}
                    </Typography>
                    <StatusBadge variant={getDifficultyVariant(problem.difficulty)} size="small" label={problem.difficulty} />
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                    {(problem.topics || []).map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: '0.625rem',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor: tokens.background.paper,
                          border: `1px solid ${tokens.border.subtle}`,
                          color: tokens.text.secondary,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </Box>

                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    endIcon={<ArrowRight size={13} />}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    Solve Challenge
                  </Button>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: `1px solid ${tokens.border.subtle}`,
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Showing {problems.length} of {totalCount} published challenges
              </Typography>

              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, val) => setPage(val)}
                size="small"
                shape="rounded"
                color="primary"
              />
            </Box>
          )}
        </Card>
      )}
    </Box>
  );
}
