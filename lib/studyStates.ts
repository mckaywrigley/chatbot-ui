export type StudyState =
  | "topic_creation"
  | "topic_edit"
  | "topic_updated"
  | "recall_first_attempt"
  | "recall_hinting"
  | "recall_finished"
  | "reviewing"

export interface QuickResponse {
  quickText: string
  responseText: string
  newStudyState: StudyState
}

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
  const stateObject = studyStates.find(state => state.name === studyState)

  return stateObject?.quickResponses ?? []
}

export function getQuickResponseByUserText(
  userText: string
): QuickResponse | undefined {
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
