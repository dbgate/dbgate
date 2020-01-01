import React from "react";
import "./index.css";
import Screen from "./Screen";
import {CurrentWidgetProvider} from "./widgets/useCurrentWidget";

function App() {
  return (
    <CurrentWidgetProvider>
      <Screen />
    </CurrentWidgetProvider>
  );
}

export default App;
