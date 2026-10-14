import React from 'react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';

export default function TabNavigation({
  tabs = [],
  activeTab,
  onChange,
  size = 'medium', // 'small' | 'medium'
}) {
  const { tokens } = useAppTheme();

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px',
        borderRadius: '6px',
        backgroundColor: tokens.background.default,
        border: `1px solid ${tokens.border.subtle}`,
        gap: '2px',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: size === 'small' ? '3px 8px' : '5px 12px',
              fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
              fontWeight: isActive ? 600 : 500,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: isActive ? tokens.background.paper : 'transparent',
              color: isActive ? tokens.text.primary : tokens.text.secondary,
              boxShadow: isActive ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: isActive ? tokens.primary.main : tokens.text.secondary,
                }}
              >
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.6875rem',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  backgroundColor: tokens.background.subtle,
                  color: tokens.text.secondary,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
