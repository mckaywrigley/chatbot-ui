import React, { ReactNode } from "react"
import ReactDOM from "react-dom"

interface ModalProps {
  children: ReactNode
  isOpen: boolean
}

const Modal: React.FC<ModalProps> = ({ children, isOpen }) => {
  if (!isOpen) return null

  const portalRoot = document.getElementsByTagName("body")[0] as HTMLElement
  if (!portalRoot) return null

  return ReactDOM.createPortal(
    <div className="size-screen z-50">{children}</div>,
    portalRoot
  )
}

export default Modal
