import { useCallback, useEffect, useRef, useState } from 'react'

const mobileInputSelector = 'input, textarea, select, [contenteditable="true"]'
const focusedBottomGapFallback = 8
let keyboardPanelLockCount = 0

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
  const lastLayoutRef = useRef({ height: null, keyboard: false, top: 0 })
  const focusedPanelInputRef = useRef(false)
  const timeoutIdsRef = useRef([])
  const [panelLayout, setPanelLayout] = useState({ height: null, keyboard: false, top: 0 })

  const clearTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    timeoutIdsRef.current = []
  }, [])

  const measurePanelHeight = useCallback(() => {
    const panel = panelRef.current

    if (!panel || !window.matchMedia('(max-width: 639px)').matches) {
      lastLayoutRef.current = { height: null, keyboard: false, top: 0 }
      focusedPanelInputRef.current = false
      setPanelLayout((currentLayout) => (
        currentLayout.height === null && !currentLayout.keyboard && currentLayout.top === 0
          ? currentLayout
          : { height: null, keyboard: false, top: 0 }
      ))
      return
    }

    const visualViewport = window.visualViewport
    const activeElement = document.activeElement
    const viewportHeight = visualViewport?.height ?? window.innerHeight
    const composerFocused = Boolean(activeElement?.matches?.(mobileInputSelector) && panel.contains(activeElement))

    if (composerFocused) {
      focusedPanelInputRef.current = true
    } else if (!activeElement?.matches?.(mobileInputSelector)) {
      focusedPanelInputRef.current = false
    }

    const keyboardVisible = focusedPanelInputRef.current
    let nextLayout

    if (keyboardVisible) {
      nextLayout = {
        height: Math.max(1, Math.floor(viewportHeight - focusedBottomGapFallback)),
        keyboard: true,
        top: 0,
      }
    } else {
      const navHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-bottom-nav-height')) || 0
      const viewportTop = window.scrollY + (visualViewport?.offsetTop ?? 0)
      const viewportBottom = viewportTop + viewportHeight
      const panelTop = panel.getBoundingClientRect().top + window.scrollY
      const bottomReserve = composerFocused ? focusedBottomGap : navHeight + idleBottomGap
      const availableHeight = Math.floor(viewportBottom - panelTop - bottomReserve)

      nextLayout = {
        height: Math.max(minimumHeight, availableHeight),
        keyboard: false,
        top: 0,
      }
    }

    const currentLayout = lastLayoutRef.current
    const heightChanged = currentLayout.height === null || Math.abs(currentLayout.height - nextLayout.height) >= 3
    const topChanged = Math.abs(currentLayout.top - nextLayout.top) >= 3

    if (!heightChanged && !topChanged && currentLayout.keyboard === nextLayout.keyboard) {
      return
    }

    lastLayoutRef.current = nextLayout
    setPanelLayout(nextLayout)
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
    window.addEventListener('orientationchange', settlePanelHeight)
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
      window.removeEventListener('orientationchange', settlePanelHeight)
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

  useEffect(() => {
    if (!panelLayout.keyboard || typeof document === 'undefined') {
      return undefined
    }

    keyboardPanelLockCount += 1
    document.documentElement.classList.add('chat-keyboard-panel-active')

    return () => {
      keyboardPanelLockCount = Math.max(0, keyboardPanelLockCount - 1)
      if (keyboardPanelLockCount === 0) {
        document.documentElement.classList.remove('chat-keyboard-panel-active')
      }
    }
  }, [panelLayout.keyboard])

  return [panelRef, panelLayout.height, panelLayout.keyboard, panelLayout.top]
}

/**
 * Returns the visual-viewport height as a JS number on mobile (≤640 px wide),
 * or null on desktop. Updates whenever the keyboard opens/closes so a modal
 * can apply it as an inline `style={{ height: vpHeight + 'px' }}`, keeping the
 * modal's content entirely above the on-screen keyboard with no CSS-variable
 * timing mismatch.
 */
export function useModalViewportHeight() {
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches

  const [height, setHeight] = useState(() => {
    if (!isMobile) return null
    return Math.round(window.visualViewport?.height ?? window.innerHeight)
  })

  useEffect(() => {
    if (!window.matchMedia('(max-width: 640px)').matches) return undefined

    let frameId = 0
    const timeoutIds = []

    function measure() {
      setHeight(Math.round(window.visualViewport?.height ?? window.innerHeight))
    }

    function settle() {
      if (frameId) window.cancelAnimationFrame(frameId)
      timeoutIds.forEach((id) => window.clearTimeout(id))
      timeoutIds.length = 0

      frameId = window.requestAnimationFrame(() => {
        frameId = window.requestAnimationFrame(() => {
          frameId = 0
          measure()
        })
      })

      ;[60, 160, 320].forEach((delay) => {
        timeoutIds.push(window.setTimeout(measure, delay))
      })
    }

    settle()
    window.addEventListener('resize', settle)
    window.addEventListener('focusin', settle)
    window.addEventListener('focusout', settle)
    window.visualViewport?.addEventListener('resize', settle)
    window.visualViewport?.addEventListener('scroll', settle)

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      timeoutIds.forEach((id) => window.clearTimeout(id))
      window.removeEventListener('resize', settle)
      window.removeEventListener('focusin', settle)
      window.removeEventListener('focusout', settle)
      window.visualViewport?.removeEventListener('resize', settle)
      window.visualViewport?.removeEventListener('scroll', settle)
    }
  }, [])

  return height // null on desktop, measured px on mobile
}
