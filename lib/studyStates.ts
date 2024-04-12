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
  | "tutorial_hinting"
  | "recall_tutorial_hinting"
  | "tutorial_final_stage"
  | "tutorial_final_review"
  | "tutorial_finished"

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
        responseText: "Try to recall as much as you can about the topic now.",
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
        responseText:
          "Let's see what you remember about the topic. Give it your best shot!",
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
        responseText: "What updates should we make to the topic content?",
        newStudyState: "topic_edit"
      }
    ]
  },
  {
    name: "reviewing",
    quickResponses: [
      {
        quickText: "Edit topic.",
        responseText: "What updates should we make to the topic content?",
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
          "Brilliant! Next up, I'll guide you on how to add a topic description. It's quite exciting to create a new topic together. Let's start with 'The Solar System.' Click on it below.",
        newStudyState: "tutorial_2"
      }
    ]
  },
  {
    name: "tutorial_2",
    quickResponses: [
      {
        quickText: "The Solar System.",
        responseText: `If at this stage you've only entered a topic name, like now, I'll step in to help craft a suitable topic description for you. Alternatively, you're more than welcome to add a description yourself, whether by uploading a document or typing directly into our chat. For the moment, I'll take care of generating the description for you. Please 'View topic.' now, and afterwards, 'Save topic.'`,
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
        responseText: `Now comes the fun part! After taking some time to study the topic, it's time for your first recall attempt. Let's make it a good one, no peeking allowed! 👀😉
I'll be here to assess your attempt and set up a recall session based on how you do. Give it your best shot to recall as much as you can about "The Solar System" topic but leave out some facts for the purpose of this tutorial; select the chat area below (Message Mentor...) then type or hit the microphone key on your keyboard.
After you receive feedback on your attempt, select "Next step..." to move forward.`,
        newStudyState: "recall_tutorial_first_attempt"
      }
    ]
  },
  {
    name: "recall_tutorial_first_attempt"
  },
  {
    name: "tutorial_hinting",
    quickResponses: [
      {
        quickText: "Next step - reply to hints.",
        responseText:
          "Great work so far! So now that some hints have been provided, try your best to recall the missing facts.",
        newStudyState: "recall_tutorial_hinting"
      }
    ]
  },
  {
    name: "recall_tutorial_hinting"
  },
  {
    name: "tutorial_final_stage",
    quickResponses: [
      {
        quickText: "Final stage - review.",
        responseText: `Amazing work! 
The final stage of an effective study session is reviewing the topic one last time with an eye on what was missed. This is where you'll get a chance to solidify your understanding of the topic.`,
        newStudyState: "tutorial_final_review"
      }
    ]
  },
  {
    name: "tutorial_final_review",
    quickResponses: [
      {
        quickText: "Show topic content for final review.",
        responseText: "{{topicDescription}}",
        newStudyState: "tutorial_finished"
      }
    ]
  },
  {
    name: "tutorial_finished",
    quickResponses: [
      {
        quickText: "Finish tutorial.",
        responseText: `Amazing work! 
On the topic list to the left, you will notice the icon next to the topic name has changed into a green circle with a lock. This is a happy indicator that you've successfully reviewed the topic. As days go by leading up to your next review session, this circle will slowly diminish, mirroring an estimate of your recall strength. Don't worry, we'll give you a gentle nudge when it's nearly time for a refresh.
Now, you're all set to begin creating your own topics! Just click on the "+ New topic" button located at the top left corner.
And of course, feel free to dive back in to further solidify your mastery of The Solar System!
Enjoy your learning journey!`,
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
