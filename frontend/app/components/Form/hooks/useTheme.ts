import { useMemo } from "react";
import { defaultTokens, ThemeTokens } from "../../../../theme/tokens.default";
import { clientATokens } from "../../../../theme/tokens.clientA";
import { clientBTokens } from "../../../../theme/tokens.clientB";

// Available themes
const themes = {
  default: defaultTokens,
  clientA: clientATokens,
  clientB: clientBTokens,
};

export function useTheme(themeName: keyof typeof themes = "default"): ThemeTokens {
  return useMemo(() => themes[themeName], [themeName]);
}

// Helper function to get CSS custom properties for the theme
export function useThemeCSS(themeName: keyof typeof themes = "default"): string {
  const theme = useTheme(themeName);
  
  return useMemo(() => `
    :root {
      /* Primary Colors */
      --color-primary: ${theme.colors.primary};
      --color-secondary: ${theme.colors.secondary};
      --color-background: ${theme.colors.background};
      --color-text: ${theme.colors.text};
      
      /* Grey Scale */
      --color-grey-800: ${theme.colors.grey[800]};
      --color-grey-600: ${theme.colors.grey[600]};
      --color-grey-300: ${theme.colors.grey[300]};
      --color-grey-200: ${theme.colors.grey[200]};
      
      /* Blue Scale */
      --color-blue-900: ${theme.colors.blue[900]};
      --color-blue-700: ${theme.colors.blue[700]};
      --color-blue-300: ${theme.colors.blue[300]};
      --color-blue-200: ${theme.colors.blue[200]};
      --color-blue-100: ${theme.colors.blue[100]};
      
      /* Other Colors */
      --color-pink-200: ${theme.colors.pink[200]};
      --color-pink-400: ${theme.colors.pink[400]};
      --color-green-400: ${theme.colors.green[400]};
      --color-red-100: ${theme.colors.red[100]};
      --color-dark: ${theme.colors.dark};
      --color-white: ${theme.colors.white};
      --color-black: ${theme.colors.black};
      
      /* Fonts */
      --font-body: ${theme.fonts.body};
      --font-heading: ${theme.fonts.heading};
      
      /* Button Styles */
      --button-light: ${theme.buttonStyles.light};
      --button-main: ${theme.buttonStyles.main};
      --button-dark: ${theme.buttonStyles.dark};
      --button-contrast-text: ${theme.buttonStyles.contrastText};
    }
  `, [theme]);
}
