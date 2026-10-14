/**
 * Design Tokens for AI Coding Assessment Platform
 * Polished developer-workspace aesthetic with restrained violet accents.
 */

export const tokens = {
  dark: {
    background: {
      default: '#0b0f17', // Main viewport canvas (dark slate)
      paper: '#111827',   // Structural container surface
      subtle: '#161f30',  // Elevated surface / hover card
      elevated: '#1a2438',
    },
    text: {
      primary: '#f9fafb',   // High-contrast primary prose
      secondary: '#94a3b8', // Muted metadata and labels
      disabled: '#64748b',
    },
    border: {
      subtle: '#1f293d',    // Hairline border
      strong: '#334155',    // Emphasized border
      focus: '#8b5cf6',     // Violet focus-visible ring
    },
    primary: {
      main: '#8b5cf6',      // Violet-500
      hover: '#7c3aed',     // Violet-600
      active: '#6d28d9',    // Violet-700
      subtle: 'rgba(139, 92, 246, 0.12)',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748b',
      contrastText: '#ffffff',
    },
    status: {
      success: {
        main: '#10b981',
        subtle: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.25)',
      },
      warning: {
        main: '#f59e0b',
        subtle: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.25)',
      },
      error: {
        main: '#f43f5e',
        subtle: 'rgba(244, 63, 94, 0.12)',
        border: 'rgba(244, 63, 94, 0.25)',
      },
      info: {
        main: '#0ea5e9',
        subtle: 'rgba(14, 165, 233, 0.12)',
        border: 'rgba(14, 165, 233, 0.25)',
      },
    },
  },
  light: {
    background: {
      default: '#f8fafc', // Clean neutral slate canvas
      paper: '#ffffff',   // Clean card surface
      subtle: '#f1f5f9',  // Hover / elevated surface
      elevated: '#e2e8f0',
    },
    text: {
      primary: '#0f172a',   // Deep slate
      secondary: '#64748b', // Muted metadata
      disabled: '#94a3b8',
    },
    border: {
      subtle: '#e2e8f0',
      strong: '#cbd5e1',
      focus: '#7c3aed',
    },
    primary: {
      main: '#7c3aed',      // Violet-600
      hover: '#6d28d9',     // Violet-700
      active: '#5b21b6',
      subtle: 'rgba(124, 58, 237, 0.08)',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#475569',
      contrastText: '#ffffff',
    },
    status: {
      success: {
        main: '#059669',
        subtle: '#ecfdf5',
        border: '#a7f3d0',
      },
      warning: {
        main: '#d97706',
        subtle: '#fffbeb',
        border: '#fde68a',
      },
      error: {
        main: '#e11d48',
        subtle: '#fff1f2',
        border: '#fecdd3',
      },
      info: {
        main: '#0284c7',
        subtle: '#f0f9ff',
        border: '#bae6fd',
      },
    },
  },
};
