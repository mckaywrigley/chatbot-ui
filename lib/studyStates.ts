export type StudyState =
  | "topic_creation"
  | "topic_edit"
  | "topic_updated"
  | "recall_first_attempt"
  | "recall_hinting"
  | "recall_finished"
  | "reviewing"

export interface QuickResponse {
  quickText: string // The original quick response text
  responseText: string // The text to be returned in the response
  newStudyState: StudyState // The new study state to transition to
}

// Enhanced Interface for objects within the studyStates array
interface StudyStateObject {
  name: StudyState
  quickResponses?: QuickResponse[]
}

export const studyStates: StudyStateObject[] = [
  {
    name: "topic_creation"
  },
  {
    name: "topic_edit",
    quickResponses: [
      {
        quickText: "Save topic.",
        responseText: "LLM",
        newStudyState: "topic_updated"
      }
    ]
  },
  {
    name: "topic_updated",
    quickResponses: [
      {
        quickText: "Start recall now.",
        responseText: "Try to recall as much as possible about the topic.",
        newStudyState: "recall_first_attempt"
      }
    ]
  },
  {
    name: "recall_first_attempt",
    quickResponses: [
      {
        quickText: "Show full topic description.",
        responseText: "{{topicDescription}}",
        newStudyState: "reviewing"
      }
    ]
  },
  {
    name: "recall_hinting"
  },
  {
    name: "recall_finished",
    quickResponses: [
      {
        quickText: "Show full topic description.",
        responseText: "{{topicDescription}}",
        newStudyState: "reviewing"
      },
      {
        quickText: "Edit topic.",
        responseText: "How should I update the topic content?",
        newStudyState: "topic_edit"
      }
    ]
  },
  {
    name: "reviewing",
    quickResponses: [
      {
        quickText: "Edit topic.",
        responseText: "How should I update the topic content?",
        newStudyState: "topic_edit"
      }
    ]
  }
]

export function getQuickResponses(studyState: StudyState): QuickResponse[] {
  // Find the studyState object in the studyStates array
  const stateObject = studyStates.find(state => state.name === studyState)

  // If the stateObject exists and has quickResponses, return them; otherwise, return an empty array
  return stateObject?.quickResponses ?? []
}

// function that returns quickResponse based on userText
export function getQuickResponseByUserText(
  userText: string
): QuickResponse | undefined {
  // Iterate over all study states and their quick responses to find a match
  for (const state of studyStates) {
    const quickResponse = state.quickResponses?.find(
      qr => qr.quickText === userText
    )
    if (quickResponse) {
      return quickResponse
    }
  }
  return undefined
}
