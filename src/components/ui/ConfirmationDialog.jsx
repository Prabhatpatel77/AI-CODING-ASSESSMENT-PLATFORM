import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';
import { AlertCircle } from 'lucide-react';
import { useAppTheme } from '../../theme/ThemeContext.jsx';

export default function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary', // 'primary' | 'danger'
  loading = false,
}) {
  const { tokens } = useAppTheme();

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
    >
      <DialogTitle id="confirmation-dialog-title" sx={{ pb: 1, pt: 2.5, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {confirmVariant === 'danger' && (
            <AlertCircle size={20} color={tokens.status.error.main} />
          )}
          <Typography variant="h6" fontWeight={700} component="span">
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent id="confirmation-dialog-description" sx={{ py: 1.5, px: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {description}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 2, gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onClose}
          disabled={loading}
          sx={{ borderColor: tokens.border.strong }}
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={onConfirm}
          disabled={loading}
          sx={{
            bgcolor:
              confirmVariant === 'danger'
                ? tokens.status.error.main
                : tokens.primary.main,
            '&:hover': {
              bgcolor:
                confirmVariant === 'danger'
                  ? '#e11d48'
                  : tokens.primary.hover,
            },
          }}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {loading ? 'Processing...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
