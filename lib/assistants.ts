import OpenAI from "openai"

export type StudyState =
  | "topic_creation"
  | "topic_created"
  | "topic_description_updated"
  | "test_scheduled"
  | "recall_first_attempt"
  | "recall_hinting"
  | "score_updated"
  | "reviewing"
  | "no_topic_description"
  | "scoring"

type AssistantName = "topic" | "feedback" | "score"

export interface AssistantWithTool {
  name: AssistantName
  model: string
  temperature: number
  prompt: string
  functions: OpenAI.Chat.Completions.ChatCompletionTool[]
}

export type FunctionCalls =
  | "updateTopicDescription"
  | "testMeNow"
  | "recallComplete"
  | "updateTopicQuizResult"
  | "showFullTopicDescription"

// Interface for objects within the studyStates array
interface StudyStateObject {
  name: StudyState
  assistant: AssistantName
  triggeredBy?: FunctionCalls
  quickResponses?: string[]
}

// Example usage
export const studyStates: StudyStateObject[] = [
  {
    name: "topic_creation",
    assistant: "topic"
  },
  {
    name: "topic_created",
    assistant: "topic"
  },
  {
    name: "topic_description_updated",
    assistant: "topic",
    triggeredBy: "updateTopicDescription"
  },
  {
    name: "test_scheduled",
    assistant: "topic"
  },
  {
    name: "recall_first_attempt",
    assistant: "feedback",
    triggeredBy: "testMeNow"
  },
  {
    name: "recall_hinting",
    assistant: "feedback",
    quickResponses: ["Proceed to scoring.", "More hints."]
  },
  {
    name: "score_updated",
    assistant: "score",
    triggeredBy: "updateTopicQuizResult",
    quickResponses: ["Show full topic description."]
  },
  {
    name: "reviewing",
    assistant: "topic",
    triggeredBy: "showFullTopicDescription"
  },
  {
    name: "no_topic_description",
    assistant: "topic"
  },
  {
    name: "scoring",
    assistant: "score",
    triggeredBy: "recallComplete"
  }
]

const assistantsWithTools: AssistantWithTool[] = [
  {
    name: "topic",
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    prompt: `You are an upbeat, encouraging tutor who helps the student to develop a detailed topic description; the goal of which is to serve as comprehensive learning resources for future study. Only ask one question at a time.
      First, the student will provide a topic name and possibly a topic description with source learning materials or ideas, whether in structured formats (like course webpages, PDFs from books) or unstructured notes or insights.
      Given this source information, produce a detailed multi paragraph explanation of the topic. In addition outline the key facts in a list.
      Next, use the tool / functional "updateTopicDescription" and pass the generated topic description.
      Next, ask the student if they would like to change anything. Wait for a response.
      If the student wants to change anything, work with the student to change the topic description. Use the the tool/functional updateTopicDescription and pass the final generated topic description.
      If the student wants to start a topic test e.g. "Test me now", use the testMeNow functional call.`,
    functions: [
      {
        type: "function",
        function: {
          name: "updateTopicDescription",
          description:
            "This function updates the detailed topic description based on student inputs and finalized content.",
          parameters: {
            type: "object",
            properties: {
              topic_description: {
                type: "string",
                description: "The full topic description to be saved."
              }
            },
            required: ["topic_description"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "testMeNow",
          description:
            "This function initiates a topic recall session immediately upon student's request.",
          parameters: {
            type: "object",
            properties: {
              start_test: {
                type: "boolean",
                description: "Flag to start the test immediately."
              }
            },
            required: ["start_test"]
          }
        }
      }
    ]
  },
  {
    name: "feedback",
    model: "gpt-3.5-turbo",
    temperature: 1,
    prompt: `You are a friendly and supportive tutor dedicated to guiding the user (student) through an active free recall study session. 
    Objective: The goal is to assist the student in reflecting on their current understanding, recognize their achievements, and motivate them to fill in the gaps in their knowledge without directly providing the answers. Encourage curiosity and the desire to learn more, while making the feedback process a positive and constructive experience.
    Steps:
    Step 1. Compare the Student's Recall Attempt to the Source Topic Description below: Identify which facts the student has remembered correctly and acknowledge these specifically to reinforce their learning.
    Step 2. Provide Encouraging Feedback: Offer positive reinforcement for the facts the student has successfully recalled. Emphasize the effort and what was done well. Highlight Areas for Improvement: Without directly giving away the answers, hint at areas or topics the student might not have mentioned or fully remembered. Use questions or suggestive statements that encourage the student to think deeper or research further. 
    Step 3. If you have no more hints to give or if the students requests to move on to scoring, call the tool / function "recallComplete". This will allow the student to progress to the next study state; scoring.`,
    functions: [
      {
        type: "function",
        function: {
          name: "recallComplete",
          description:
            "This function should be called once the student has finished their recall phase.",
          parameters: {
            type: "object",
            properties: {
              recallSummary: {
                type: "string",
                description: "The summary of the student's recall attempt."
              }
            },
            required: ["recallSummary"]
          }
        }
      }
    ]
  },
  {
    name: "score",
    model: "gpt-3.5-turbo",
    temperature: 1,
    prompt: `Compare the source material with the students recall attempt(s) for this conversation. 
Assess the student's recall attempt on a scale from 0 (no recall) to 100 (perfect recall). Consider the accuracy, detail, and number of facts recalled in your scoring.
Call the tool/function updateTopicQuizResult with score.
Confirm Score with the User: Present the recall score to the student with a confirmation message, e.g.: \"Based on our session, I'd score your recall at [insert score here] out of 100. This reflects the great details you've remembered. Do you feel this score accurately represents your recall attempt?\"
The student can change the score if they so wish.`,
    functions: [
      {
        type: "function",
        function: {
          name: "updateTopicQuizResult",
          description:
            "This function updates the free recall and quiz test result for a topic.",
          parameters: {
            type: "object",
            properties: {
              test_result: {
                type: "integer",
                description:
                  "The score out of 100 representing the student's recall attempt."
              }
            },
            required: ["test_result"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "showFullTopicDescription",
          description:
            "This function shows the full topic description to the student."
        }
      }
    ]
  }
]

export const getRecallAssistantByStudyState = (
  studyState: StudyState
): AssistantWithTool => {
  const assistantName = studyStates.find(
    state => state.name === studyState
  )?.assistant

  if (!assistantName) {
    throw new Error(`No assistant found for study state: ${studyState}`)
  }

  return assistantsWithTools.find(
    assistant => assistant.name === assistantName
  ) as AssistantWithTool
}

export const nextStudyStateForFunction = (
  functionName: FunctionCalls
): StudyState => {
  const studyState = studyStates.find(
    state => state.triggeredBy === functionName
  )

  if (!studyState) {
    throw new Error(`No study state found for function: ${functionName}`)
  }

  return studyState.name
}

// const assistantDefaults = {
//   context_length: 4096,
//   created_at: new Date().toISOString(),
//   embeddings_provider: "openai",
//   folder_id: null,
//   image_path: null,
//   include_profile_context: false,
//   include_workspace_instructions: false,
//   sharing: "private",
//   updated_at: null,
//   user_id: null
// }

// const recallAssistants = assistantsWithTools.map(assistant => ({
//   ...assistantDefaults,
//   ...assistant
// }))

export default assistantsWithTools
