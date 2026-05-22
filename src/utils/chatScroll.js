import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

function scrollElementToBottom(scrollElement) {
  scrollElement.scrollTop = scrollElement.scrollHeight
}

export function useChatAutoScroll({ bottomKey, panelHeight, resetKey, enabled = true, bottomThreshold = 96 } = {}) {
  const scrollRef = useRef(null)
  const pinnedToBottomRef = useRef(true)
  const animationFrameIdsRef = useRef([])
  const timeoutIdsRef = useRef([])

  const clearScheduledScrolls = useCallback(() => {
    animationFrameIdsRef.current.forEach((frameId) => window.cancelAnimationFrame(frameId))
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    animationFrameIdsRef.current = []
    timeoutIdsRef.current = []
  }, [])

  const scrollToLatestMessage = useCallback(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    clearScheduledScrolls()

    const scrollNow = () => {
      const scrollElement = scrollRef.current
      if (scrollElement) {
        scrollElementToBottom(scrollElement)
      }
    }

    scrollNow()

    const firstFrameId = window.requestAnimationFrame(() => {
      scrollNow()

      const secondFrameId = window.requestAnimationFrame(scrollNow)
      animationFrameIdsRef.current.push(secondFrameId)
    })

    animationFrameIdsRef.current.push(firstFrameId)

    ;[80, 180, 360].forEach((delay) => {
      timeoutIdsRef.current.push(window.setTimeout(scrollNow, delay))
    })
  }, [clearScheduledScrolls, enabled])

  const forceStickToBottom = useCallback(() => {
    pinnedToBottomRef.current = true
    scrollToLatestMessage()
  }, [scrollToLatestMessage])

  const handleScroll = useCallback(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) {
      return
    }

    const distanceFromBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight
    pinnedToBottomRef.current = distanceFromBottom <= bottomThreshold
  }, [bottomThreshold])

  useLayoutEffect(() => {
    if (!enabled) {
      return
    }

    forceStickToBottom()
  }, [enabled, forceStickToBottom, resetKey])

  useLayoutEffect(() => {
    if (!enabled || !bottomKey || !pinnedToBottomRef.current) {
      return
    }

    scrollToLatestMessage()
  }, [bottomKey, enabled, scrollToLatestMessage])

  useLayoutEffect(() => {
    if (!enabled || !pinnedToBottomRef.current) {
      return
    }

    scrollToLatestMessage()
  }, [enabled, panelHeight, scrollToLatestMessage])

  useEffect(() => {
    if (!enabled || typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const scrollElement = scrollRef.current
    if (!scrollElement) {
      return undefined
    }

    const resizeObserver = new ResizeObserver(() => {
      if (pinnedToBottomRef.current) {
        scrollToLatestMessage()
      }
    })

    resizeObserver.observe(scrollElement)
    Array.from(scrollElement.children).forEach((child) => resizeObserver.observe(child))

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            resizeObserver.observe(node)
          }
        })
      })

      if (pinnedToBottomRef.current) {
        scrollToLatestMessage()
      }
    })

    mutationObserver.observe(scrollElement, { childList: true })

    return () => {
      mutationObserver.disconnect()
      resizeObserver.disconnect()
    }
  }, [enabled, scrollToLatestMessage])

  useEffect(() => clearScheduledScrolls, [clearScheduledScrolls])

  return {
    forceStickToBottom,
    handleScroll,
    scrollRef,
    scrollToLatestMessage,
  }
}
