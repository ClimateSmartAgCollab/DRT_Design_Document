"use client";

import React, { useState } from "react";
import { useTheme } from "../components/Form/hooks/useTheme";
import ThemeProvider from "../components/ThemeProvider";
import { defaultTokens } from "../../theme/tokens.default";
import { clientATokens } from "../../theme/tokens.clientA";
import { clientBTokens } from "../../theme/tokens.clientB";

// Available themes using actual token files
const availableThemes = {
  default: defaultTokens,
  clientA: clientATokens,
  clientB: clientBTokens,
};

function ThemeTestContent() {
  const [currentThemeName, setCurrentThemeName] = useState<keyof typeof availableThemes>("default");
  const theme = useTheme(currentThemeName);

  const getThemeDisplayName = (themeName: string) => {
    switch (themeName) {
      case "default": return "Default Theme (Red)";
      case "clientA": return "Client A Theme (Blue)";
      case "clientB": return "Client B Theme (Green)";
      default: return themeName;
    }
  };

  return (
    <div
      style={{
        fontFamily: theme.fonts.body,
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Theme Switcher */}
        <div style={{ 
          marginBottom: "2rem", 
          padding: "1rem", 
          border: `1px solid ${theme.colors.grey[300]}`,
          borderRadius: "8px",
          backgroundColor: theme.colors.white,
        }}>
          <h2 style={{ 
            fontFamily: theme.fonts.heading,
            color: theme.colors.primary,
            marginBottom: "1rem"
          }}>
            Theme Customization Demo
          </h2>
          <p style={{ marginBottom: "1rem", color: theme.colors.grey[600] }}>
            This demonstrates how easy it is to customize the entire form theme by simply changing the token files.
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {Object.keys(availableThemes).map((themeName) => (
              <button
                key={themeName}
                onClick={() => setCurrentThemeName(themeName as keyof typeof availableThemes)}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: currentThemeName === themeName 
                    ? theme.colors.primary 
                    : theme.colors.grey[300],
                  color: currentThemeName === themeName 
                    ? theme.colors.white 
                    : theme.colors.text,
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontFamily: theme.fonts.body,
                  fontWeight: "500",
                  transition: "all 0.2s ease-in-out",
                }}
              >
                {getThemeDisplayName(themeName)}
              </button>
            ))}
          </div>
        </div>

        {/* Current Theme Info */}
        <div style={{ 
          marginBottom: "2rem", 
          padding: "1.5rem", 
          backgroundColor: theme.colors.blue[100],
          borderRadius: "8px",
          border: `1px solid ${theme.colors.blue[200]}`,
        }}>
          <h3 style={{ 
            fontFamily: theme.fonts.heading,
            color: theme.colors.primary,
            marginBottom: "1rem"
          }}>
            Current Theme: {getThemeDisplayName(currentThemeName)}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Primary:</strong> <span style={{ color: theme.colors.primary }}>{theme.colors.primary}</span>
              </p>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Secondary:</strong> <span style={{ color: theme.colors.secondary }}>{theme.colors.secondary}</span>
              </p>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Body Font:</strong> {theme.fonts.body}
              </p>
              <p>
                <strong>Heading Font:</strong> {theme.fonts.heading}
              </p>
            </div>
            <div>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Background:</strong> {theme.colors.background}
              </p>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Text:</strong> {theme.colors.text}
              </p>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Logo:</strong> {theme.logoUrl}
              </p>
            </div>
          </div>
        </div>

        {/* Form Elements Demo */}
        <div style={{ 
          marginBottom: "2rem", 
          padding: "2rem", 
          border: `1px solid ${theme.colors.grey[300]}`,
          borderRadius: "8px",
          backgroundColor: theme.colors.white,
        }}>
          <h3 style={{ 
            fontFamily: theme.fonts.heading,
            color: theme.colors.primary,
            marginBottom: "1.5rem"
          }}>
            Form Elements Demo (All styled with current theme)
          </h3>
          
          <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            {/* Text Input */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: theme.colors.text }}>
                Text Input
              </label>
              <input
                type="text"
                placeholder="Enter some text..."
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: `1px solid ${theme.colors.grey[300]}`,
                  borderRadius: "6px",
                  fontFamily: theme.fonts.body,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.text,
                  transition: "border-color 0.2s ease-in-out",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.primary;
                  e.target.style.boxShadow = `0 0 0 1px ${theme.colors.primary}`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.colors.grey[300];
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Select */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: theme.colors.text }}>
                Select Dropdown
              </label>
              <select
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: `1px solid ${theme.colors.grey[300]}`,
                  borderRadius: "6px",
                  fontFamily: theme.fonts.body,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.text,
                  cursor: "pointer",
                }}
              >
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>

            {/* Textarea */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: theme.colors.text }}>
                Textarea
              </label>
              <textarea
                placeholder="Enter longer text..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: `1px solid ${theme.colors.grey[300]}`,
                  borderRadius: "6px",
                  fontFamily: theme.fonts.body,
                  backgroundColor: theme.colors.white,
                  color: theme.colors.text,
                  resize: "vertical",
                }}
              />
            </div>

            {/* Buttons */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: theme.colors.text }}>
                Buttons
              </label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.white,
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontFamily: theme.fonts.body,
                    fontWeight: "500",
                    transition: "opacity 0.2s ease-in-out",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                >
                  Primary
                </button>
                <button
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: theme.colors.grey[300],
                    color: theme.colors.text,
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontFamily: theme.fonts.body,
                    fontWeight: "500",
                    transition: "background-color 0.2s ease-in-out",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.grey[600]}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.grey[300]}
                >
                  Secondary
                </button>
                <button
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: theme.colors.green[400],
                    color: theme.colors.white,
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontFamily: theme.fonts.body,
                    fontWeight: "500",
                    transition: "opacity 0.2s ease-in-out",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                >
                  Success
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Color Palette Demo */}
        <div style={{ 
          marginBottom: "2rem", 
          padding: "2rem", 
          border: `1px solid ${theme.colors.grey[300]}`,
          borderRadius: "8px",
          backgroundColor: theme.colors.white,
        }}>
          <h3 style={{ 
            fontFamily: theme.fonts.heading,
            color: theme.colors.primary,
            marginBottom: "1.5rem"
          }}>
            Color Palette Demo
          </h3>
          
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ 
                width: "100%", 
                height: "60px", 
                backgroundColor: theme.colors.primary,
                borderRadius: "6px",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.colors.white,
                fontWeight: "500",
              }}>
                Primary
              </div>
              <small style={{ color: theme.colors.grey[600] }}>{theme.colors.primary}</small>
            </div>
            
            <div style={{ textAlign: "center" }}>
              <div style={{ 
                width: "100%", 
                height: "60px", 
                backgroundColor: theme.colors.secondary,
                borderRadius: "6px",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.colors.white,
                fontWeight: "500",
              }}>
                Secondary
              </div>
              <small style={{ color: theme.colors.grey[600] }}>{theme.colors.secondary}</small>
            </div>
            
            <div style={{ textAlign: "center" }}>
              <div style={{ 
                width: "100%", 
                height: "60px", 
                backgroundColor: theme.colors.blue[300],
                borderRadius: "6px",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.colors.text,
                fontWeight: "500",
              }}>
                Blue 300
              </div>
              <small style={{ color: theme.colors.grey[600] }}>{theme.colors.blue[300]}</small>
            </div>
            
            <div style={{ textAlign: "center" }}>
              <div style={{ 
                width: "100%", 
                height: "60px", 
                backgroundColor: theme.colors.green[400],
                borderRadius: "6px",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.colors.white,
                fontWeight: "500",
              }}>
                Green 400
              </div>
              <small style={{ color: theme.colors.grey[600] }}>{theme.colors.green[400]}</small>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ 
          padding: "1.5rem", 
          backgroundColor: theme.colors.pink[200],
          borderRadius: "8px",
          border: `1px solid ${theme.colors.pink[400]}`,
        }}>
          <h4 style={{ 
            fontFamily: theme.fonts.heading,
            color: theme.colors.text,
            marginBottom: "1rem"
          }}>
            How to Customize Themes
          </h4>
          <p style={{ marginBottom: "0.5rem", color: theme.colors.text }}>
            <strong>1.</strong> Create a new theme file (e.g., <code>tokens.clientB.ts</code>)
          </p>
          <p style={{ marginBottom: "0.5rem", color: theme.colors.text }}>
            <strong>2.</strong> Import and extend the default tokens
          </p>
          <p style={{ marginBottom: "0.5rem", color: theme.colors.text }}>
            <strong>3.</strong> Override colors, fonts, and other properties
          </p>
          <p style={{ color: theme.colors.text }}>
            <strong>4.</strong> The entire form automatically uses the new theme!
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ThemeTestPage() {
  return (
    <ThemeProvider>
      <ThemeTestContent />
    </ThemeProvider>
  );
} 