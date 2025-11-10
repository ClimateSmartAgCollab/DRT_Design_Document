// types/JSONData.ts
export interface JSONData {
    d: string;
    type: string;
    oca_bundle: OcaBundle;
    extensions: Extensions;
  }
  
  interface OcaBundle {
    bundle: Bundle;
    dependencies: Dependency[];
  }
  
  interface Bundle {
    v: string;
    d: string;
    capture_base: CaptureBase;
    overlays: Overlays;
  }
  
  interface CaptureBase {
    d: string;
    type: string;
    classification: string;
    attributes: Record<string, string>;
    flagged_attributes: any[];
  }
  
  interface Overlays {
    character_encoding: OverlayDetail;
    format: OverlayDetail;
    meta: Meta[];
    label: Label[];
    entry_code?: EntryCode;
  }
  
  interface EntryCode {
    d: string;
    type: string;
    capture_base: string;
    attribute_entry_codes: Record<string, string[]>;
  }

  interface OverlayDetail {
    d: string;
    type: string;
    capture_base: string;
    attribute_character_encoding: Record<string, string>;
  }
  
  interface Meta {
    d: string;
    language: string;
    type: string;
    capture_base: string;
    description: string;
    name: string;
  }
  
  interface Label {
    d: string;
    language: string;
    type: string;
    capture_base: string;
    attribute_labels: Record<string, string>;
  }
  
  interface Dependency {
    v: string;
    d: string;
    capture_base: CaptureBase;
    overlays: Overlays;
  }
  
  interface Extensions {
    presentation: Presentation[];
  }
  
  interface Presentation {
    d: string;
    type: string;
    bundle_base: string;
    l: string[];
    p: PresentationDetail[];
    po: string[];
    pl: Record<string, Record<string, string>>[];
    i: PresentationInput[];
  }
  
  interface PresentationDetail {
    ns: string;
    ao: string[];
  }
  
  interface PresentationInput {
    m: string;
    c: string;
    a: Record<string, { t: string; va?: string }>;
  }
  