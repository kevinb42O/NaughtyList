import { useEffect } from 'react'

const mobileInputSelector = 'input, textarea, select, [contenteditable="true"]'

export function useMobileModalFocusScroll({ open, dialogRef, scrollRef }) {
  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return undefined
    }

    let frameId = 0
    const timeoutIds = []

    const clearScheduledReveal = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
        frameId = 0
      }

      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
      timeoutIds.length = 0
    }

    const revealFocusedField = () => {
      if (!window.matchMedia('(max-width: 640px)').matches) {
        return
      }

      const dialog = dialogRef.current
      const scrollElement = scrollRef.current
      const activeElement = document.activeElement

      if (!(dialog instanceof HTMLElement) || !(scrollElement instanceof HTMLElement)) {
        return
      }

      if (!(activeElement instanceof HTMLElement) || !activeElement.matches(mobileInputSelector) || !dialog.contains(activeElement)) {
        return
      }

      // Manually scroll only the scroll container – avoids the iOS Safari bug
      // where scrollIntoView() scrolls the window instead of the element,
      // pushing the focused field behind the keyboard.
      const fieldRect = activeElement.getBoundingClientRect()
      const containerRect = scrollElement.getBoundingClientRect()
      const fieldRelativeTop = fieldRect.top - containerRect.top
      const targetDelta = fieldRelativeTop - (containerRect.height / 2 - fieldRect.height / 2)
      scrollElement.scrollTop = Math.max(0, scrollElement.scrollTop + targetDelta)
    }

    const queueReveal = () => {
      clearScheduledReveal()
      revealFocusedField()

      frameId = window.requestAnimationFrame(() => {
        frameId = window.requestAnimationFrame(() => {
          frameId = 0
          revealFocusedField()
        })
      })

      ;[120, 260, 420].forEach((delay) => {
        timeoutIds.push(window.setTimeout(revealFocusedField, delay))
      })
    }

    const dialog = dialogRef.current

    dialog?.addEventListener('focusin', queueReveal)
    window.visualViewport?.addEventListener('resize', queueReveal)
    window.visualViewport?.addEventListener('scroll', queueReveal)

    return () => {
      clearScheduledReveal()
      dialog?.removeEventListener('focusin', queueReveal)
      window.visualViewport?.removeEventListener('resize', queueReveal)
      window.visualViewport?.removeEventListener('scroll', queueReveal)
    }
  }, [dialogRef, open, scrollRef])
}