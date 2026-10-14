import React from 'react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';

/**
 * StatusBadge Component
 * Accessible status indicator with high-contrast text and subtle tint background.
 * Variants: 'success' | 'warning' | 'error' | 'info' | 'neutral'
 */
export default function StatusBadge({
  variant = 'neutral',
  label,
  children,
  showDot = true,
  size = 'medium', // 'small' | 'medium'
}) {
  const { tokens } = useAppTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bg: tokens.status.success.subtle,
          border: tokens.status.success.border,
          color: tokens.status.success.main,
          dotColor: tokens.status.success.main,
        };
      case 'warning':
        return {
          bg: tokens.status.warning.subtle,
          border: tokens.status.warning.border,
          color: tokens.status.warning.main,
          dotColor: tokens.status.warning.main,
        };
      case 'error':
        return {
          bg: tokens.status.error.subtle,
          border: tokens.status.error.border,
          color: tokens.status.error.main,
          dotColor: tokens.status.error.main,
        };
      case 'info':
        return {
          bg: tokens.status.info.subtle,
          border: tokens.status.info.border,
          color: tokens.status.info.main,
          dotColor: tokens.status.info.main,
        };
      case 'neutral':
      default:
        return {
          bg: tokens.background.subtle,
          border: tokens.border.subtle,
          color: tokens.text.secondary,
          dotColor: tokens.text.secondary,
        };
    }
  };

  const v = getVariantStyles();
  const content = label || children;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: size === 'small' ? '2px 8px' : '3px 10px',
        borderRadius: '4px',
        fontSize: size === 'small' ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        backgroundColor: v.bg,
        border: `1px solid ${v.border}`,
        color: v.color,
        letterSpacing: '0.01em',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {showDot && (
        <span
          aria-hidden="true"
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: v.dotColor,
            flexShrink: 0,
          }}
        />
      )}
      <span>{content}</span>
    </span>
  );
}
