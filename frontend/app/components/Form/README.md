# Dynamic Form

Renders OCA questionnaires as a multi-page form: child/parent steps, per-page validation, and review/submit. UI stays in React; rules live in TypeScript domain classes under `domain/`.

This module is separate because requestor and owner flows share one renderer. Parsing OCA JSON into steps is **not** this package — that is [`../parser`](../parser/README.md).

Global contributing and license: [root README](../../../../README.md).

## Public surface

| Entry | Role |
| --- | --- |
| `Form.tsx` | Thin re-export of `FormWrapper` |
| `FormWrapper.tsx` | Orchestrates parse (if needed), `react-hook-form`, navigation, review |
| `FieldRenderer.tsx` | Maps a `ParsedField` to a MUI control |
| `context/FormDataContext.tsx` | In-memory store (sessionStorage sync) for parent/child answers |
| `hooks/useDynamicForm/` | Navigation, validation schema, submit mapping |

Typical use: pass `questionnaireJson` (or already-parsed `parsedSteps`) plus `onSave` / `onSubmit`. `FormWrapper` calls `parseJsonToFormStructure` when JSON is provided.

## Layout

```
Form/
  FormWrapper.tsx          # view orchestration
  FieldRenderer.tsx        # field type → control
  domain/                  # navigation, step tree, validation, references
  hooks/useDynamicForm/    # Yup schema, page navigation, OpenAIRE mapping
  context/                 # FormDataProvider
```

## Extending

**New field type**

1. Teach the parser to emit that type (`../parser/parsers/field-builder.ts`).
2. Add a branch in `FieldRenderer.tsx`.
3. Add Yup rules in `hooks/useDynamicForm/validationSchema.ts` (and `domain/validation.ts` if the rule is shared).

**New page or review behavior** — `hooks/useDynamicForm/usePageNavigation.ts` and `ReviewSection.tsx` / `ChildReview.tsx`. Keep components as views; put branching rules in `domain/`.
