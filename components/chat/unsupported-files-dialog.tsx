import React from "react"
import Modal from "@/components/chat/dialog-portal"

interface UnsupportedFilesDialogProps {
  isOpen: boolean
  pendingFiles: File[]
  onCancel: () => void
  onConfirm: () => void
}

export const UnsupportedFilesDialog: React.FC<UnsupportedFilesDialogProps> = ({
  isOpen,
  pendingFiles,
  onCancel,
  onConfirm
}) => {
  return (
    <Modal isOpen={isOpen}>
      <div className="bg-background/20 size-screen fixed inset-0 z-50 backdrop-blur-sm"></div>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background w-full max-w-lg rounded-md p-10 text-center">
          <p>The following file extensions are currently not supported:</p>
          <ul className="mt-4">
            {pendingFiles.map(file => (
              <li key={file.name}>
                <b>.{file.name.split(".").pop()?.toLowerCase()}</b> -{" "}
                {file.name}
              </li>
            ))}
          </ul>
          <p className="mt-4">
            Would you like to convert their content into a text format?
          </p>
          <div className="mt-5 flex justify-center gap-5">
            <button
              onClick={onCancel}
              className="ring-offset-background focus-visible:ring-ring bg-input text-primary hover:bg-input/90 flex h-[36px] items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="ring-offset-background focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 flex h-[36px] items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Convert
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
