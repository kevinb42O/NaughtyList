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
  const [panelHeight, setPanelHeight] = useState(null)

  const updatePanelHeight = useCallback(() => {
    const panel = panelRef.current

    if (!panel || !window.matchMedia('(max-width: 639px)').matches) {
      setPanelHeight(null)
      return
    }

    const visualViewport = window.visualViewport
    const activeElement = document.activeElement
    const composerFocused = Boolean(panel.contains(activeElement) && activeElement?.matches?.(mobileInputSelector))
    const navHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-bottom-nav-height')) || 0
    const viewportTop = window.scrollY + (visualViewport?.offsetTop ?? 0)
    const viewportBottom = viewportTop + (visualViewport?.height ?? window.innerHeight)
    const panelTop = panel.getBoundingClientRect().top + window.scrollY
    const bottomReserve = composerFocused ? focusedBottomGap : navHeight + idleBottomGap
    const availableHeight = Math.floor(viewportBottom - panelTop - bottomReserve)

    setPanelHeight(Math.max(minimumHeight, availableHeight))
  }, [focusedBottomGap, idleBottomGap, minimumHeight])

  useEffect(() => {
    updatePanelHeight()

    const delayedUpdate = window.setTimeout(updatePanelHeight, 80)
    window.addEventListener('resize', updatePanelHeight)
    window.addEventListener('scroll', updatePanelHeight, { passive: true })
    window.addEventListener('focusin', updatePanelHeight)
    window.addEventListener('focusout', updatePanelHeight)
    window.visualViewport?.addEventListener('resize', updatePanelHeight)
    window.visualViewport?.addEventListener('scroll', updatePanelHeight)

    return () => {
      window.clearTimeout(delayedUpdate)
      window.removeEventListener('resize', updatePanelHeight)
      window.removeEventListener('scroll', updatePanelHeight)
      window.removeEventListener('focusin', updatePanelHeight)
      window.removeEventListener('focusout', updatePanelHeight)
      window.visualViewport?.removeEventListener('resize', updatePanelHeight)
      window.visualViewport?.removeEventListener('scroll', updatePanelHeight)
    }
  }, [updatePanelHeight])

  useEffect(() => {
    updatePanelHeight()

    const delayedUpdate = window.setTimeout(updatePanelHeight, 80)

    return () => window.clearTimeout(delayedUpdate)
  }, [dependencyKey, updatePanelHeight])

  return [panelRef, panelHeight]
}