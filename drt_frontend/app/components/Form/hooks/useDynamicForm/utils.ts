// drt_frontend\app\components\Form\hooks\useDynamicForm\utils.ts

import { Step } from '../../../type'

/**
 * Quickly test whether a string is valid UTF‐8 (using TextEncoder/TextDecoder).
 */
export function isValid__UTF8(text: string): boolean {
  try {
    if (!text) return true
    const encoder = new TextEncoder()
    const decoder = new TextDecoder('utf-8', { fatal: true })
    const encoded = encoder.encode(text)
    decoder.decode(encoded)
    return true
  } catch {
    return false
  }
}

/**
 * Scan a Step for any `field.ref` values; return all referenced step IDs.
 */
export const extractRefs = (step: Step): string[] => {
  const refs: string[] = []
  if (!step.pages) return refs

  step.pages.forEach((page) => {
    page.sections?.forEach((section) => {
      section.fields?.forEach((field: any) => {
        if (field.ref) {
          refs.push(field.ref)
        }
      })
    })
  })

  return refs
}

/**
 * Topologically sort steps so that any step whose `id` is referenced by another
 * appears after its parent. Kahn's algorithm (cycle‐aware).
 * If there’s a cycle or missing node, returns the original array unmodified.
 */
export function sortStepsByReferences(steps: Step[]): Step[] {
  const stepsMap = new Map<string, Step>(steps.map((s) => [s.id, s]))

  // Build adjacency + in‐degree counts
  const graph: Record<string, string[]> = {}
  const inDegree: Record<string, number> = {}

  steps.forEach((step) => {
    graph[step.id] = []
    inDegree[step.id] = 0
  })

  steps.forEach((step) => {
    const refs = extractRefs(step)
    refs.forEach((refId) => {
      if (stepsMap.has(refId)) {
        graph[step.id].push(refId)
        inDegree[refId] = (inDegree[refId] || 0) + 1
      } else {
        console.warn(
          `Referenced step id "${refId}" not found for step "${step.id}"`
        )
      }
    })
  })

  // Kahn’s algorithm
  const queue: string[] = []
  const rootId = steps[0]?.id
  if (rootId && inDegree[rootId] === 0) {
    queue.push(rootId)
  }
  steps.forEach((step) => {
    if (step.id !== rootId && inDegree[step.id] === 0) {
      queue.push(step.id)
    }
  })

  const sortedIds: string[] = []
  while (queue.length) {
    const current = queue.shift()!
    sortedIds.push(current)
    for (const neighbor of graph[current]) {
      inDegree[neighbor]--
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor)
      }
    }
  }

  if (sortedIds.length !== steps.length) {
    console.warn('Cycle detected or missing nodes; returning unsorted steps.')
    return steps
  }
  return sortedIds.map((id) => stepsMap.get(id)!)
}
