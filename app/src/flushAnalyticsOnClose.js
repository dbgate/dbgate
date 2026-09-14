module.exports = function flushAnalyticsOnClose(window, app) {
  let flushing = false;
  let flushed = false;
  let quitting = false;
  const onBeforeQuit = () => {
    quitting = true;
  };
  app.on('before-quit', onBeforeQuit);
  window.once('closed', () => app.removeListener('before-quit', onBeforeQuit));

  window.on('close', event => {
    if (flushed || window.webContents.isDestroyed()) return;
    event.preventDefault();
    if (flushing) return;
    flushing = true;

    // Allow the backend's five-second HTTP timeout to finish before exiting.
    let timer;
    const timeout = new Promise(resolve => {
      timer = setTimeout(resolve, 6000);
    });
    const flush = Promise.resolve().then(() =>
      window.webContents.executeJavaScript('window.dbgateFlushUsageAnalytics?.()')
    );
    void Promise.race([flush, timeout])
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        flushed = true;
        if (window.isDestroyed()) return;
        if (quitting) app.quit();
        else window.close();
      });
  });
};
