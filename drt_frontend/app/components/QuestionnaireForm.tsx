// components/QuestionnaireForm.tsx
'use client'

import React from 'react'
import { parseJsonToFormStructure } from '../components/parser'
import { sortStepsByReferences } from '../components/Form/hooks/useDynamicForm'
import DateTimeField from '../components/Form/DateTimeField'
import styles from '../components/Form/Form.module.css'
import Footer from '../../Footer/footer'

const unsorted = parseJsonToFormStructure()
const parsedSteps = sortStepsByReferences(unsorted)

interface QuestionnaireFormProps {
  questionnaire: any
  answers: Record<string, any>
  handleInputChange: (questionId: string, value: any) => void
  onSave: () => Promise<void> | void
  onSubmit: () => Promise<void> | void
}

export default function QuestionnaireForm({
  questionnaire,
  answers,
  handleInputChange,
  onSave,
  onSubmit,
}: QuestionnaireFormProps) {
  const [reviewMode, setReviewMode] = React.useState(false)
  const language = questionnaire.language || 'eng'

  // Build a nested formData structure so the review block can read it
  const formData: Record<string, Record<string, any>> = {}
  parsedSteps.forEach(step => {
    formData[step.id] = {}
    step.pages.forEach(page =>
      page.sections.forEach(section =>
        section.fields.forEach(field => {
          formData[step.id][field.id] = answers[field.id]
        })
      )
    )
  })
  const parentFormData = {} as any // flat, no nested references

  // ---- REVIEW SCREEN ----
  if (reviewMode) {
    // same logic you had to filter out child‐only steps
    const childStepIds = new Set<string>()
    parsedSteps.forEach(step =>
      step.pages.forEach(page =>
        page.sections.forEach(section =>
          section.fields.forEach(field => {
            if (field.ref) childStepIds.add(field.ref)
          })
        )
      )
    )
    const parentStepsForReview = parsedSteps.filter(
      step => !childStepIds.has(step.id)
    )

    return (
      <section className={`${styles.formLayout} ${styles.fullPageReview}`}>
        <header className={`${styles.header} border-b pb-4`}>
          <h1 className="mb-2 text-center text-3xl font-bold">
            {questionnaire.title?.[language] ||
              questionnaire.title?.eng ||
              'Review Your Responses'}
          </h1>
          <p className="text-center text-lg text-gray-600">
            Please review your responses below.
          </p>
        </header>

        <main className={`${styles.mainContent} p-4`}>
          <div className="space-y-6">
            {parentStepsForReview.map((step: any) => (
              <div key={step.id} className="mb-6">
                <h2 className="text-2xl font-bold">
                  {step.names[language] || step.names.eng}
                </h2>
                {step.pages.map((page: any) => (
                  <div
                    key={page.pageKey}
                    className="mb-4 border-l-2 border-gray-300 pl-4"
                  >
                    <h3 className="text-xl font-semibold">
                      {page.pageLabel[language] || page.pageLabel.eng}
                    </h3>
                    {page.sections.map((section: any) => (
                      <div
                        key={section.sectionKey}
                        className="mb-4 border-l-2 border-gray-200 pl-4"
                      >
                        <h4 className="text-lg font-medium">
                          {section.sectionLabel[language] ||
                            section.sectionLabel.eng}
                        </h4>
                        {section.fields.map((field: any) => {
                          const answer =
                            formData[step.id]?.[field.id] ?? '—'
                          return (
                            <div key={field.id} className="mb-2">
                              <label className="block text-sm font-semibold text-gray-800">
                                {field.labels[language]?.[field.id] ||
                                  field.labels.eng?.[field.id] ||
                                  field.id}
                              </label>
                              <div className="mt-1 break-words rounded border bg-gray-50 p-2 text-gray-900">
                                {Array.isArray(answer)
                                  ? answer.join(', ')
                                  : answer?.toString() || (
                                      <span className="text-gray-500">
                                        No response provided
                                      </span>
                                    )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center space-x-4">
            <button
              type="button"
              onClick={() => setReviewMode(false)}
              className="rounded-lg bg-blue-500 px-6 py-2 font-semibold text-white shadow hover:bg-blue-600"
            >
              Back to Form
            </button>
            <button
              type="button"
              onClick={() => {
                onSubmit()
              }}
              className="rounded-lg bg-green-500 px-6 py-2 font-semibold text-white shadow hover:bg-green-600"
            >
              Submit
            </button>
          </div>
        </main>

        <Footer />
      </section>
    )
  }

  // ---- INPUT FORM SCREEN ----
  // flatten all fields, preserving step/section labels
  const allFields = parsedSteps.flatMap(step =>
    step.pages.flatMap(page =>
      page.sections.flatMap(section =>
        section.fields.map(field => ({
          stepId: step.id,
          stepName: step.names[language] || step.names.eng,
          sectionLabel:
            section.sectionLabel[language] || section.sectionLabel.eng,
          field,
        }))
      )
    )
  )

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">
        {questionnaire.title?.[language] ||
          questionnaire.title?.eng ||
          'Fill Questionnaire'}
      </h1>

      {allFields.map(({ stepId, stepName, sectionLabel, field }) => {
        const fieldValue = answers[field.id]
        return (
          <div
            key={`${stepId}-${field.id}`}
            className="space-y-2 border-b pb-4"
          >
            <h2 className="text-xl font-semibold">{stepName}</h2>
            <h3 className="text-lg font-medium">{sectionLabel}</h3>

            <label className="block text-gray-700 font-medium mb-1">
              {field.labels[language]?.[field.id] ||
                field.labels.eng?.[field.id] ||
                field.id}
            </label>

            {/* DateTime */}
            {field.type === 'DateTime' && (
              <DateTimeField
                field={field}
                format={field.validation?.format || 'YYYY-MM-DD'}
                fieldValue={fieldValue}
                registerFieldRef={() => {}}
                handleFieldChange={(v: any) =>
                  handleInputChange(field.id, v)
                }
                saveCurrentPageData={() => onSave()}
              />
            )}

            {/* Radio */}
            {field.type === 'radio' && (
              <div
                className={`flex ${
                  field.orientation === 'vertical'
                    ? 'flex-col'
                    : 'flex-row space-x-4'
                }`}
              >
                {Object.entries(field.options[language] || {}).map(
                  ([optKey, optLabel]) => (
                    <label
                      key={optKey}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="radio"
                        name={field.id}
                        value={optKey}
                        checked={fieldValue === optKey}
                        onChange={() =>
                          handleInputChange(field.id, optKey)
                        }
                        onBlur={() => onSave()}
                      />
                      <span>{optLabel}</span>
                    </label>
                  )
                )}
              </div>
            )}

            {/* Select / Dropdown */}
            {(field.type === 'select' || field.type === 'dropdown') && (
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  {Array.isArray(fieldValue) && fieldValue.length > 0 ? (
                    fieldValue.map((optKey: string) => (
                      <span
                        key={optKey}
                        className="flex items-center rounded bg-blue-100 px-3 py-1 text-sm text-blue-800"
                      >
                        {field.options[language][optKey] || optKey}
                        <button
                          type="button"
                          className="ml-2 text-red-500 hover:text-red-700"
                          onClick={() => {
                            const filtered = (
                              fieldValue as string[]
                            ).filter(k => k !== optKey)
                            handleInputChange(field.id, filtered)
                            onSave()
                          }}
                          aria-label={`Remove ${optKey}`}
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No options selected.
                    </p>
                  )}
                </div>

                <select
                  name={field.id}
                  multiple
                  className="w-full rounded border p-2"
                  value={fieldValue || []}
                  onChange={e => {
                    const sel = Array.from(
                      e.target.selectedOptions,
                      o => o.value
                    )
                    handleInputChange(field.id, sel)
                  }}
                  onBlur={() => onSave()}
                >
                  {Object.entries(field.options[language] || {}).map(
                    ([optKey, optLabel]) => (
                      <option key={optKey} value={optKey}>
                        {optLabel}
                      </option>
                    )
                  )}
                </select>

                {Array.isArray(fieldValue) && fieldValue.length > 0 && (
                  <button
                    className="mt-2 rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
                    type="button"
                    onClick={() => {
                      handleInputChange(field.id, [])
                      onSave()
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>
            )}

            {/* Fallback Text */}
            {!['DateTime', 'radio', 'select', 'dropdown'].includes(
              field.type
            ) && (
              <input
                type="text"
                value={fieldValue || ''}
                onChange={e =>
                  handleInputChange(field.id, e.target.value)
                }
                onBlur={() => onSave()}
                className="mt-1 p-2 border rounded w-full"
              />
            )}
          </div>
        )
      })}

    </div>
  )
}
