import {
  ChatRecallMetadata,
  StudyState,
  getQuickResponseByUserText
} from "@/lib/studyStates"
import {
  checkApiKey,
  getServerProfile,
  functionCalledByLLM
} from "@/lib/server/server-chat-helpers"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { formatDistanceToNow } from "date-fns/esm"

// export const runtime = "edge"
export const dynamic = "force-dynamic"
export const maxDuration = 180

function extractAnalysisInfoWithComments(response: string) {
  // First, try to isolate the JSON part of the response
  const jsonMatch = response.match(/{[\s\S]*}/)
  if (!jsonMatch) throw new Error("No JSON in response")

  try {
    // Attempt to parse the isolated JSON part of the response
    const parsedResponse = JSON.parse(jsonMatch[0])
    const score: number = parsedResponse.score
    const forgotten_facts: string[] = parsedResponse.forgotten_facts
    return { score, forgotten_facts }
  } catch (error) {
    throw new Error("Error parsing JSON from response")
  }
}

const callLLM = async (
  chatId: string,
  openai: OpenAI,
  studySheet: string,
  messages: any[],
  studyState: StudyState,
  studentMessage: { content: string; role: string },
  chatRecallMetadata: ChatRecallMetadata,
  randomRecallFact: string,
  noMoreQuizQuestions: boolean
) => {
  let stream, chatResponse, chatStreamResponse, analysis, serverResult
  let newStudyState: StudyState
  let defaultModel = "meta-llama/Meta-Llama-3-70B-Instruct"
  const mentor_system_message = `You are helpful, friendly study mentor who likes to use emojis. You help students remember facts on their own by providing hints and clues without giving away answers.`

  const finalFeedback = `Finally, ask the student if they wish to revisit the topic's source material to enhance understanding or clarify any uncertainties.`
  const mentor_shot_hint_response = `You've done a great job recalling some key facts about Venus! You're definitely on the right track. Let’s look at what you’ve got and fine-tune some details:
      
  Correct Recall:
  You're right that Venus is the second planet from the Sun and named after the Roman goddess of love. 🏆
  Absolutely, Venus is super hot with high surface temperatures. 🔥
  Spot on about Venus having a thick atmosphere and the rotation being in the opposite direction of most planets! That's a tricky one but you nailed it! 🔄
  Corrections:
  The surface temperature you mentioned is a bit off; it actually reaches up to 480 degrees Celsius, not 400. It’s even hotter than you thought! 🌡️
  You mentioned the atmosphere contains oxygen, but it's mostly carbon dioxide with clouds of sulfuric acid. No breathable oxygen there, unfortunately! 😷
  Regarding Venus’ past, it wasn’t just the heat that caused the water to disappear; scientists believe a runaway greenhouse effect turned all surface water into vapor, which then slowly escaped into space. 🌍➡️🚀
  Hints for Forgotten Facts:
  Think about how long a day on Venus is compared to its year. It's quite a unique aspect of the planet. Can you remember which one is longer? 🤔
  There's an interesting point about the past state of Venus related to water. What do you think Venus might have looked like a billion years ago? 💧🌐
  Take a moment to think about these hints and see if you can recall more about those specific points. You’re doing wonderfully so far, and digging a bit deeper will help solidify your understanding even more! 🚀💡`
  const quickQuizSystemMessage =
    "You are helpful, friendly quiz master. Generate short answer quiz questions based on a provided fact. Never give the answer to the question when generating the question text. Do not state which step of the instuctions you are on."

  switch (studyState) {
    case "topic_describe_upload":
    case "topic_generated":
      chatStreamResponse = await openai.chat.completions.create({
        model: defaultModel,
        temperature: 0.2,
        stream: true,
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: `Objective: Create a detailed study sheet for a specified topic. The study sheet should be concise, informative, and well-organized to facilitate quick learning and retention. Important: generate the study sheet text only. Do not generate additional text like summary, notes or additional text not in study sheet text.
            Instructions:
              Introduction to the Topic:
                Provide a brief overview of the topic, including its significance and general context.
              Key Components or Concepts:
                List 10 to 30 key facts or components related to the topic. Each fact should be succinct and supported by one or two important details to aid understanding.
              Structure and Organization:
                Group related facts into categories or themes to maintain logical coherence and enhance navigability.
              Common Applications or Implications:
                Explain how the knowledge of this topic can be applied in real-world scenarios or its relevance in related fields of study.
              
            Formatting Instructions:
              Ensure the study sheet is clear and easy to read. Use bullet points for lists, bold headings for sections, and provide ample spacing for clarity.
              Do not generate additional text like summary, notes or additional text not in study sheet text.`
          },
          ...messages
        ]
      })
      stream = OpenAIStream(chatStreamResponse)

      newStudyState = "topic_generated"
      return new StreamingTextResponse(stream, {
        headers: {
          "NEW-STUDY-STATE": newStudyState
        }
      })
    case "recall_tutorial_first_attempt":
    case "recall_first_attempt":
      // GET FORGOTTEN FACTS AND SCORE AND SAVE TO DB ///////////////////////////////
      chatResponse = await openai.chat.completions.create({
        model: defaultModel,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: `Given the Topic source and a Student's recall attempt below, perform the following tasks:
            1. Calculate a recall score representing how accurately the student's recall matches the Topic study sheet only. Important: Only compare against the Topic study sheet below. The score should reflect the percentage of the material correctly recalled, ranging from 0 (no recall) to 100 (perfect recall).
            2. Identify any significant omissions in the student's recall when compared against the Topic study sheet below. List these omissions as succinctly as possible, providing clear and educational summaries for review.
            
            Output the results in JSON format with the following structure:
            - "score": A numerical value between 0 and 100 indicating the recall accuracy.
            - "forgotten_facts": An array of strings, each summarizing a key fact or concept omitted from the student's recall when compared to the original topic study sheet.
            
            Topic study sheet:
            """${studySheet}"""
            
            Student's recall attempt:
            """${studentMessage.content}"""
            `
          }
        ]
      })

      analysis = await chatResponse.choices[0]?.message?.content
      const { score, forgotten_facts } = extractAnalysisInfoWithComments(
        analysis || ""
      )

      const perfectRecall = score >= 90 // LLM model is not perfect, so we need to set a threshold

      serverResult = await functionCalledByLLM(
        "updateTopicOnRecall",
        {
          test_result: perfectRecall ? 100 : score,
          recall_analysis: JSON.stringify(forgotten_facts)
        },
        chatId
      )
      if (serverResult.success === false) {
        throw new Error("Server error saving score.")
      }

      const result = serverResult
      const due_date: Date = result.due_date
      // const date = parseISO(revise_date)
      const dateFromNow = formatDistanceToNow(due_date)

      let systemMessage = mentor_system_message
      let userMessage = `Topic study sheet:
      """
      Venus
      * Venus is the second planet from the Sun.
      * It is named after the Roman goddess of love and beauty.
      * Venus is the hottest planet in our solar system, with surface temperatures reaching up to 480 degrees celsuis.
      * Venus has a longer day than its year. 
      * Scientists believe that Venus may have once been a habitable ocean world like Earth, but that was at least a billion years ago. A runaway greenhouse effect turned all surface water into vapor, which then leaked slowly into space.
      * Venus has the densest atmosphere of the terrestrial planets, composed mostly of carbon dioxide with a thick, global sulfuric acid cloud cover.
      * The rotation of Venus has been slowed and turned against its orbital direction (retrograde) by the strong currents and drag of its atmosphere.
      """
      
      Student recall:
      """
      Venus is the second planet from the Sun and named after the Roman goddess of love. It's known for being extremely hot, with temperatures reaching around 400 degrees Celsius. Venus actually spins backwards compared to its orbital direction because of the thick atmosphere which consists mainly of sulfuric acid clouds.
      
      It's said that Venus might have been similar to Earth with oceans a long time ago, maybe even a billion years or so. But I think it was the intense heat that eventually made the water disappear, turning it all into steam. As far as I remember, Venus has a day that is longer than its year, but I'm not too sure why that is.
      
      I believe it's mostly carbon dioxide in the atmosphere, but there might be some oxygen too. I don't recall much about why it rotates the way it does, maybe something to do with solar winds?
      """
      
      
      Mentor response:
      """
      ${mentor_shot_hint_response}
      """
      ---
      Topic study sheet: 
      """
      ${studySheet}
      """

      Student recall: 
      """
      ${studentMessage.content}
      """

      Mentor response:
      `

      newStudyState =
        studyState === "recall_tutorial_first_attempt"
          ? "tutorial_hinting_hide_input"
          : "recall_hinting"

      if (perfectRecall) {
        systemMessage = mentor_system_message
        userMessage = `Generate upbeat feedback based on the students recall performance. 
          Topic study sheet: 
          """
          ${studySheet}
          """

          Student recall: 
          """
          ${studentMessage.content}
          """

          Inform the student of their recall score: ${score}% and the next recall session date; ${dateFromNow} from now, to ensure consistent study progress.
          ${finalFeedback}`

        newStudyState =
          studyState === "recall_tutorial_first_attempt"
            ? "tutorial_hinting_hide_input"
            : "recall_finished_hide_input"
      }

      chatStreamResponse = await openai.chat.completions.create({
        model: defaultModel,
        temperature: 0.2,
        stream: true,
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      })

      stream = OpenAIStream(chatStreamResponse)
      return new StreamingTextResponse(stream, {
        headers: {
          "NEW-STUDY-STATE": newStudyState,
          SCORE: score.toString(),
          "DUE-DATE-FROM-NOW": dateFromNow
        }
      })
    case "recall_tutorial_hinting":
    case "recall_hinting":
      // PROVIDE ANSWER TO HINTS  ////////////////////
      let mentorHintsMessage: { content: string; role: string } =
        messages.slice(-2, -1)[0]
      studentMessage

      if (studyState === "recall_tutorial_hinting") {
        mentorHintsMessage = messages.slice(-4, -3)[0]
      }

      chatStreamResponse = await openai.chat.completions.create({
        model: defaultModel,
        temperature: 0.3,
        stream: true,
        messages: [
          {
            role: "system",
            content: `${mentor_system_message}
            Use this topic study sheet only when responding to the student ${studySheet}`
          },
          {
            role: "user",
            content: `
            Mentor hint response:
            """
            ${mentor_shot_hint_response}
            """

            Student answer to hints:
            """
            Venus has a day that's longer than its year because of its slow rotation, right? As for Venus a long time ago, I think it used to be completely dry and desert-like, without any oceans or water.
            """

            Pre-hint Score:
            """
            50%
            """

            Next review:
            """
            2 days time
            """

            Mentor:
            """
            Great effort! 🌟 You got the first part right; indeed, Venus has a day that is longer than its year due to its incredibly slow rotation. That's an interesting fact not many remember! 🕒

            However, about Venus's past, it was actually thought to have been a habitable ocean world similar to Earth, not a dry desert. Scientists believe it may have had large amounts of surface water which later disappeared due to a runaway greenhouse effect. 🌊➡️🔥

            You're doing well with a 50% correct recall before we went through the hints. Keep it up!

            Your next recall session is due in 2 days. 📅 Review the topic study sheet now to help reinforce and expand your memory on Venus. 📚

            Take some time to go over the details, especially the parts about Venus's past climate and its atmospheric composition. This will set us up perfectly for enhancing your understanding in our upcoming session.
            """

            ---
            Mentor hint response:
            """
            ${mentorHintsMessage.content}
            """

            Student answer to hints:
            """
            ${studentMessage.content}
            """

            Pre-hint Score:
            """
            ${chatRecallMetadata?.score}
            """

            Next review:
            """
            ${chatRecallMetadata?.dueDateFromNow}
            """

            Mentor:
            `
          }
        ]
      })

      stream = OpenAIStream(chatStreamResponse)
      newStudyState =
        studyState === "recall_tutorial_hinting"
          ? "tutorial_final_stage_hide_input"
          : "recall_finished_hide_input"
      return new StreamingTextResponse(stream, {
        headers: {
          "NEW-STUDY-STATE": newStudyState
        }
      })

    case "recall_finished_hide_input":
    case "reviewing":
      // SHOW FULL study sheet ///////////////////////////////

      chatStreamResponse = await openai.chat.completions.create({
        model: defaultModel,
        temperature: 0.5,
        stream: true,
        messages: [
          {
            role: "system",
            content:
              "Act as a study mentor, guiding student through active recall sessions."
          },
          ...messages
        ]
      })

      stream = OpenAIStream(chatStreamResponse)
      return new StreamingTextResponse(stream)
    case "quick_quiz_ready_hide_input":
      chatStreamResponse = await openai.chat.completions.create({
        model: defaultModel,
        temperature: 0.3,
        stream: true,
        messages: [
          {
            role: "system",
            content: quickQuizSystemMessage
          },
          {
            role: "user",
            content: `Given this topic study sheet as context:
            """${studySheet}"""
            Generate a short answer quiz question based on the following fact the student previously got incorrect:
              """${randomRecallFact}"""
              Important: Do not provide the answer when generating the question or mention the fact used to generate quiz question.`
          }
        ]
      })
      newStudyState = "quick_quiz_answer"
      stream = OpenAIStream(chatStreamResponse)
      return new StreamingTextResponse(stream, {
        headers: {
          "NEW-STUDY-STATE": newStudyState
        }
      })
    case "quick_quiz_answer":
    case "quick_quiz_finished_hide_input":
      const previousQuizQuestion = messages[messages.length - 2].content
      const finalFeeback = noMoreQuizQuestions
        ? "Finally advise the student there are no more quiz questions available. Come back again another time."
        : ""

      chatStreamResponse = await openai.chat.completions.create({
        model: defaultModel,
        temperature: 0.3,
        stream: true,
        messages: [
          {
            role: "system",
            content: `${quickQuizSystemMessage}.  Always provide the answer when giving feedback to the student. If the students answers "I don't know.", just give the answer.`
          },
          {
            role: "user",
            content: `Provide feedback and answer to the following quiz question:
            """${previousQuizQuestion}"""
            Based on the following student response:
            """${studentMessage.content}"""
            Given this topic study sheet as context:
            """${studySheet}"""
            ${finalFeeback}
            `
          }
        ]
      })
      newStudyState =
        studyState === "quick_quiz_finished_hide_input"
          ? "quick_quiz_finished_hide_input"
          : "quick_quiz_ready_hide_input"
      stream = OpenAIStream(chatStreamResponse)
      return new StreamingTextResponse(stream, {
        headers: {
          "NEW-STUDY-STATE": newStudyState
        }
      })

    default:
      // Handle other states or error
      throw new Error("Invalid study state")
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getServerProfile()
    checkApiKey(profile.deepinfra_api_key, "Deep infra")
    const json = await request.json()
    const {
      messages,
      chatId,
      studyState,
      studySheet,
      chatRecallMetadata,
      randomRecallFact
    } = json

    const studentMessage = messages[messages.length - 1]

    const quickResponse = getQuickResponseByUserText(studentMessage.content)
    if (quickResponse && quickResponse.responseText !== "{{LLM}}") {
      let responseText
      let newStudyState: StudyState = quickResponse.newStudyState

      switch (quickResponse.responseText) {
        case "{{DB}}":
          // for now assume its a topic update
          const topicContent = messages[messages.length - 2].content
          const functionResponse = await functionCalledByLLM(
            "updateTopicContent",
            { content: topicContent },
            chatId
          )
          if (functionResponse.success === false) {
            responseText = "Server error saving topic content."
            newStudyState = "topic_describe_upload"
          } else {
            responseText = "Save successful."
          }
          break
        case "{{topicDescription}}":
          responseText = studySheet
          break
        default:
          responseText = quickResponse.responseText
          break
      }

      return new Response(responseText, {
        status: 200,
        headers: {
          "NEW-STUDY-STATE": newStudyState
        }
      })
    }

    const openai = new OpenAI({
      apiKey: profile.deepinfra_api_key || "",
      baseURL: "https://api.deepinfra.com/v1/openai"
    })

    const noMoreQuizQuestions = studyState === "quick_quiz_finished_hide_input"

    const response = await callLLM(
      chatId,
      openai,
      studySheet,
      messages,
      studyState,
      studentMessage,
      chatRecallMetadata,
      randomRecallFact,
      noMoreQuizQuestions
    )

    return response
  } catch (error: any) {
    console.error(error)
    const errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
