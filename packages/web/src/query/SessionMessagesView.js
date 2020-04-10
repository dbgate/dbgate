import React from 'react';
import MessagesView from './MessagesView';
import useSocket from '../utility/SocketProvider';

export default function SessionMessagesView({ sessionId, onMessageClick }) {
  const [messages, setMessages] = React.useState([]);
  const socket = useSocket();

  const handleInfo = React.useCallback((info) => setMessages((items) => [...items, info]), []);

  React.useEffect(() => {
    if (sessionId && socket) {
      socket.on(`session-info-${sessionId}`, handleInfo);
      return () => {
        socket.off(`session-info-${sessionId}`, handleInfo);
      };
    }
  }, [sessionId, socket]);

  return <MessagesView items={messages} onMessageClick={onMessageClick} />;
}
