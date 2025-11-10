import { defaultTokens, ThemeTokens } from "./tokens.default";

export const clientBTokens: ThemeTokens = {
  ...defaultTokens,
  logoUrl: "/assets/clientB-logo.svg",
  colors: {
    primary: "#059669", // Emerald green primary
    secondary: "#10b981", // Light green secondary
    background: "#ffffff",
    text: "#064e3b", // Dark green text
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
      200: "#fef3c7", // Light yellow
      400: "#fde68a", // Medium yellow
    },
    green: {
      400: "#22c55e", // Bright green
    },
    red: {
      100: "#fee2e2", // Light red
    },
    dark: "#064e3b", // Dark green
    white: "#ffffff",
    black: "#000000",
  },
  fonts: {
    body: "Open Sans, sans-serif", // Different font for variety
    heading: "Montserrat, sans-serif",
  },
  buttonStyles: {
    light: "#ffffff",
    main: "#059669", // Emerald green
    dark: "#064e3b", // Dark green
    contrastText: "#ffffff",
  },
}; 