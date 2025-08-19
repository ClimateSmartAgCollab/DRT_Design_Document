# OCA Parser Module

A clean, modular TypeScript parser for OCA metadata that transforms JSON into structured, render-ready form steps.
Now with a testable OOP design.

---
## ✨ Highlights

- OOP core (extractors, builders, parsers) with **dependency injection**
- **Backward-compatible** procedural functions for gradual migration
- Small, pure, **unit-testable** modules (no React in the core)
---

## Architecture

The parser is organized into logical modules for maintainability and testability:

```
parser/
├─ index.ts                         # Orchestrator + legacy shim
├─ fields/
│  └─ field-factory.ts             # FieldFactory / FieldValidator / FieldDefaults
├─ overlays/
│  └─ overlay-extractor.ts         # OverlayExtractor / OverlaySnapshot
├─ relationships/
│  └─ relationship-parser.ts       # RelationshipGraphBuilder / RelationshipGraph
├─ parsers/
│  ├─ presentation-parser.ts       # PresentationParser / PresentationsExtractor / Validator
│  └─ (legacy) field-builder.ts    # Thin wrappers → FieldFactory
├─ utils/
│  ├─ helpers.ts                   # Arrays, Numbers, Lang/LanguageMap, Normalizers, asRoot
│  └─ entity-lookup.ts             # EntityLocator, DefaultEntityLocator + shims
├─ types/
│  └─ parser-types.ts              # DTOs (OverlayData, StepMeta, RelationshipMap, …)
```

## 🚀 Quick Start

```typescript
import { FormStructureParser } from './parser';

const parser = new FormStructureParser({ debug: true, defaultLanguage: 'eng' });
const steps = parser.parse(metadataJson);

steps.forEach(step => {
  console.log(step.id, step.pages.length);
});
```