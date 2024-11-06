import getElectron from './getElectron';

export function openWebLink(href) {
  const electron = getElectron();

  if (electron) {
    electron.send('open-link', href);
  } else {
    window.open(href, '_blank');
  }
}
