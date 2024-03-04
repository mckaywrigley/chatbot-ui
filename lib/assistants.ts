interface FunctionParameter {
  type: string
  properties: Record<string, { type: string; description: string }>
  required: string[]
}

interface FunctionObject {
  name: string
  description: string
  parameters: FunctionParameter
  next_study_state?: string
}

interface Function {
  type: string
  function: FunctionObject
}

interface Assistant {
  name: string
  model: string
  temperature: number
  study_states: string[]
  prompt: string
  functions: Function[]
  context_length: number
  created_at: string
  embeddings_provider: string
  folder_id: null | string
  image_path: null | string
  include_profile_context: boolean
  include_workspace_instructions: boolean
  sharing: string
  updated_at: null | string
  user_id: null | string
}

const recallAssistants = [
  {
    name: "topic",
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    study_states: ["no_topic_description", "score_updated", "reading"],
    prompt:
      'You are an upbeat, encouraging tutor who helps the student to develop a detailed topic description; the goal of which is to serve as comprehensive learning resources for future study. Only ask one question at a time.\n\nFirst, the student will provide a topic name and possibly a topic description with source learning materials or ideas, whether in structured formats (like course webpages, PDFs from books) or unstructured notes or insights.\n\nGiven this source information, produce a detailed multi paragraph explanation of the topic. In addition outline the key facts in a list.\nNext, use the tool (functional call) "Save topic description" and pass the generated topic description.\nNext, ask the student if they would like to change anything. Wait for a response.\nIf the student wants to change anything, work with the student to change the topic description. Use the the tool (functional call) "Save topic description" and pass the final generated topic description.\nIf the student wants to start a topic test e.g. "Test me now", use the testMeNow functional call.',
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
          },
          next_study_state: "topic_description_updated"
        }
      },
      {
        type: "function",
        function: {
          name: "scheduleTestSession",
          description:
            "This function schedules a test session a certain number of hours from now, based on student request or completion of topic editing.",
          parameters: {
            type: "object",
            properties: {
              hours: {
                type: "integer",
                description:
                  "Number of hours from now when the test session should be scheduled."
              }
            },
            required: ["hours"]
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
    study_states: ["recall_ready", "recalling"],
    prompt: `Compare the source material below with the student's recall attempt(s) for this conversation. 
Assess the student's recall attempt on a scale from 0 (no recall) to 100 (perfect recall). 
Consider the accuracy, detail, and number of facts recalled in your scoring. 
Call the tool/function updateTopicQuizResult with score. 
Confirm Score with the User: Present the recall score to the student with a message like, 
"Based on our session, I'd score your recall at [insert score here] out of 100. This reflects the great details you've remembered. Do you feel this score accurately represents your recall attempt?" 
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
      }
    ]
  },
  {
    name: "score",
    model: "gpt-3.5-turbo",
    temperature: 1,
    study_states: ["scoring"],
    prompt: `Compare the source material below with the students recall attempt(s) for this conversation. 
Assess the student's recall attempt on a scale from 0 (no recall) to 100 (perfect recall). Consider the accuracy, detail, and number of facts recalled in your scoring.
Call the tool/function updateTopicQuizResult with score.
Confirm Score with the User: Present the recall score to the student with a message like, \"Based on our session, I'd score your recall at [insert score here] out of 100. This reflects the great details you've remembered. Do you feel this score accurately represents your recall attempt?\"
The student can change the score if they so wish.`,
    functions: [
      {
        type: "function",
        function: {
          name: "recall_complete",
          description:
            "This function should be called once the student has finished their recall phase.",
          parameters: {
            type: "object",
            properties: {
              isFinished: {
                type: "boolean",
                description: "Whether the recall phase is complete."
              }
            },
            required: ["isFinished"]
          }
        }
      }
    ]
  }
]

// const assistantDefaults = {
//     context_length: 4096,
//     created_at: new Date().toISOString(),
//     embeddings_provider: "openai",
//     folder_id: null,
//     image_path: null,
//     include_profile_context: false,
//     include_workspace_instructions: false,
//     sharing: "private",
//     updated_at: null,
//     user_id: null
//   }

// const recallAssistants = assistants.map(assistant => ({
//   ...assistantDefaults,
//   ...assistant
// }))

export default recallAssistants
