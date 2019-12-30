import React from "react";

const CurrentWidgetProviderContext = React.createContext();

export function CurrentWidgetProvider({ children }) {
  const [currentWidget, setCurrentWidget] = React.useState('database');
  return (
    <CurrentWidgetProviderContext.Provider value={[currentWidget, setCurrentWidget]}>
      {children}
    </CurrentWidgetProviderContext.Provider>
  );
}

export default function useCurrentWidget() {
  return React.useContext(CurrentWidgetProviderContext)[0];
}

export function useSetCurrentWidget() {
  return React.useContext(CurrentWidgetProviderContext)[1];
}
