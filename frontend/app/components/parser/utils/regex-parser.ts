export class OcaFormatParser {
  static test(formatString: string, value: string | null | undefined): boolean {
    if (!formatString) return true;
    if (value === null || value === undefined) return true;
    
    try {
      const match = formatString.match(/^(.*?)(\/)?([gmiuy]*)$/);
      
      if (match) {
        const pattern = match[1].trim();
        const flags = match[3] || "";
        
        const regex = new RegExp(pattern, flags);
        return regex.test(String(value));
      }
      
      // Fallback: use entire string as pattern
      const regex = new RegExp(formatString);
      return regex.test(String(value));
      
    } catch (error) {
      console.warn(`Invalid regex pattern in OCA format: ${formatString}`, error);
      return true; 
    }
  }
}

