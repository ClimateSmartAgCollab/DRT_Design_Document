// drt_frontend/app/components/Form/constants/field-styles.ts
import { SxProps, Theme } from "@mui/material";

/**
 * Standard text field styling
 */
export const textFieldStyle: SxProps<Theme> = {
  "& .MuiInputBase-root": {
    fontSize: "0.875rem",
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.875rem",
  },
};

/**
 * Chip container styling for multi-value fields
 */
export const chipContainerStyle: SxProps<Theme> = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  mb: 1,
  minHeight: "32px",
};

/**
 * Disabled chip styling
 */
export const disabledChipStyle: SxProps<Theme> = {
  opacity: 0.6,
  "& .MuiChip-deleteIcon": {
    opacity: 0.5,
  },
};

/**
 * Disabled radio/checkbox styling
 */
export const disabledRadioCheckboxStyle: SxProps<Theme> = {
  opacity: 0.6,
};

/**
 * Helper text styling
 */
export const helperTextStyle: SxProps<Theme> = {
  fontSize: "0.75rem",
  color: "text.secondary",
  mt: 0.5,
  display: "block",
};

/**
 * Caption text styling
 */
export const captionStyle: SxProps<Theme> = {
  fontSize: "0.75rem",
  color: "grey.500",
  mt: 0.5,
  display: "block",
  fontStyle: "italic",
};

/**
 * File upload area styling
 */
export const fileUploadStyle: SxProps<Theme> = {
  border: "2px dashed",
  borderColor: "grey.400",
  borderRadius: 1,
  p: 2,
  textAlign: "center",
  backgroundColor: "grey.100",
  cursor: "pointer",
  transition: "all 0.2s",
  "&:hover": {
    borderColor: "primary.main",
    backgroundColor: "grey.50",
  },
};

/**
 * Required field indicator styling
 */
export const requiredIndicatorStyle: SxProps<Theme> = {
  color: "error.main",
  fontWeight: 600,
  fontSize: "0.75rem",
  display: "block",
  mb: 0.5,
};

/**
 * Error message styling
 */
export const errorMessageStyle: SxProps<Theme> = {
  color: "error.main",
  fontSize: "0.75rem",
  mt: 0.5,
  display: "block",
};

/**
 * Owner comment styling
 */
export const ownerCommentStyle: SxProps<Theme> = {
  mt: 1,
  p: 1.5,
  borderRadius: 1,
  backgroundColor: "pink.50",
  borderLeft: "3px solid",
  borderColor: "pink.400",
  fontSize: "0.875rem",
};

