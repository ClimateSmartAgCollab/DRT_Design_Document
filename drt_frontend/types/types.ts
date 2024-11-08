// types.ts
export interface QuestionnaireAttributeLabels {
    [key: string]: string;
  }
  
  export interface QuestionnaireEntryCodes {
    [key: string]: string[];
  }
  
  export interface Questionnaire {
    type: string;
    oca_bundle: {
      bundle: {
        capture_base: {
          attributes: Record<string, string | string[]>;
        };
        overlays: {
          label: Array<{
            attribute_labels: QuestionnaireAttributeLabels;
          }>;
          entry_code?: Array<{
            attribute_entry_codes: Record<string, string[]>;
          }>;
          entry: Array<{
            attribute_entries: Record<string, Record<string, string>>;
          }>;
        };
      };
    };
  }
  