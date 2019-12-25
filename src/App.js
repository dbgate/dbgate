import React from 'react';
import logo from './logo.svg';
import './App.css';
import useFetch from './useFetch';

function App() {
  const resp = useFetch('http://localhost:3000',{});
  console.log('FETCH', resp);
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload. {resp.data}
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
