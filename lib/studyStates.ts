export type StudyState =
  | "topic_creation"
  | "topic_edit"
  | "topic_updated"
  | "topic_default"
  | "recall_first_attempt"
  | "recall_hinting"
  | "recall_finished"
  | "reviewing"
  | "tutorial"
  | "tutorial_2"
  | "tutorial_3"
  | "tutorial_4"
  | "recall_tutorial_first_attempt"
  | "recall_tutorial_hinting"
  | "recall_tutorial_finished"

export interface QuickResponse {
  quickText: string
  responseText: string
  newStudyState: StudyState
}

interface StudyStateObject {
  name: StudyState
  quickResponses?: QuickResponse[]
}

const tutorialFinalText = `Well done! You'll notice the icon next to the topic name has now changed to a green circle with a lock. This signifies that you've successfully reviewed the topic. As time progresses towards your next review session, this circle will gradually decrease, reflecting an estimate of your recall strength. We'll notify you when it's time for a refresher session.
Feel free to start creating topics by clicking on the "+ New topic" button on the top left.
You're also welcome to revisit and reinforce your understanding of The Solar System!
Happy studying!`

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
        responseText: "Try to recall as much as you can about the topic.",
        newStudyState: "recall_first_attempt"
      },
      {
        quickText: "Show full topic description.",
        responseText: "{{topicDescription}}",
        newStudyState: "reviewing"
      }
    ]
  },
  {
    name: "topic_default",
    quickResponses: [
      {
        quickText: "Start recall now.",
        responseText: "Try to recall as much as you can about the topic.",
        newStudyState: "recall_first_attempt"
      },
      {
        quickText: "Show full topic description.",
        responseText: "{{topicDescription}}",
        newStudyState: "reviewing"
      }
    ]
  },
  {
    name: "recall_first_attempt"
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
        responseText: "How can I update the topic content?",
        newStudyState: "topic_edit"
      }
    ]
  },
  {
    name: "reviewing",
    quickResponses: [
      {
        quickText: "Edit topic.",
        responseText: "How can I update the topic content?",
        newStudyState: "topic_edit"
      }
    ]
  },
  {
    name: "tutorial",
    quickResponses: [
      {
        quickText: "Next.",
        responseText:
          "Great, let's proceed. I'll show you how to add a topic description. We can collaborate to create a new topic. Let's start with 'The Solar System.' Click below.",
        newStudyState: "tutorial_2"
      }
    ]
  },
  {
    name: "tutorial_2",
    quickResponses: [
      {
        quickText: "The Solar System.",
        responseText: `If you've only entered a topic name so far, like here, I'll help by creating a topic description for you. Alternatively, you can manually add a description by uploading a file or typing directly into the chat. For now, I'll generate the description for you. Please 'View topic.' now, and then 'Save topic.'`,
        newStudyState: "tutorial_3"
      }
    ]
  },
  {
    name: "tutorial_3",
    quickResponses: [
      {
        quickText: "View topic.",
        responseText: "{{topicDescription}}",
        newStudyState: "tutorial_4"
      }
    ]
  },
  {
    name: "tutorial_4",
    quickResponses: [
      {
        quickText: "Save topic description.",
        responseText: `Ready to test your memory? After reviewing the topic, it's time for your first recall attempt. Remember, no peeking! 👀😉
I'll evaluate your attempt and schedule a recall session for you. Do your best to recall as much as you can about The Solar System topic now; click on chat below and then the microphone key on your keyboard or manually type your response.
Click "Finish Tutorial" when you're ready to proceed.`,
        newStudyState: "recall_tutorial_first_attempt"
      }
    ]
  },
  {
    name: "recall_tutorial_first_attempt"
  },
  {
    name: "recall_tutorial_hinting",
    quickResponses: [
      {
        quickText: "Finish tutorial.",
        responseText: tutorialFinalText,
        newStudyState: "topic_creation"
      }
    ]
  },
  {
    name: "recall_tutorial_finished",
    quickResponses: [
      {
        quickText: "Finish tutorial.",
        responseText: tutorialFinalText,
        newStudyState: "topic_creation"
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
