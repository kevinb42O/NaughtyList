import { useCallback, useEffect, useRef, useState } from 'react'

const mobileInputSelector = 'input, textarea, select, [contenteditable="true"]'
const keyboardInsetThreshold = 80
const focusedTopGap = 6

function visualViewportKeyboardInset(visualViewport) {
  if (!visualViewport) {
    return 0
  }

  return Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop)
}

export function useMobileViewportPanelHeight(
  dependencyKey,
  {
    minimumHeight = 220,
    idleBottomGap = 14,
    focusedBottomGap = 10,
  } = {},
) {
  const panelRef = useRef(null)
  const frameRef = useRef(0)
  const focusedElementRef = useRef(null)
  const focusedSessionAnchoredRef = useRef(false)
  const lastHeightRef = useRef(null)
  const timeoutIdsRef = useRef([])
  const [panelHeight, setPanelHeight] = useState(null)

  const clearTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    timeoutIdsRef.current = []
  }, [])

  const measurePanelHeight = useCallback(() => {
    const panel = panelRef.current

    if (!panel || !window.matchMedia('(max-width: 639px)').matches) {
      lastHeightRef.current = null
      setPanelHeight((currentHeight) => (currentHeight === null ? currentHeight : null))
      return
    }

    const visualViewport = window.visualViewport
    const activeElement = document.activeElement
    const composerFocused = Boolean(panel.contains(activeElement) && activeElement?.matches?.(mobileInputSelector))

    if (composerFocused && focusedElementRef.current !== activeElement) {
      focusedElementRef.current = activeElement
      focusedSessionAnchoredRef.current = false
    } else if (!composerFocused) {
      focusedElementRef.current = null
      focusedSessionAnchoredRef.current = false
    }

    const navHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-bottom-nav-height')) || 0
    const viewportHeight = visualViewport?.height ?? window.innerHeight
    const viewportTop = window.scrollY + (visualViewport?.offsetTop ?? 0)
    const viewportBottom = viewportTop + viewportHeight
    const panelTop = panel.getBoundingClientRect().top + window.scrollY
    const panelVisualTop = panelTop - viewportTop
    const keyboardVisible = composerFocused && (
      visualViewportKeyboardInset(visualViewport) > keyboardInsetThreshold ||
      viewportHeight < window.innerHeight - keyboardInsetThreshold
    )

    if (keyboardVisible && !focusedSessionAnchoredRef.current && panelVisualTop > focusedTopGap + 1) {
      focusedSessionAnchoredRef.current = true
      window.scrollBy({ top: panelVisualTop - focusedTopGap, left: 0, behavior: 'auto' })
    }

    const bottomReserve = composerFocused ? focusedBottomGap : navHeight + idleBottomGap
    const availableHeight = Math.floor(viewportBottom - panelTop - bottomReserve)
    const nextHeight = Math.max(minimumHeight, availableHeight)

    if (lastHeightRef.current !== null && Math.abs(lastHeightRef.current - nextHeight) < 3) {
      return
    }

    lastHeightRef.current = nextHeight
    setPanelHeight(nextHeight)
  }, [focusedBottomGap, idleBottomGap, minimumHeight])

  const updatePanelHeight = useCallback(() => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current)
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = 0
        measurePanelHeight()
      })
    })
  }, [measurePanelHeight])

  const settlePanelHeight = useCallback(() => {
    clearTimeouts()
    updatePanelHeight()

    ;[60, 160, 320].forEach((delay) => {
      timeoutIdsRef.current.push(window.setTimeout(updatePanelHeight, delay))
    })
  }, [clearTimeouts, updatePanelHeight])

  useEffect(() => {
    settlePanelHeight()

    window.addEventListener('resize', settlePanelHeight)
    window.addEventListener('scroll', settlePanelHeight, { passive: true })
    window.addEventListener('focusin', settlePanelHeight)
    window.addEventListener('focusout', settlePanelHeight)
    window.visualViewport?.addEventListener('resize', settlePanelHeight)
    window.visualViewport?.addEventListener('scroll', settlePanelHeight)
    window.screen.orientation?.addEventListener?.('change', settlePanelHeight)

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
      }
      clearTimeouts()
      window.removeEventListener('resize', settlePanelHeight)
      window.removeEventListener('scroll', settlePanelHeight)
      window.removeEventListener('focusin', settlePanelHeight)
      window.removeEventListener('focusout', settlePanelHeight)
      window.visualViewport?.removeEventListener('resize', settlePanelHeight)
      window.visualViewport?.removeEventListener('scroll', settlePanelHeight)
      window.screen.orientation?.removeEventListener?.('change', settlePanelHeight)
    }
  }, [clearTimeouts, settlePanelHeight])

  useEffect(() => {
    settlePanelHeight()
  }, [dependencyKey, settlePanelHeight])

  return [panelRef, panelHeight]
}
