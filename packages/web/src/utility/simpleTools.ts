import getElectron from './getElectron';

export function openWebLink(href, usePopup = false) {
  const electron = getElectron();

  if (electron) {
    electron.send('open-link', href);
  } else {
    if (usePopup) {
      const w = 500;
      const h = 650;

      const dualScreenLeft = window.screenLeft ?? window.screenX; // X of parent
      const dualScreenTop = window.screenTop ?? window.screenY; // Y of parent

      // 2. How big is the parent window?
      const parentWidth = window.outerWidth;
      const parentHeight = window.outerHeight;

      // 3. Centre the popup inside that rectangle
      const left = dualScreenLeft + (parentWidth - w) / 2;
      const top = dualScreenTop + (parentHeight - h) / 2;

      const features = [
        `width=${w}`,
        `height=${h}`,
        `left=${left}`,
        `top=${top}`,
        'scrollbars=yes',
        'resizable=yes',
        'noopener',
        'noreferrer',
      ];

      window.open(href, 'dbgateCloudLoginPopup', features.join(','));
    } else {
      window.open(href, '_blank');
    }
  }
}
