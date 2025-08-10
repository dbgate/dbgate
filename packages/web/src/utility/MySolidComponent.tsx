import { createSignal } from "solid-js";

export default function MySolidComponent(props) {
  const [count, setCount] = createSignal(0);

  return (
    <div style="border: 1px solid gray; padding: 10px;">
      <p>Hello from Solid ({props.message})! Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>Increment</button>
    </div>
  );
}