import { defaultTokens, ThemeTokens } from "./tokens.default";

export const clientATokens: ThemeTokens = {
  ...defaultTokens,
  logoUrl: "/assets/clientA-logo.svg",
  colors: {
    primary: "#1e40af", // Deep blue primary
    secondary: "#3b82f6", // Bright blue secondary
    background: "#ffffff",
    text: "#1f2937", // Dark blue-grey text
    grey: {
      800: "#374151", // Blue-tinted dark grey
      600: "#6b7280", // Blue-tinted medium grey
      300: "#d1d5db", // Light grey
      200: "#f3f4f6", // Very light grey
    },
    blue: {
      900: "#1e3a8a", // Very dark blue
      700: "#1d4ed8", // Dark blue
      300: "#93c5fd", // Light blue
      200: "#bfdbfe", // Very light blue
      100: "#dbeafe", // Pale blue
    },
    pink: {
      200: "#fef3c7", // Light yellow (replacing pink for blue theme)
      400: "#fde68a", // Medium yellow
    },
    green: {
      400: "#10b981", // Emerald green (good with blue)
    },
    red: {
      100: "#fee2e2", // Light red
    },
    dark: "#1e3a8a", // Dark blue
    white: "#ffffff",
    black: "#000000",
  },
  fonts: {
    body: "Inter, sans-serif", // Different font for variety
    heading: "Inter, sans-serif",
  },
  buttonStyles: {
    light: "#ffffff",
    main: "#1e40af", // Deep blue
    dark: "#1e3a8a", // Darker blue
    contrastText: "#ffffff",
  },
};
