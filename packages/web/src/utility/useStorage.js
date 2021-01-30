import React from 'react';

export default function useStorage(key, storageObject, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = React.useState(() => {
    try {
      // Get from local storage by key
      const item = storageObject.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(error);
      return initialValue;
    }
  });
  const storedValueRef = React.useRef(storedValue);
  storedValueRef.current = storedValue;

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = React.useCallback(value => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValueRef.current) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      storageObject.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(error);
      console.log('Error saving storage value', key, value);
    }
  }, []);

  return [storedValue, setValue];
}
