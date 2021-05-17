let appIsLoaded = false;
let onLoad = [];

export function setAppLoaded() {
  appIsLoaded = true;
  for (const func of onLoad) {
    func();
  }
  onLoad = [];
}

export function getAppLoaded() {
  return appIsLoaded;
}

export function callWhenAppLoaded(callback) {
  if (appIsLoaded) {
    callback();
  } else {
    onLoad.push(callback);
  }
}
