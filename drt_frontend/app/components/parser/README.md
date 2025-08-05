# OCA Parser Module

A clean, modular TypeScript parser for OCA metadata that transforms JSON structures into organized form data ready for rendering.

## Architecture

The parser is organized into logical modules for maintainability and testability:

```
parser/
├── index.ts                 # Main entry point and orchestration
├── types/
│   └── parser-types.ts      # TypeScript type definitions
├── utils/
│   ├── helpers.ts           # General utility functions
│   └── entity-lookup.ts     # Entity search and lookup utilities
├── relationships/
│   └── relationship-parser.ts # Entity relationship parsing
├── overlays/
│   └── overlay-extractor.ts # Overlay data extraction
├── parsers/
│   ├── presentation-parser.ts # ADC form presentation parsing
│   └── field-builder.ts     # Field object construction
└── tests/
    ├── helpers.test.ts      # Unit tests for utilities
    └── entity-lookup.test.ts # Unit tests for entity lookup
```

## 🚀 Quick Start

```typescript
import { parseJsonToFormStructure } from './parser';

// Parse OCA metadata
const steps = parseJsonToFormStructure(metadataJson, {
  debug: true,
  defaultLanguage: 'eng'
});

// Use the parsed steps in form components
steps.forEach(step => {
  console.log(`Step: ${step.id}`);
  step.pages.forEach(page => {
    console.log(`  Page: ${page.pageKey}`);
  });
});
```

## 📋 API Reference

### Main Function

#### `parseJsonToFormStructure(metadata, config?)`

Transforms OCA metadata JSON into structured Step objects.

**Parameters:**
- `metadata` (any): The OCA metadata JSON to parse
- `config` (ParserConfig, optional): Configuration options

**Returns:** `Step[]` - Array of parsed form steps

### Core Modules

#### Utils

**`utils/helpers.ts`**
- `asRoot(json)`: Type assertion for Root type
- `safeArray(val)`: Safely convert to array
- `langPick(obj, key)`: Extract language-specific values
- `numberOr(val, fallback)`: Convert string to number with fallback
- `normalizeEntryCodes(dependencies)`: Normalize entry code structures

**`utils/entity-lookup.ts`**
- `findBundleByCaptureBase(captureBase, bundle, dependencies)`: Find entity by capture base
- `getInteractionArgs(captureBase, presentations)`: Get interaction arguments
- `entityExists(captureBase, bundle, dependencies)`: Check if entity exists
- `getAllCaptureBases(bundle, dependencies)`: Get all capture base IDs

#### Relationships

**`relationships/relationship-parser.ts`**
- `parseRelationships(bundle, dependencies, presentation)`: Parse entity relationships
- `getParentEntities(relationships)`: Get all parent entities
- `getChildEntities(relationships, parentId)`: Get children of specific parent
- `validateRelationships(relationships)`: Validate relationship structure

#### Overlays

**`overlays/overlay-extractor.ts`**
- `getOverlayData(captureBase, bundle, dependencies, presentations)`: Extract overlay data
- `getStepMeta(captureBase, bundle, dependencies)`: Extract step metadata
- `getFieldType(fieldId, types, options)`: Determine field type
- `createFieldLabels(fieldId, labels)`: Create field labels
- `createFieldOptions(fieldId, options)`: Create field options

#### Parsers

**`parsers/presentation-parser.ts`**
- `parsePresentation(presentation, labels, fields)`: Parse presentation to pages
- `extractPresentations(metadata)`: Extract presentations from metadata
- `validatePresentation(presentation)`: Validate presentation structure
- `getPresentationFieldIds(presentation)`: Get all field IDs from presentation

**`parsers/field-builder.ts`**
- `buildField(fieldId, overlayData, refsMap)`: Build complete Field object
- `buildFields(fieldIds, overlayData, refsMap)`: Build multiple fields
- `validateField(field)`: Validate field structure
- `isReferenceField(field)`: Check if field is reference type

## 🔄 Data Flow

1. **Input Validation**: Validate and normalize input metadata
2. **Presentation Extraction**: Extract presentations from both old and new ADC structures
3. **Relationship Parsing**: Build relationship trees between entities
4. **Overlay Extraction**: Extract labels, options, types, and validation rules
5. **Field Building**: Construct Field objects with proper validation
6. **Page Generation**: Create pages and sections from presentations
7. **Step Assembly**: Combine all data into Step objects
