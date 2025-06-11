// drt_frontend\app\components\Form\hooks\useDynamicForm\mapping.ts

import { Question, ChildQuestion, Submission } from '../../../type'
import { getParentSteps } from '../../utils/steps'
import { useFormData } from '../../context/FormDataContext'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type MappingFunction = (q: Question) => Partial<Submission['data']['attributes']>

export function useSubmissionMapping(
  parsedSteps: any[], // Step[]
  formData: Record<string, any>,
  parentFormData: Record<string, any>,
  language: string
) {
  const [reviewOutput, setReviewOutput] = useState<{ title?: string; questions: Question[]; submittedAt?: string } | null>(null)
  const router = useRouter()

  // Define a mapping function for each “field id” to transform it into the OpendAIRE attribute
  const fieldMapping: { [key: string]: MappingFunction } = {
    identifier: (q) => {
      const doi = q.answer
      const [prefix, ...rest] = doi.split('/')
      return {
        doi,
        prefix: prefix || '',
        suffix: rest.join('/') || '',
      }
    },
    alternateIdentifier: (q) => ({
      alternateIdentifiers:
        q.children?.map((child) => {
          const altId =
            child.questions.find((cq) => cq.id === 'alternateIdentifier')?.answer || ''
          const altIdType =
            child.questions.find((cq) => cq.id === 'alternateIdentifierType')?.answer || ''
          return {
            alternateIdentifier: altId,
            alternateIdentifierType: altIdType,
          }
        }) || [],
    }),
    // (…all other mapping functions as in original file…)
    rights: (q) => ({
      rightsList:
        q.children?.map((child) => {
          const rights =
            child.questions.find((cq) => cq.id === 'rights')?.answer || null
          const rightsUri =
            child.questions.find((cq) => cq.id === 'rightsURI')?.answer || null
          return {
            rights,
            rightsUri,
            schemeUri: null,
            rightsIdentifier: null,
            rightsIdentifierScheme: null,
          }
        }) || [],
    }),
  }

  // Build the “questions” array of Question objects (including children) for review
  const buildReviewQuestions = () => {
    const questions: Question[] = []
    const parentStepsForReview = getParentSteps(parsedSteps as any)

    parentStepsForReview.forEach((step: any) => {
      step.pages.forEach((page: any) => {
        page.sections.forEach((section: any) => {
          section.fields.forEach((field: any) => {
            const questionObj: Question = {
              id: field.id,
              label:
                field.labels[language]?.[field.id] ||
                field.labels['eng']?.[field.id] ||
                'No label',
              type: field.type,
              answer: formData[step.id]?.[field.id] ?? '',
            }

            if (field.type === 'reference' && field.ref) {
              const childrenData =
                parentFormData[field.id]?.childrenData?.[field.ref]
              if (childrenData && Array.isArray(childrenData)) {
                questionObj.children = childrenData.map((child: any) => {
                  const childQuestions: ChildQuestion[] = []
                  for (const key in child.data) {
                    childQuestions.push({
                      id: key,
                      label: key,
                      type: 'childField',
                      answer: child.data[key],
                    })
                  }
                  return {
                    childId: child.id,
                    questions: childQuestions,
                  }
                })
              }
            }
            questions.push(questionObj)
          })
        })
      })
    })
    return questions
  }

  // Called to set up review mode (no network request yet)
  const handleSubmit_openAIRE = useCallback(() => {
    const questions = buildReviewQuestions()
    setReviewOutput({ submittedAt: new Date().toISOString(), questions })
    // console.log('Review JSON:', JSON.stringify({ questions }, null, 2))
  }, [parsedSteps, formData, parentFormData, language])

  // Called to POST the reviewOutput to your Django endpoint
  const handleVerifyAndSubmit = useCallback(
    async (format: 'json' | 'license' | 'odrl') => {
      if (!reviewOutput) return
      const url = `http://127.0.0.1:8000/drt/api/submission/?format=${format}`
      // const url = `https://drt-design-document.onrender.com/drt/api/submission/?format=${format}`
      console.log('Submitting to:', url)
      try {
        const getCookie = (name: string): string | null => {
          let cookieValue: string | null = null
          if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';')
            for (let cookie of cookies) {
              cookie = cookie.trim()
              if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
                break
              }
            }
          }
          return cookieValue
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken') || '',
          },
          body: JSON.stringify(reviewOutput),
        })
        if (!response.ok) {
          throw new Error(`Submission failed: ${response.status}`)
        }

        const blob = await response.blob()
        const cd = response.headers.get('Content-Disposition') || ''
        const match = cd.match(/filename="([^"]+)"/)
        const filename =
          match?.[1] ||
          {
            json: 'openAIRE.json',
            license: 'license.txt',
            odrl: 'license.xml',
          }[format]

        const blobUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(blobUrl)
      } catch (error) {
        console.error('Error during submission:', error)
      }
    },
    [reviewOutput]
  )

  return {
    reviewOutput,
    setReviewOutput,
    handleSubmit_openAIRE,
    handleVerifyAndSubmit,
  }
}
