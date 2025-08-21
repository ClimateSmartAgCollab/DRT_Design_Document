export class FormHeaderVM {
  constructor(private readonly formTitle: Record<string, string>) {}

  title(lang: string) {
    return this.formTitle[lang] || this.formTitle.eng || "";
  }

  languages() {
    return [
      { code: "eng", label: "English" },
      { code: "fra", label: "Français" },
    ];
  }
}
