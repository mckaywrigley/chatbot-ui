import { FC } from "react"

interface QuickResponseProps {
  selectedAssistant: { name: string } | null
  handleClick: (message: string) => void
  topicDescription: string
}

const QuickResponse: FC<QuickResponseProps> = ({
  selectedAssistant,
  handleClick,
  topicDescription
}) => {
  let buttonTexts = {
    button1: "",
    button2: ""
  }

  if (
    selectedAssistant?.name === "Topic creation tutor" &&
    topicDescription.length > 0
  ) {
    buttonTexts.button1 = "Schedule a test in 12 hours."
    buttonTexts.button2 = "Test me now"
  } else if (
    selectedAssistant?.name === "Study coach" &&
    topicDescription.length > 0
  ) {
    buttonTexts.button1 = "Proceed to scoring"
    buttonTexts.button2 = "Give me a hint"
  }

  // Check if any of the conditions are met before returning the JSX.
  if (buttonTexts.button1 && buttonTexts.button2) {
    return (
      <div className="flex justify-between space-x-4">
        <div className="w-1/2">
          <button
            className="w-full rounded-md border border-blue-500 px-4 py-2 text-blue-500 transition-colors hover:bg-blue-500 hover:text-white"
            onClick={() => handleClick(buttonTexts.button1)}
          >
            {buttonTexts.button1}
          </button>
        </div>
        <div className="w-1/2">
          <button
            className="w-full rounded-md border border-blue-500 px-4 py-2 text-blue-500 transition-colors hover:bg-blue-500 hover:text-white"
            onClick={() => handleClick(buttonTexts.button2)}
          >
            {buttonTexts.button2}
          </button>
        </div>
      </div>
    )
  } else {
    // Return null or a placeholder when conditions are not met
    return null
  }
}

export default QuickResponse
