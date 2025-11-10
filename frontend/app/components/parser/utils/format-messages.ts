// Human-readable error messages for OCA format patterns

export class FormatMessageGenerator {
  static getErrorMessage(fieldType: string, formatPattern?: string): string {
    if (!formatPattern) {
      return this.getDefaultMessage(fieldType);
    }

    // MIME type patterns (for Binary fields) - check FIRST before lowercasing
    if (fieldType === 'Binary' || fieldType === 'Array[Binary]') {
      if (formatPattern.includes('application/pdf')) {
        return 'Please upload a PDF file';
      }
      if (formatPattern.includes('application/json')) {
        return 'Please upload a JSON file';
      }
      if (formatPattern.includes('image/')) {
        return 'Please upload an image file';
      }
      if (formatPattern.includes('application/vnd') && formatPattern.includes('spreadsheet')) {
        return 'Please upload an Excel file';
      }
      if (formatPattern.includes('application/msword') || formatPattern.includes('vnd.openxmlformats-officedocument.wordprocessing')) {
        return 'Please upload a Word document';
      }
      return 'Please upload a file of the correct type';
    }

    // Check for common patterns and return friendly messages
    const pattern = formatPattern.toLowerCase();

    // Email patterns
    if (pattern.includes('@') || pattern.includes('email')) {
      return 'Please enter a valid email address';
    }

    // Year only - check before full date pattern
    if (pattern.match(/^\^?\(\\d\{4\}\)\$?$/) || pattern === '^(\\d{4})$') {
      return 'Please enter a 4-digit year (e.g., 2024)';
    }

    // Date patterns
    if (pattern.includes('\\d{4}') && pattern.includes('\\d{2}')) {
      return 'Please enter a valid date (format: YYYY-MM-DD)';
    }

    // Time patterns
    if (pattern.includes(':') && pattern.includes('[0-5]')) {
      return 'Please enter a valid time (format: HH:MM:SS)';
    }

    // Numeric patterns
    if (fieldType === 'Numeric' || fieldType === 'Array[Numeric]') {
      if (pattern.includes('\\d+') && !pattern.includes('\\.')) {
        return 'Please enter a whole number (no decimals)';
      }
      if (pattern.includes('\\.')) {
        return 'Please enter a valid number (decimals allowed)';
      }
      if (pattern.match(/^\^?\[1-9\]/)) {
        return 'Please enter a positive number (greater than 0)';
      }
      return 'Please enter a valid number';
    }

    // Phone number patterns
    if (pattern.includes('\\d{3}') && pattern.includes('-')) {
      return 'Please enter a valid phone number (format: XXX-XXX-XXXX)';
    }

    // URL patterns
    if (pattern.includes('https?://') || pattern.includes('url')) {
      return 'Please enter a valid URL';
    }

    // Postal/ZIP code patterns
    if (pattern.includes('[a-z]\\d[a-z]') || pattern.includes('postal')) {
      return 'Please enter a valid postal code';
    }
    if (pattern.match(/\\d\{5\}/)) {
      return 'Please enter a valid ZIP code';
    }

    // Length constraints
    const maxLengthMatch = pattern.match(/\{0,(\d+)\}/);
    if (maxLengthMatch) {
      return `Maximum ${maxLengthMatch[1]} characters allowed`;
    }

    // Default fallback
    return this.getDefaultMessage(fieldType);
  }

  private static getDefaultMessage(fieldType: string): string {
    switch (fieldType) {
      case 'Text':
      case 'Array[Text]':
        return 'Please enter valid text';
      case 'Numeric':
      case 'Array[Numeric]':
        return 'Please enter a valid number';
      case 'DateTime':
      case 'Array[DateTime]':
        return 'Please enter a valid date/time';
      case 'Boolean':
      case 'Array[Boolean]':
        return 'Please select a valid option';
      case 'Binary':
      case 'Array[Binary]':
        return 'Please upload a valid file';
      default:
        return 'Invalid value';
    }
  }
}

