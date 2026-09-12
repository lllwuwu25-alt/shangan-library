type Origin = { x: number; y: number }

const duration = 580
const easing = 'cubic-bezier(0.4, 0, 0.2, 1)'
let snapshotOwner: object | undefined

function revealSnapshots(update: () => void, origin?: Origin) {
  const html = document.documentElement
  const x = Math.max(0, Math.min(origin?.x ?? innerWidth / 2, innerWidth))
  const y = Math.max(0, Math.min(origin?.y ?? innerHeight / 2, innerHeight))
  const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 2
  const circle = (r: number) => `circle(${r}px at ${x}px ${y}px)`
  const owner = {}
  snapshotOwner = owner
  html.dataset.pageReveal = 'active'
  let animation: Animation | undefined
  let cancelled = false
  const transition = document.startViewTransition(() => { if (!cancelled) update() })
  const cancel = () => {
    cancelled = true
    animation?.cancel()
    transition.skipTransition()
  }
  const onVisibility = () => { if (document.hidden) cancel() }
  window.addEventListener('resize', cancel)
  document.addEventListener('visibilitychange', onVisibility)
  const finished = (async () => {
    try {
      // Both pages have already been painted into snapshots; only the reveal is animated.
      await transition.ready
      if (cancelled) return
      animation = html.animate([{ clipPath: circle(0) }, { clipPath: circle(radius) }], {
        duration, easing, fill: 'forwards', pseudoElement: '::view-transition-new(root)',
      })
      await animation.finished
    } catch {
      transition.skipTransition()
    } finally {
      await transition.finished.catch(() => {})
      animation?.cancel()
      if (snapshotOwner === owner) {
        delete html.dataset.pageReveal
        snapshotOwner = undefined
      }
      window.removeEventListener('resize', cancel)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  })()
  return { finished, cancel }
}

function retainPreviousPage(root: HTMLElement) {
  // Only these app surfaces can scroll independently. Avoid walking every text/icon node.
  const scrollSelector = '.overflow-auto, .overflow-x-auto, .overflow-y-auto, textarea, [data-transition-scroll]'
  const originals = Array.from(root.querySelectorAll(scrollSelector))
  const scrolled = originals.flatMap((node, index) => {
    const top = node.scrollTop
    const left = node.scrollLeft
    return top || left ? [{ index, top, left }] : []
  })
  const scrollX = window.scrollX
  const scrollY = window.scrollY
  const snapshot = document.createElement('div')
  snapshot.className = 'page-transition-previous'
  snapshot.inert = true
  snapshot.setAttribute('aria-hidden', 'true')
  const copy = root.cloneNode(true) as HTMLElement
  copy.removeAttribute('id')
  snapshot.append(copy)

  // DOM clones do not retain canvas pixels, select values or scroll positions.
  const media = root.querySelectorAll('canvas, select')
  const copiedMedia = copy.querySelectorAll('canvas, select')
  media.forEach((original, index) => {
    const cloned = copiedMedia[index]
    if (original instanceof HTMLCanvasElement && cloned instanceof HTMLCanvasElement && original.width && original.height) {
      cloned.getContext('2d')?.drawImage(original, 0, 0)
    }
    if (original instanceof HTMLSelectElement && cloned instanceof HTMLSelectElement) {
      cloned.value = original.value
    }
  })
  const copies = copy.querySelectorAll(scrollSelector)
  document.body.append(snapshot)
  for (const { index, top, left } of scrolled) {
    copies[index].scrollTop = top
    copies[index].scrollLeft = left
  }
  snapshot.scrollTop = scrollY
  snapshot.scrollLeft = scrollX
  return snapshot
}

// Prefer cached native snapshots; older WebViews use the same reveal on the live page.
export function startPageTransition(update: () => void, origin?: Origin) {
  if (typeof document.startViewTransition === 'function') return revealSnapshots(update, origin)
  const root = document.getElementById('root')!
  const previous = retainPreviousPage(root)
  const x = Math.max(0, Math.min(origin?.x ?? innerWidth / 2, innerWidth))
  const y = Math.max(0, Math.min(origin?.y ?? innerHeight / 2, innerHeight))
  const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 2
  const circle = (r: number) => `circle(${r}px at ${x}px ${y}px)`
  let animation: Animation | undefined
  let frame = 0
  let finishPreparation: (() => void) | undefined
  const previousInert = root.inert
  const previousClipPath = root.style.clipPath
  let cleaned = false
  const preventScroll = (event: Event) => event.preventDefault()
  const preventScrollKey = (event: KeyboardEvent) => {
    if ([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) event.preventDefault()
  }
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    cancelAnimationFrame(frame)
    finishPreparation?.()
    animation?.cancel()
    root.style.clipPath = previousClipPath
    root.classList.remove('page-transition-current')
    root.inert = previousInert
    previous.remove()
    window.removeEventListener('resize', cleanup)
    window.removeEventListener('wheel', preventScroll)
    window.removeEventListener('touchmove', preventScroll)
    window.removeEventListener('keydown', preventScrollKey)
    document.removeEventListener('visibilitychange', onVisibility)
  }
  const onVisibility = () => {
    if (document.hidden) cleanup()
  }

  root.classList.add('page-transition-current')
  root.style.clipPath = circle(0)
  root.inert = true
  window.addEventListener('resize', cleanup)
  window.addEventListener('wheel', preventScroll, { passive: false })
  window.addEventListener('touchmove', preventScroll, { passive: false })
  window.addEventListener('keydown', preventScrollKey)
  document.addEventListener('visibilitychange', onVisibility)

  const finished = (async () => {
    try {
      // Commit before the first animation frame so the circle contains the new UI.
      update()
      // Give layout and layer preparation a paint before starting the animation clock.
      // The previous page stays visible throughout these two frames.
      await new Promise<void>((resolve) => {
        finishPreparation = resolve
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => resolve())
        })
      })
      if (cleaned) return
      animation = root.animate([
        { clipPath: circle(0), offset: 0 },
        { clipPath: circle(radius), offset: 1 },
      ], { duration, easing, fill: 'forwards' })
      await animation.finished
    } catch {
      // A cancelled animation or unsupported effect must still leave a usable page.
    } finally {
      cleanup()
    }
  })()
  return { finished, cancel: cleanup }
}
