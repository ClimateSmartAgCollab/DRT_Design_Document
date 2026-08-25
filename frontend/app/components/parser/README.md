# OCA parser

Turns OCA (Overlays Capture Architecture) questionnaire JSON into `Step[]` the [dynamic form](../Form/README.md) can render. It is a library, not a route — requestor/owner pages and `FormWrapper` call it.

Global contributing and license: [root README](../../../../README.md).

## Public surface

```ts
import { parseJsonToFormStructure, FormStructureParser } from "@/app/components/parser";

const steps = parseJsonToFormStructure(questionnaireJson);
// optional: new FormStructureParser({ debug: true, defaultLanguage: "eng" }).parse(json)
```

`parseJsonToFormStructure` is the compatibility wrapper. Prefer it at call sites. Re-exported from `frontend/app/components/parser.ts` for older imports.

## How a parse runs

1. Normalize the bundle (`utils/helpers.ts`).
2. Extract presentations (`parsers/presentation-parser.ts`).
3. Build capture_base → children (`relationships/relationship-parser.ts`).
4. Snapshot overlays — labels, types, options (`overlays/overlay-extractor.ts`).
5. Build `Field` objects (`parsers/field-builder.ts`).

`DefaultEntityLocator` (`utils/entity-lookup.ts`) is the lookup strategy. Pass a different locator only if you are parsing a non-standard bundle shape.

## Extending

- **New overlay or field metadata** — extend `OverlaySnapshot` / `OverlayExtractor`, then map it in `FieldFactory.build()`.
- **New field type** — `FieldFactory` plus a matching branch in [`../Form/FieldRenderer.tsx`](../Form/FieldRenderer.tsx).
- **Debug a bad questionnaire** — `parseJsonToFormStructure(json, { debug: true })`.
