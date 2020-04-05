import React from 'react';

export default function MessagesView({ items }) {
  return (
    <table>
      <tr>
        <th>Number</th>
        <th>Message</th>
        <th>Time</th>
        <th>Procedure</th>
        <th>Line</th>
      </tr>
      {items.map((row, index) => (
        <tr key={index}>
          <td>{index + 1}</td>
          <td>{row.message}</td>
          <td>{row.time}</td>
          <td>{row.procedure}</td>
          <td>{row.line}</td>
        </tr>
      ))}
    </table>
  );
}
