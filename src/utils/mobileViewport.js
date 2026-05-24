import { useCallback, useEffect, useRef, useState } from 'react'

const mobileInputSelector = 'input, textarea, select, [contenteditable="true"]'

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
  const lastHeightRef = useRef(null)
  const [panelHeight, setPanelHeight] = useState(null)

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
    const navHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-bottom-nav-height')) || 0
    const viewportBottom = (visualViewport?.height ?? window.innerHeight) + (visualViewport?.offsetTop ?? 0)
    const panelTop = panel.getBoundingClientRect().top
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
      frameRef.current = 0
      measurePanelHeight()
    })
  }, [measurePanelHeight])

  useEffect(() => {
    updatePanelHeight()

    const delayedUpdate = window.setTimeout(updatePanelHeight, 80)
    window.addEventListener('resize', updatePanelHeight)
    window.addEventListener('focusin', updatePanelHeight)
    window.addEventListener('focusout', updatePanelHeight)
    window.visualViewport?.addEventListener('resize', updatePanelHeight)
    window.screen.orientation?.addEventListener?.('change', updatePanelHeight)

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
      }
      window.clearTimeout(delayedUpdate)
      window.removeEventListener('resize', updatePanelHeight)
      window.removeEventListener('focusin', updatePanelHeight)
      window.removeEventListener('focusout', updatePanelHeight)
      window.visualViewport?.removeEventListener('resize', updatePanelHeight)
      window.screen.orientation?.removeEventListener?.('change', updatePanelHeight)
    }
  }, [updatePanelHeight])

  useEffect(() => {
    updatePanelHeight()

    const delayedUpdate = window.setTimeout(updatePanelHeight, 80)

    return () => window.clearTimeout(delayedUpdate)
  }, [dependencyKey, updatePanelHeight])

  return [panelRef, panelHeight]
}
