import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Stack,
  Divider,
} from '@mui/material';
import { Settings } from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';

export default function EditorPreferencesDialog({
  open,
  onClose,
  preferences,
  onChangePreferences,
}) {
  const { tokens } = useAppTheme();

  const handleFontSizeChange = (e) => {
    onChangePreferences({ ...preferences, fontSize: Number(e.target.value) });
  };

  const handleTabSizeChange = (e) => {
    onChangePreferences({ ...preferences, tabSize: Number(e.target.value) });
  };

  const handleMinimapToggle = (e) => {
    onChangePreferences({ ...preferences, minimap: e.target.checked });
  };

  const handleWordWrapToggle = (e) => {
    onChangePreferences({ ...preferences, wordWrap: e.target.checked });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: tokens.background.paper,
          border: `1px solid ${tokens.border.subtle}`,
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Settings size={18} color={tokens.primary.main} />
        <Typography variant="h4" fontWeight={700}>
          Editor Preferences
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2.5}>
          {/* Font Size */}
          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              Font Size
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={preferences.fontSize || 14}
              onChange={handleFontSizeChange}
            >
              <MenuItem value={12}>12 px (Compact)</MenuItem>
              <MenuItem value={14}>14 px (Default)</MenuItem>
              <MenuItem value={16}>16 px (Medium)</MenuItem>
              <MenuItem value={18}>18 px (Large)</MenuItem>
            </TextField>
          </Box>

          {/* Tab Size */}
          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              Tab Indentation Size
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={preferences.tabSize || 2}
              onChange={handleTabSizeChange}
            >
              <MenuItem value={2}>2 Spaces</MenuItem>
              <MenuItem value={4}>4 Spaces</MenuItem>
            </TextField>
          </Box>

          <Divider sx={{ borderColor: tokens.border.subtle }} />

          {/* Minimap Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(preferences.minimap)}
                onChange={handleMinimapToggle}
                color="primary"
                size="small"
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Code Minimap
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Display an overview outline of the file on the right side
                </Typography>
              </Box>
            }
          />

          {/* Word Wrap Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(preferences.wordWrap)}
                onChange={handleWordWrapToggle}
                color="primary"
                size="small"
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Word Wrapping
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Wrap long lines automatically to avoid horizontal scrolling
                </Typography>
              </Box>
            }
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1, borderTop: `1px solid ${tokens.border.subtle}` }}>
        <Button onClick={onClose} variant="contained" size="small">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
