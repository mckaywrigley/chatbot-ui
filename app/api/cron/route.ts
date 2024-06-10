import {
  getChatsByDueDate,
  getUserEmailById
} from "@/lib/server/server-chat-helpers"
import { Tables } from "@/supabase/types"
import type { NextRequest } from "next/server"
import { ServerClient } from "postmark"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Search all chats in DB and return array where revise_date is today
  const chats = await getChatsByDueDate(request)
  console.log("Valid topics due for revision today: ", chats.length)

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
      Subject: "Learntime: Recall Session Reminder",
      HtmlBody: htmlBody,
      MessageStream: "outbound"
    })
  }

  const serverToken = process.env.POSTMARK_SERVER_TOKEN
  if (!serverToken) {
    return console.log("POSTMARK_SERVER_TOKEN is not defined")
  }

  let postmarkClient = new ServerClient(serverToken)

  console.log("Client", { client: postmarkClient })

  console.log("Emails to send: ", JSON.stringify(emailsToSend.map(e => e.To)))

  // Send emails in batch
  if (emailsToSend.length > 0) {
    try {
      const result = await postmarkClient.sendEmailBatch(emailsToSend)
      console.log(
        "Emails sent",
        JSON.stringify({ messageIds: result.map(r => r.MessageID) })
      )
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      })
    } catch (postmarkClientError: any) {
      console.log(postmarkClientError ?? "There was an error sending the email")
      return new Response(JSON.stringify({ success: false }), {
        headers: { "Content-Type": "application/json" }
      })
    }
  }
}
