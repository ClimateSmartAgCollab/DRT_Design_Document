import { parseJsonToFormStructure } from "../../../../../components/parser";
import { sortStepsByReferences } from "../../../../../components/Form/hooks/useDynamicForm";

export function parseQuestionnaire(questionnaire: any) {
  if (!questionnaire || questionnaire._loading) {
    return [];
  }

  try {
    const unsorted = parseJsonToFormStructure(questionnaire);
    const sorted = sortStepsByReferences(unsorted);
    return sorted;
  } catch (error) {
    console.error("Error parsing questionnaire JSON:", error);
    return [];
  }
}

export function getParentSteps(parsedSteps: any[]) {
  const childIds = new Set<string>();
  parsedSteps.forEach((step) =>
    step.pages.forEach((page: any) =>
      page.sections.forEach((sec: any) =>
        sec.fields.forEach((f: any) => f.ref && childIds.add(f.ref))
      )
    )
  );
  return parsedSteps.filter((s) => !childIds.has(s.id));
}

export function parseOwnerResponses(
  ownerResponses: string | null
): Record<string, string> {
  if (!ownerResponses) return {};

  try {
    let parsedComments;
    if (typeof ownerResponses === "string") {
      parsedComments = JSON.parse(ownerResponses);

      if (typeof parsedComments === "string") {
        parsedComments = JSON.parse(parsedComments);
      }
    } else {
      parsedComments = ownerResponses;
    }

    if (typeof parsedComments === "object" && !Array.isArray(parsedComments)) {
      return parsedComments;
    } else {
      return {};
    }
  } catch (error) {
    console.error("Error parsing owner responses:", error);
    return {};
  }
}
