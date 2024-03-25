import { QuickResponse, getQuickResponses } from "@/lib/studyStates"
import { useContext } from "react"
import { ChatbotUIContext } from "@/context/context"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { IconSend } from "@tabler/icons-react"

const QuickResponse = () => {
  const { chatMessages, chatStudyState } = useContext(ChatbotUIContext)

  const { handleSendMessage } = useChatHandler()

  const handleQuickResponse = async (message: string) => {
    handleSendMessage(message, chatMessages, false)
  }

  const quickResponses = getQuickResponses(chatStudyState)

  const widthClass = (index: number): string => {
    const totalButtons = quickResponses.length
    if (totalButtons === 1) return "w-full"
    // For the last button in an odd-numbered array, it should take full width
    if (totalButtons % 2 !== 0 && index === totalButtons - 1) return "w-full"
    return "w-1/2"
  }

  // Render buttons based on the available quickResponses
  return (
    <div className="flex flex-wrap">
      {quickResponses.map((quickResponse: QuickResponse, index) => (
        <div key={index} className={`${widthClass(index)} p-2`}>
          <button
            className="flex w-full items-center justify-between rounded-md border border-blue-500 px-4 py-2 text-left text-blue-500 transition-colors hover:bg-blue-500 hover:text-white"
            onClick={() => handleQuickResponse(quickResponse.quickText)}
          >
            <span>{quickResponse.quickText}</span>
            <IconSend size={20} />
          </button>
        </div>
      ))}
    </div>
  )
}

export default QuickResponse

// <div className="absolute bottom-full left-0 right-0">
//   <div className="relative h-full w-full">
//     <div className="h-full flex ml-1 md:w-full md:m-auto md:mb-4 gap-0 md:gap-2 justify-center">
//       <div className="grow"><div className="absolute bottom-full left-0 mb-4 flex w-full grow gap-2 px-1 pb-1 sm:px-2 sm:pb-0 md:static md:mb-0 md:max-w-none">
//         <div className="grid w-full grid-flow-row grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-2">
//         <div className="flex flex-col gap-2">
//           </div>
//           <div className="flex flex-col gap-2">
//           </div>
//         </div>
//       </div></div>
//     </div>
//   </div>
// </div>
