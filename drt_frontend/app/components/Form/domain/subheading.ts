// Formats rich subheading text consistently across the app.
export class SubheadingFormatter {
  static format(text?: string): string {
    if (!text) return "";
    const paragraphs = text.split("\n\n");
    const formatted = paragraphs.map((p) => {
      if (p.includes("•")) {
        const lines = p.split("\n");
        const formattedLines = lines.map((line) => {
          const t = line.trim();
          if (t.startsWith("•")) return `<li>${t.substring(1).trim()}</li>`;
          if (t.includes(":")) return `<strong>${t}</strong>`;
          return t;
        });
        const listItems = formattedLines.filter((l) => l.startsWith("<li>"));
        const other = formattedLines.filter((l) => !l.startsWith("<li>"));
        let result = "";
        if (other.length > 0) result += other.join("<br/>");
        if (listItems.length > 0) {
          result += `<ul style="margin: 8px 0; padding-left: 20px;">${listItems.join("")}</ul>`;
        }
        return result;
      }
      return p.trim().replace(/\n/g, "<br/>");
    });
    return formatted.join("<br/><br/>");
  }
}
