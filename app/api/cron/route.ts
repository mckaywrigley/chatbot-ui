import {
  getChatsByReviseDate,
  getUserEmailById
} from "@/lib/server/server-chat-helpers"
import { Tables } from "@/supabase/types"
import type { NextRequest } from "next/server"
import * as postmark from "postmark"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Set cutoff date to end of today
    const cutoffDate = new Date()
    cutoffDate.setHours(23, 59, 59, 999)

    // Search all chats in DB and return array where revise_date is before now

    const chats = await getChatsByReviseDate(cutoffDate, request)
    console.log(
      "Valid topics due for revision in this time period: ",
      chats.length
    )

    // Group chats by user_id
    let emailsToSend = []
    const chatsByUserId = chats.reduce(
      (acc: Record<string, Tables<"chats">[]>, chat) => {
        acc[chat.user_id] = acc[chat.user_id] || []
        acc[chat.user_id].push(chat)
        return acc
      },
      {}
    )

    // Construct email for each user
    for (const userId in chatsByUserId) {
      const userEmail = await getUserEmailById(userId)
      const userChats = chatsByUserId[userId]
      const htmlBody =
        `A recall session is due today for each of these topics:<br>` +
        userChats
          .map(
            chat =>
              `* <a href="https://app.learntime.ai/${chat.workspace_id}/chat/${chat.id}">${chat.name}</a>`
          )
          .join("<br>")

      emailsToSend.push({
        From: "ger@learntime.ai",
        To: userEmail,
        Subject: "LearnTime: Recall Session Reminder",
        HtmlBody: htmlBody,
        MessageStream: "outbound"
      })
    }

    let success = false

    const serverToken = process.env.POSTMARK_SERVER_TOKEN
    if (!serverToken) {
      throw new Error("POSTMARK_SERVER_TOKEN is not defined")
    }

    let client = new postmark.ServerClient(serverToken)

    console.log("Client", { client })

    console.log("Emails to send", JSON.stringify(emailsToSend))

    client
      .getMessageStreams({
        includeArchivedStreams: true,
        messageStreamType: "Transactional"
      })
      .then(result => {
        const stream = result.MessageStreams[0]
        console.log(result.TotalCount)
        console.log(stream.Name)
        console.log(stream.Description)
      })

    // Send emails in batch
    if (emailsToSend.length > 0) {
      client.sendEmailBatch(emailsToSend).then(response => {
        console.log(response[0].To)
        console.log(response[0].SubmittedAt)
        console.log(response[0].Message) // Ok
        console.log(response[0].MessageID)
        console.log(response[0].ErrorCode)
      })
      success = true
    }

    return new Response(JSON.stringify({ success }), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (error: any) {
    console.error(error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500
      }
    )
  }
}
