import React from "react";
import useFetch from "./useFetch";
import "./index.css";
import Screen from "./Screen";
import {CurrentWidgetProvider} from "./widgets/useCurrentWidget";

function App() {
  const resp = useFetch("http://localhost:3000", {});
  console.log("FETCH data", resp.data);
  return (
    <CurrentWidgetProvider>
      <Screen />
    </CurrentWidgetProvider>
  );
}

export default App;
