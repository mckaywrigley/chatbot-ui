import React, { useEffect, useState } from "react"
import Modal from "@/components/chat/dialog-portal"
import { Button } from "../ui/button"
import { Tables } from "@/supabase/types"

interface MessageDetailedFeedbackProps {
  isOpen: boolean
  onClose: () => void
  feedback: Tables<"feedback">
  onSendFeedback: (
    feedback: "good" | "bad",
    reason?: string,
    detailedFeedback?: string,
    allowSharing?: boolean,
    allowEmail?: boolean
  ) => void
}

const MessageDetailedFeedback: React.FC<MessageDetailedFeedbackProps> = ({
  isOpen,
  onClose,
  feedback,
  onSendFeedback
}) => {
  const [detailedFeedback, setDetailedFeedback] = useState(
    feedback?.detailed_feedback || ""
  )
  const [allowSharing, setAllowSharing] = useState(
    feedback?.allow_sharing || false
  )
  const [mayContact, setMayContact] = useState(feedback?.allow_email || false)

  useEffect(() => {
    setDetailedFeedback(feedback?.detailed_feedback ?? "")
    setAllowSharing(feedback?.allow_sharing ?? false)
    setMayContact(feedback?.allow_email ?? false)
  }, [
    feedback?.allow_email,
    feedback?.allow_sharing,
    feedback?.detailed_feedback
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSendFeedback(
      (feedback?.feedback as "good" | "bad") ?? "bad",
      feedback?.reason ?? "",
      detailedFeedback,
      allowSharing,
      mayContact
    )
    onClose()
  }

  return (
    <Modal isOpen={isOpen}>
      <div className="bg-background/20 size-screen fixed inset-0 z-50 backdrop-blur-sm"></div>

      <div className="fixed inset-0 z-50 flex items-center justify-center rounded-md  p-4 ">
        <div className="bg-background w-full max-w-lg rounded-md border p-10 shadow-lg">
          <h1 className="text-xl font-bold">Send feedback to HackerGPT</h1>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label htmlFor="feedback" className="text-sm">
              Describe your feedback
            </label>
            <textarea
              id="feedback"
              value={detailedFeedback}
              onChange={e => setDetailedFeedback(e.target.value)}
              placeholder="Tell us what prompted this feedback"
              className="mb-0 h-48 w-full rounded-md border px-2 pb-0 pt-2"
            ></textarea>
            <span className="m-0 pt-0 text-xs opacity-50">
              Please don&apos;t include any sensitive information. For example,
              don&apos;t include passwords, credit card numbers, and personal
              details.
            </span>
            <div>
              <input
                type="checkbox"
                id="shareConversation"
                checked={allowSharing}
                onChange={e => setAllowSharing(e.target.checked)}
              />
              <label htmlFor="shareConversation" className="ml-2 text-sm">
                Allow sharing the current conversation
              </label>
            </div>
            <div>
              <input
                type="checkbox"
                id="mayContact"
                checked={mayContact}
                onChange={e => setMayContact(e.target.checked)}
              />
              <label htmlFor="mayContact" className="ml-2 text-sm">
                We may email you for more information or updates
              </label>
            </div>
            <span className="m-0 pt-0 text-xs opacity-50">
              Some anonymous information may be sent to HackerGPT, like the
              selected plugin and model. We will use it to fix problems and
              improve our services.
            </span>

            <div className="flex justify-between">
              <Button onClick={onClose} variant={"secondary"}>
                Cancel
              </Button>
              <Button type="submit">Submit Feedback</Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  )
}

export default MessageDetailedFeedback
