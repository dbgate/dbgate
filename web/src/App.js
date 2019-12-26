import React from "react";
import useFetch from "./useFetch";
import "./index.css";
import Screen from './Screen'


function App() {
  const resp = useFetch("http://localhost:3000", {});
  console.log("FETCH data", resp.data);
  return <Screen/>;
}

export default App;
