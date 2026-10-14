import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  shortcutKey = '⌘K',
  autoFocus = false,
  fullWidth = true,
  disabled = false,
}) {
  const { tokens } = useAppTheme();
  const inputRef = useRef(null);

  const handleClear = () => {
    if (onClear) onClear();
    else if (onChange) onChange({ target: { value: '' } });
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      <Search
        size={15}
        style={{
          position: 'absolute',
          left: '10px',
          color: tokens.text.secondary,
          pointerEvents: 'none',
        }}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        style={{
          width: '100%',
          paddingLeft: '32px',
          paddingRight: value ? '56px' : '48px',
          paddingTop: '7px',
          paddingBottom: '7px',
          fontSize: '0.8125rem',
          borderRadius: '6px',
          backgroundColor: tokens.background.paper,
          color: tokens.text.primary,
          border: `1px solid ${tokens.border.strong}`,
          outline: 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = tokens.border.focus;
          e.target.style.boxShadow = `0 0 0 1px ${tokens.border.focus}`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = tokens.border.strong;
          e.target.style.boxShadow = 'none';
        }}
      />

      <div
        style={{
          position: 'absolute',
          right: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {value && (
          <button
            type="button"
            onClick={handleClear}
            title="Clear search"
            style={{
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: tokens.text.secondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
          >
            <X size={14} />
          </button>
        )}

        {shortcutKey && !value && (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              fontFamily: 'monospace',
              padding: '2px 5px',
              borderRadius: '3px',
              backgroundColor: tokens.background.subtle,
              color: tokens.text.secondary,
              border: `1px solid ${tokens.border.subtle}`,
              lineHeight: 1,
            }}
          >
            {shortcutKey}
          </span>
        )}
      </div>
    </div>
  );
}
