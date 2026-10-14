import React from 'react';
import { Box, Typography, Tooltip, IconButton, Stack } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Code,
  Award,
  TrendingUp,
  Sparkles,
  BookOpen,
  ClipboardList,
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  userRole = 'student', // 'student' | 'faculty' | 'admin'
}) {
  const { tokens } = useAppTheme();
  const location = useLocation();

  const studentLinks = [
    { label: 'Home', path: '/', icon: <Home size={18} /> },
    { label: 'Practice', path: '/practice', icon: <Code size={18} /> },
    { label: 'Assessments', path: '/assessments', icon: <Award size={18} /> },
    { label: 'Progress', path: '/progress', icon: <TrendingUp size={18} /> },
    { label: 'AI Coach', path: '/ai-coach', icon: <Sparkles size={18} /> },
  ];

  const facultyLinks = [
    { label: 'Author Problems', path: '/faculty/problems', icon: <BookOpen size={18} /> },
    { label: 'Cohort Tests', path: '/faculty/assessments', icon: <ClipboardList size={18} /> },
  ];

  const adminLinks = [
    { label: 'User Roles', path: '/admin/users', icon: <Users size={18} /> },
    { label: 'System & Audit', path: '/admin/system', icon: <Shield size={18} /> },
  ];

  const renderNavGroup = (title, links, isProtected = false, roleLabel = '') => (
    <Box sx={{ mb: 3 }}>
      {!collapsed && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, mb: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: tokens.text.secondary,
            }}
          >
            {title}
          </Typography>
          {isProtected && (
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '3px',
                backgroundColor: tokens.background.subtle,
                color: tokens.text.secondary,
                border: `1px solid ${tokens.border.subtle}`,
              }}
            >
              {roleLabel}
            </span>
          )}
        </Box>
      )}

      <Stack spacing={0.5} sx={{ px: 1 }}>
        {links.map((link) => {
          const isActive = location.pathname === link.path;

          const buttonContent = (
            <NavLink
              key={link.path}
              to={link.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: collapsed ? '8px' : '8px 12px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                color: isActive ? tokens.primary.main : tokens.text.secondary,
                backgroundColor: isActive ? tokens.primary.subtle : 'transparent',
                border: isActive ? `1px solid ${tokens.primary.subtle}` : '1px solid transparent',
                transition: 'all 0.15s ease',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {link.icon}
              </span>
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          );

          return collapsed ? (
            <Tooltip key={link.path} title={link.label} placement="right">
              <div>{buttonContent}</div>
            </Tooltip>
          ) : (
            buttonContent
          );
        })}
      </Stack>
    </Box>
  );

  return (
    <Box
      component="aside"
      sx={{
        width: collapsed ? 64 : 240,
        flexShrink: 0,
        height: 'calc(100vh - 57px)',
        borderRight: `1px solid ${tokens.border.subtle}`,
        bgcolor: tokens.background.paper,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width 0.2s ease',
        overflowY: 'auto',
        overflowX: 'hidden',
        py: 2,
      }}
    >
      <Box>
        {/* Student Section */}
        {renderNavGroup('Student Area', studentLinks)}

        {/* Faculty Protected Section */}
        {renderNavGroup('Faculty Tools', facultyLinks, true, 'FACULTY')}

        {/* Administrator Section */}
        {renderNavGroup('Administration', adminLinks, true, 'ADMIN')}
      </Box>

      {/* Collapse / Expand Toggle Button */}
      <Box sx={{ px: 1.5, pt: 1, borderTop: `1px solid ${tokens.border.subtle}` }}>
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '8px',
            padding: '6px 8px',
            borderRadius: '6px',
            border: 'none',
            background: 'none',
            color: tokens.text.secondary,
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Collapse Sidebar</span>}
        </button>
      </Box>
    </Box>
  );
}
