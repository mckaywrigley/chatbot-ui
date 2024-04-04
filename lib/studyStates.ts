export type StudyState =
  | "topic_creation"
  | "topic_edit"
  | "topic_updated"
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

const tutorialFinalText = `Great job! 
You will notice the icon next to the topic name has changed to a green circle with a lock. This indicates that you have successfully recalled the topic. Over time between now and the next recall session, the circle progress will reduce as an estimate your recall strength. You will be notified when your memory strenght is about to fade and time for a new recall session.
You can now start creating topics by selecting the "+ New topic" button above left.
You can also come back again to to master your knowledge of The Solar System!
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
        responseText: "Try to recall as much as possible about the topic.",
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
  },
  {
    name: "tutorial",
    quickResponses: [
      {
        quickText: "Next.",
        responseText:
          "Great. I'll now show you how to add a topic description. I can work with you to create a new topic. Let's create one now; select 'The Solar System.' below.",
        newStudyState: "tutorial_2"
      }
    ]
  },
  {
    name: "tutorial_2",
    quickResponses: [
      {
        quickText: "The Solar System.",
        responseText: `At this point if you have only entered a topic name, as is the case here, I will attempt to create a topic description for you. You can also add a description manually by uploading a file or typing directly into the chat. For now I will generate the description for you. Select 'View topic.' now then 'Save topic.' after.`,
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
        responseText: `You can now start your first recall attempt after studying the topic for the first time. No cheating! 👀😉
I will then score you on your attempt and create a schduled recall session for you. Type or even better use your system microphone to recall as much as you can about The Solar System topic now; select chat below and then the microphone 🎙️ key on your keyboard.
Select "Finish Tutorial" when you are ready to move on.`,
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
