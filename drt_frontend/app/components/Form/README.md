
# Dynamic Form (OO Domain + React MVVM)

This module implements a dynamic, multi-page form with **child/parent steps**, **validation**, and **review/submit** flows.
UI is kept as **pure React views**, while business rules live in **TypeScript domain classes**.

* **Architecture:** Clean/Hexagonal + MVVM (Presentation Model)
* **Key ideas:** Components render; hooks orchestrate; **domain classes** encapsulate rules; context acts as an **in-memory repository**.

---

## Architectural Overview

### Clean/Hexagonal + MVVM

* **View (React):** `FormWrapper`, `FieldRenderer`, `ReviewSection`, `Sidebar`, etc.
* **View-Model / Controllers (Hooks):** `useDynamicFormCore`, `usePageNavigation`, `useHandleNavigate`
* **Domain Services (OO):** `ReferenceFieldController`, `StepTreeBuilder`, `SubheadingFormatter`, `DateTimeFormatResolver`, `OptionsMapper`, `FormHeaderVM`, `ChildReviewPresenter`, `StepIndexResolver`
* **Repository:** `FormDataContext` (CRUD APIs, in-memory store with sessionStorage sync)

---

## Design Patterns (where they appear)

* **Repository:** `FormDataContext` (CRUD + queries for parent/child)
* **Facade / Orchestrator:** `useDynamicFormCore`, `ReferenceFieldController`
* **Mediator:** `usePageNavigation` (coordinates validation + navigation)
* **Strategy:** validation rules (`validation.ts`, `validationSchema.ts`), input format mapping (`DateTimeFormatResolver`)
* **Builder:** `validationSchema.ts` builds nested Yup schema
* **Composite:** Steps → Pages → Sections → Fields (`steps.ts`, `step-tree.ts`)
* **Adapter:** `FieldRenderer` adapts domain fields to `react-hook-form`
* **Data Mapper (ACL):** `mapping.ts` → OpenAIRE `Submission`
* **Null Object:** safe no-ops in `useDynamicFormCore` when `parsedSteps` missing
* **Observer:** React state/contexts notify views
* **Singleton (scoped):** Provider-scoped store via `FormDataProvider`

---

