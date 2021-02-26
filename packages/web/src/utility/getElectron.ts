export default function getElectron() {
  if (window['require']) {
    const electron = window['require']('electron');
    return electron;
  }
  return null;
}
