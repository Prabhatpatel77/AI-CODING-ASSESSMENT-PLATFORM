import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens.js';

export function createAppTheme(mode = 'dark') {
  const currentTokens = tokens[mode] || tokens.dark;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: currentTokens.primary.main,
        contrastText: currentTokens.primary.contrastText,
      },
      secondary: {
        main: currentTokens.secondary.main,
        contrastText: currentTokens.secondary.contrastText,
      },
      background: {
        default: currentTokens.background.default,
        paper: currentTokens.background.paper,
      },
      text: {
        primary: currentTokens.text.primary,
        secondary: currentTokens.text.secondary,
        disabled: currentTokens.text.disabled,
      },
      divider: currentTokens.border.subtle,
      success: {
        main: currentTokens.status.success.main,
      },
      warning: {
        main: currentTokens.status.warning.main,
      },
      error: {
        main: currentTokens.status.error.main,
      },
      info: {
        main: currentTokens.status.info.main,
      },
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: {
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: '-0.025em',
        lineHeight: 1.25,
      },
      h2: {
        fontSize: '1.5rem',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.25rem',
        fontWeight: 600,
        letterSpacing: '-0.015em',
        lineHeight: 1.35,
      },
      h4: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      subtitle1: {
        fontSize: '0.9375rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      subtitle2: {
        fontSize: '0.8125rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      body1: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.8125rem',
        lineHeight: 1.5,
      },
      caption: {
        fontSize: '0.75rem',
        lineHeight: 1.4,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.8125rem',
      },
    },
    shape: {
      borderRadius: 6,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: currentTokens.background.default,
            color: currentTokens.text.primary,
            transition: 'background-color 0.2s ease, color 0.2s ease',
          },
          '*:focus-visible': {
            outline: `2px solid ${currentTokens.border.focus}`,
            outlineOffset: '2px',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: '6px 14px',
            transition: 'all 0.15s ease-in-out',
            '&:focus-visible': {
              outline: `2px solid ${currentTokens.border.focus}`,
              outlineOffset: '2px',
            },
          },
          containedPrimary: {
            backgroundColor: currentTokens.primary.main,
            color: currentTokens.primary.contrastText,
            '&:hover': {
              backgroundColor: currentTokens.primary.hover,
            },
            '&:active': {
              backgroundColor: currentTokens.primary.active,
            },
          },
          outlined: {
            borderColor: currentTokens.border.strong,
            color: currentTokens.text.primary,
            '&:hover': {
              backgroundColor: currentTokens.background.subtle,
              borderColor: currentTokens.border.strong,
            },
          },
          text: {
            color: currentTokens.text.secondary,
            '&:hover': {
              backgroundColor: currentTokens.background.subtle,
              color: currentTokens.text.primary,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: currentTokens.background.paper,
            borderRadius: 8,
            border: `1px solid ${currentTokens.border.subtle}`,
            backgroundImage: 'none',
            boxShadow: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: 'none',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            backgroundColor: currentTokens.background.paper,
            fontSize: '0.8125rem',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: currentTokens.border.strong,
              transition: 'border-color 0.15s ease',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: currentTokens.text.secondary,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: currentTokens.border.focus,
              borderWidth: '1.5px',
            },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': {
              borderColor: currentTokens.status.error.main,
            },
          },
          input: {
            padding: '8.5px 12px',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
            color: currentTokens.text.secondary,
            '&.Mui-focused': {
              color: currentTokens.border.focus,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            fontWeight: 500,
            fontSize: '0.75rem',
            height: '24px',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: currentTokens.background.paper,
            borderRadius: 10,
            border: `1px solid ${currentTokens.border.subtle}`,
            boxShadow: mode === 'dark'
              ? '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)'
              : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: currentTokens.border.subtle,
          },
        },
      },
    },
  });
}
