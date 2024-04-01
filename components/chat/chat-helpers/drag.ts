export function dragHelper(e: {
  preventDefault: () => void
  currentTarget: any
  clientX: any
}) {
  e.preventDefault() // Prevents the click event after dragging
  const el = e.currentTarget
  let isDragging = false
  let posX = e.clientX
  let scrollLeft = el.scrollLeft
  function onMouseMove(e: { clientX: number }) {
    isDragging = true
    const dx = e.clientX - posX
    el.scrollLeft = scrollLeft - dx
  }
  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove)
    el.style.cursor = "grab"
    if (isDragging) {
      el.addEventListener("click", preventClick, { once: true })
    }
    isDragging = false
  }
  function preventClick(e: { stopPropagation: () => void }) {
    e.stopPropagation() // Prevents the click event from firing after dragging
  }
  document.addEventListener("mousemove", onMouseMove)
  document.addEventListener("mouseup", onMouseUp, { once: true })
  el.style.cursor = "grabbing"
}
