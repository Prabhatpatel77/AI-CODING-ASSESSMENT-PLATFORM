import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Stack, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import {
  Code,
  Award,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Lock,
  Terminal,
} from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function HomePage() {
  const { tokens } = useAppTheme();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => {});
  }, []);

  const studentModules = [
    {
      title: 'Practice Library',
      description: 'Algorithm and system design challenges with Monaco workspace and test runners.',
      path: '/practice',
      icon: <Code size={20} color={tokens.primary.main} />,
      badge: 'Core Workspace',
    },
    {
      title: 'Assessments',
      description: 'Timed technical evaluations, proctored coding sessions, and submission deadlines.',
      path: '/assessments',
      icon: <Award size={20} color={tokens.status.warning.main} />,
      badge: 'Evaluations',
    },
    {
      title: 'Progress Analytics',
      description: 'Skill radar, submission acceptance rates, topic mastery, and learning velocity.',
      path: '/progress',
      icon: <TrendingUp size={20} color={tokens.status.success.main} />,
      badge: 'Analytics',
    },
    {
      title: 'AI Coach',
      description: 'Socratic hint generator, automated code review, and mock interview agent powered by Gemini.',
      path: '/ai-coach',
      icon: <Sparkles size={20} color={tokens.primary.main} />,
      badge: 'Multi-Agent',
    },
  ];

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', py: 2 }}>
      {/* Welcome Banner */}
      <Box sx={{ mb: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 0.75,
              borderRadius: 1,
              bgcolor: tokens.primary.subtle,
              color: tokens.primary.main,
            }}
          >
            <Terminal size={18} />
          </Box>
          <StatusBadge variant="success" size="small" label="Application Shell Active" />
          {health && (
            <span style={{ fontSize: '0.75rem', color: tokens.text.secondary, fontFamily: 'monospace' }}>
              · Uptime: {Math.round(health.uptime)}s
            </span>
          )}
        </Box>

        <Typography variant="h2" fontWeight={700} sx={{ letterSpacing: '-0.025em', mb: 1 }}>
          AI Coding Assessment Platform
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
          Centralized engineering evaluation environment. Explore student workspaces,
          protected faculty assessment tools, and administrative controls via the navigation shell.
        </Typography>
      </Box>

      {/* Student Navigation Cards Grid */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ color: tokens.text.secondary, mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Student Navigation Modules
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2.5,
          }}
        >
          {studentModules.map((mod) => (
            <Card
              key={mod.path}
              sx={{
                border: `1px solid ${tokens.border.subtle}`,
                bgcolor: tokens.background.paper,
                transition: 'border-color 0.15s ease, transform 0.15s ease',
                '&:hover': {
                  borderColor: tokens.border.strong,
                },
              }}
            >
              <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ p: 1, borderRadius: 1, bgcolor: tokens.background.default }}>
                    {mod.icon}
                  </Box>
                  <StatusBadge variant="neutral" size="small" label={mod.badge} />
                </Box>

                <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
                  {mod.title}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flex: 1, lineHeight: 1.6 }}>
                  {mod.description}
                </Typography>

                <Button
                  component={Link}
                  to={mod.path}
                  variant="outlined"
                  size="small"
                  endIcon={<ArrowRight size={14} />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Open {mod.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Protected Roles Architecture Preview */}
      <Card sx={{ border: `1px solid ${tokens.border.subtle}`, bgcolor: tokens.background.default }}>
        <CardContent sx={{ p: 3.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Lock size={18} color={tokens.status.warning.main} />
            <Typography variant="h4" fontWeight={600}>
              Reserved Protected Roles
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 680, lineHeight: 1.6 }}>
            The navigation sidebar includes reserved sections for Faculty (question authoring, rubric configuration)
            and Administrators (user roles, audit logs). Switch active role preview in the top-right user menu.
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Button
              component={Link}
              to="/faculty/problems"
              variant="outlined"
              size="small"
              sx={{ borderColor: tokens.border.strong }}
            >
              Preview Faculty Problems
            </Button>
            <Button
              component={Link}
              to="/admin/users"
              variant="outlined"
              size="small"
              sx={{ borderColor: tokens.border.strong }}
            >
              Preview Admin Users
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
