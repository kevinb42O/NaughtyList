import { useCallback, useEffect, useRef, useState } from 'react'

const mobileInputSelector = 'input, textarea, select, [contenteditable="true"]'
const keyboardInsetThreshold = 80
const focusedBottomGapFallback = 8
let keyboardPanelLockCount = 0

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
  const lastLayoutRef = useRef({ height: null, keyboard: false, top: 0 })
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
      setPanelLayout((currentLayout) => (
        currentLayout.height === null && !currentLayout.keyboard && currentLayout.top === 0
          ? currentLayout
          : { height: null, keyboard: false, top: 0 }
      ))
      return
    }

    const visualViewport = window.visualViewport
    const activeElement = document.activeElement
    const composerFocused = Boolean(panel.contains(activeElement) && activeElement?.matches?.(mobileInputSelector))
    const viewportHeight = visualViewport?.height ?? window.innerHeight
    const keyboardVisible = composerFocused && (
      visualViewportKeyboardInset(visualViewport) > keyboardInsetThreshold ||
      viewportHeight < window.innerHeight - keyboardInsetThreshold
    )
    let nextLayout

    if (keyboardVisible) {
      nextLayout = {
        height: Math.max(1, Math.floor(viewportHeight - focusedBottomGapFallback)),
        keyboard: true,
        top: Math.max(0, Math.round(visualViewport?.offsetTop ?? 0)),
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
    const keyboardContinuing = currentLayout.keyboard && nextLayout.keyboard
    const heightChanged = currentLayout.height === null || (
      keyboardContinuing
        ? nextLayout.height < currentLayout.height - 3
        : Math.abs(currentLayout.height - nextLayout.height) >= 3
    )
    const topChanged = !keyboardContinuing && Math.abs(currentLayout.top - nextLayout.top) >= 3

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
