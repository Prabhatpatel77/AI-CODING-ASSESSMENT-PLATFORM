import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppThemeProvider } from './theme/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AppShell from './components/layout/AppShell.jsx';
import StudentDashboard from './components/pages/StudentDashboard.jsx';
import RoutePlaceholder from './components/pages/RoutePlaceholder.jsx';
import LoginPage from './components/pages/LoginPage.jsx';
import RegisterPage from './components/pages/RegisterPage.jsx';
import PracticePage from './components/pages/PracticePage.jsx';
import CodingWorkspacePage from './components/pages/CodingWorkspacePage.jsx';
import SubmissionsHistoryPage from './components/pages/SubmissionsHistoryPage.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

export default function App() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Standalone Authentication Pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Application Shell Routes */}
            <Route element={<AppShell />}>
              {/* Home Student Dashboard */}
              <Route index element={<StudentDashboard />} />

              {/* Student Navigation Routes (Protected) */}
              <Route
                path="practice"
                element={
                  <ProtectedRoute>
                    <PracticePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="practice/:slug"
                element={
                  <ProtectedRoute>
                    <CodingWorkspacePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="submissions"
                element={
                  <ProtectedRoute>
                    <SubmissionsHistoryPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="assessments"
                element={
                  <ProtectedRoute>
                    <RoutePlaceholder
                      title="Assessments"
                      subtitle="Timed coding evaluations, cohort examination sessions, and proctored testing."
                      category="Student Area"
                      breadcrumbs={[{ label: 'Assessments', path: '/assessments' }]}
                      plannedCapabilities={[
                        'Timed assessment sessions with countdown timer and automated submission',
                        'Proctored workspace with tab-switch warnings and paste event detection',
                        'Automated grading against hidden evaluation test suites',
                        'Scorecard generation with benchmark analysis',
                      ]}
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="progress"
                element={
                  <ProtectedRoute>
                    <RoutePlaceholder
                      title="Progress Analytics"
                      subtitle="Skill radar, topic proficiency metrics, and submission history."
                      category="Student Area"
                      breadcrumbs={[{ label: 'Progress', path: '/progress' }]}
                      plannedCapabilities={[
                        'Acceptance rate tracking across difficulty tiers and algorithmic categories',
                        'Daily problem-solving streak and activity timeline',
                        'Weakness diagnosis highlighting topics needing remediation',
                        'Personalized practice recommendations based on past test failures',
                      ]}
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="ai-coach"
                element={
                  <ProtectedRoute>
                    <RoutePlaceholder
                      title="AI Coach"
                      subtitle="Intelligent technical mentor powered by Gemini multi-agent architecture."
                      category="Student Area"
                      breadcrumbs={[{ label: 'AI Coach', path: '/ai-coach' }]}
                      plannedCapabilities={[
                        'Adaptive Hint Agent providing 3-tier progressive Socratic hints without spoiling answers',
                        'Code Review Agent evaluating Big-O complexity, edge cases, and code style',
                        'Interactive mock interview agent simulating technical dialogue',
                        'Concept explainer delivering contextual computer science fundamentals',
                      ]}
                    />
                  </ProtectedRoute>
                }
              />

              {/* Account Views (Protected) */}
              <Route
                path="profile"
                element={
                  <ProtectedRoute>
                    <RoutePlaceholder
                      title="User Profile"
                      subtitle="Candidate credentials, solved challenge records, and account details."
                      category="Account"
                      breadcrumbs={[{ label: 'Profile', path: '/profile' }]}
                      plannedCapabilities={[
                        'Candidate profile information and skill endorsements',
                        'Verification badges and assessment completion certificates',
                        'Session history and security credentials',
                      ]}
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="settings"
                element={
                  <ProtectedRoute>
                    <RoutePlaceholder
                      title="Settings & Preferences"
                      subtitle="Workspace customization, editor keybindings, and notification preferences."
                      category="Account"
                      breadcrumbs={[{ label: 'Settings', path: '/settings' }]}
                      plannedCapabilities={[
                        'Monaco editor preferences (font size, tab size, minimap toggle, vim/default keybindings)',
                        'Default programming language preference for practice challenges',
                        'Theme mode customization and accessibility display options',
                      ]}
                    />
                  </ProtectedRoute>
                }
              />

              {/* Protected Faculty Routes (Requires Faculty or Admin) */}
              <Route
                path="faculty/problems"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                    <RoutePlaceholder
                      title="Problem Authoring"
                      subtitle="Faculty problem set designer, test case editor, and rubric builder."
                      category="Faculty Area"
                      roleRequired="Faculty"
                      breadcrumbs={[
                        { label: 'Faculty', path: '/faculty/problems' },
                        { label: 'Author Problems', path: '/faculty/problems' },
                      ]}
                      plannedCapabilities={[
                        'Markdown problem description editor with LaTeX math formula support',
                        'Test fixture authoring with visible and hidden test case management',
                        'Reference solution validator testing starter templates against test fixtures',
                        'Custom grading rubric configuration',
                      ]}
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="faculty/assessments"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                    <RoutePlaceholder
                      title="Cohort Assessments"
                      subtitle="Faculty evaluation manager, cohort invite tokens, and submission review."
                      category="Faculty Area"
                      roleRequired="Faculty"
                      breadcrumbs={[
                        { label: 'Faculty', path: '/faculty/assessments' },
                        { label: 'Cohort Tests', path: '/faculty/assessments' },
                      ]}
                      plannedCapabilities={[
                        'Assessment creator bundling problems into timed examination sets',
                        'Candidate invite token generator with scheduled expiration',
                        'Live assessment monitoring displaying active candidates and progress',
                        'AI-assisted rubric grading and code similarity inspection',
                      ]}
                    />
                  </ProtectedRoute>
                }
              />

              {/* Protected Administrator Routes (Requires Admin) */}
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RoutePlaceholder
                      title="User & Role Management"
                      subtitle="Administrator controls for student, faculty, and administrator privileges."
                      category="Administration"
                      roleRequired="Admin"
                      breadcrumbs={[
                        { label: 'Admin', path: '/admin/users' },
                        { label: 'User Roles', path: '/admin/users' },
                      ]}
                      plannedCapabilities={[
                        'User directory with search, filtering, and role assignment (Student/Faculty/Admin)',
                        'Batch invite system for educational cohorts and recruiting teams',
                        'Account activation and suspension controls',
                      ]}
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="admin/system"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RoutePlaceholder
                      title="System & Audit Logs"
                      subtitle="Platform health diagnostics, execution sandbox telemetry, and audit trail."
                      category="Administration"
                      roleRequired="Admin"
                      breadcrumbs={[
                        { label: 'Admin', path: '/admin/system' },
                        { label: 'System & Audit', path: '/admin/system' },
                      ]}
                      plannedCapabilities={[
                        'Real-time execution sandbox prober monitoring Node.js and Python runtimes',
                        'Security audit trail logging authentication events and privilege changes',
                        'Database connectivity telemetry and resource utilization metrics',
                      ]}
                    />
                  </ProtectedRoute>
                }
              />

              {/* 404 Fallback */}
              <Route
                path="*"
                element={
                  <RoutePlaceholder
                    title="404 - Route Not Found"
                    subtitle="The requested navigation path does not exist in this workspace."
                    category="Error"
                    breadcrumbs={[{ label: '404', path: '*' }]}
                    plannedCapabilities={[
                      'Use the sidebar navigation to return to registered modules.',
                    ]}
                  />
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppThemeProvider>
  );
}
