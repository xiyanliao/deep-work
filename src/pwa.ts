if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)
      })
      .catch((error) => {
        console.error('SW registration failed', error)
      })
  })

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}
