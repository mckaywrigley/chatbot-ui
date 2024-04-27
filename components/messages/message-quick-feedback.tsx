import { Tables } from "@/supabase/types"
import { Button } from "../ui/button"

interface QuickFeedbackProps {
  handleBadResponseReason: (reason: string) => void
  feedback?: Tables<"feedback">
}

export const MessageQuickFeedback: React.FC<QuickFeedbackProps> = ({
  handleBadResponseReason,
  feedback
}) => {
  const feedbackOptions = [
    "Don't like the style",
    "Not factually correct",
    "Didn't fully follow instructions",
    "Refused when it shouldn't have",
    "Being lazy",
    "Other"
  ]
  return (
    <div className="quick-feedback rounded-lg border p-4 shadow-lg">
      <p className="mb-2">What was wrong?</p>
      <div className="flex flex-row flex-wrap items-start gap-2">
        {feedbackOptions.map(option => (
          <Button
            key={option}
            variant={feedback?.reason === option ? "default" : "outline"}
            size="sm"
            onClick={() => handleBadResponseReason(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  )
}
