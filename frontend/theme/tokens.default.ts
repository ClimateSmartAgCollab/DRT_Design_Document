import type { StaticImageData } from "next/image";
import genomeCanLogo from "../app/assets/R.jpg";
import genomeOntarioLogo from "../app/assets/OIP.png";
import uogLogo from "../app/assets/UofG_Cornerstone_wTagline_blk_rgb.png";

export interface FooterLogo {
  src: StaticImageData;
  href: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface ThemeTokens {
  logoUrl: string; // header logo
  faviconUrl?: string;
  footerLogos: FooterLogo[]; // drop-in array for footer
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    // Additional color palette
    grey: {
      800: string;
      600: string;
      300: string;
      200: string;
    };
    blue: {
      900: string;
      700: string;
      300: string;
      200: string;
      100: string;
    };
    pink: {
      200: string;
      400: string;
    };
    green: {
      400: string;
    };
    red: {
      100: string;
    };
    dark: string;
    white: string;
    black: string;
  };
  fonts: {
    body: string;
    heading: string;
  };
  buttonStyles: {
    light: string;
    main: string;
    dark: string;
    contrastText: string;
  };
}

export const defaultTokens: ThemeTokens = {
  logoUrl: "/assets/CS-DCC_Logo-EN_Colour.jpg",
  faviconUrl: "/favicon.ico",
  footerLogos: [
    {
      src: genomeCanLogo,
      href: "https://genomecanada.ca/",
      alt: "Genome Canada",
      width: 100,
      height: 50,
    },
    {
      src: genomeOntarioLogo,
      href: "https://ontariogenomics.ca/",
      alt: "Genome Ontario",
      width: 100,
      height: 100,
    },
    {
      src: uogLogo,
      href: "https://uoguelph.ca/",
      alt: "U of Guelph",
      width: 200,
      height: 190,
    },
  ],
  colors: {
    primary: "rgb(70, 160, 35)", 
    secondary: "rgb(55, 125, 28)",
    background: "#ffffff", // CustomPalette.WHITE
    text: "#353535", 
    grey: {
      800: "#4f4f4f", // CustomPalette.GREY_800
      600: "#787878", // CustomPalette.GREY_600
      300: "#c4c4c4", // CustomPalette.GREY_300
      200: "#efefef", // CustomPalette.GREY_200
    },
    blue: {
      900: "#001785", // CustomPalette.BLUE_900
      700: "#1e35a5", // CustomPalette.BLUE_700
      300: "#717ecf", // CustomPalette.BLUE_300
      200: "#c2c7eb", // CustomPalette.BLUE_200
      100: "#f2f3fb", // CustomPalette.BLUE_100
    },
    pink: {
      200: "#fff4f5", // CustomPalette.PINK_200
      400: "#ffd1d5", // CustomPalette.PINK_400
    },
    green: {
      400: "rgb(70, 160, 35)", 
    },
    red: {
      100: "#ffc2d2", // CustomPalette.RED_100
    },
    dark: "rgb(55, 125, 28)", 
    white: "#FFFFFF", // CustomPalette.WHITE
    black: "#000", // CustomPalette.BLACK
  },
  fonts: {
    body: "'Inter', 'Segoe UI', Tahoma, sans-serif", 
    heading: "'Inter', 'Segoe UI', Tahoma, sans-serif",
  },
  buttonStyles: {
    light: "#FFFFFF", // CustomPalette.WHITE
    main: "rgb(70, 160, 35)", 
    dark: "rgb(55, 125, 28)", 
    contrastText: "#FFFFFF", // CustomPalette.WHITE
  },
};
