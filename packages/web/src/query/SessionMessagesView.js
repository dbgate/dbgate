import _ from 'lodash';
import React from 'react';
import MessagesView from './MessagesView';
import useSocket from '../utility/SocketProvider';

export default function SessionMessagesView({ sessionId, onMessageClick, executeNumber }) {
  const [displayedMessages, setDisplayedMessages] = React.useState([]);
  const cachedMessagesRef = React.useRef([]);
  const socket = useSocket();

  const displayCachedMessages = React.useMemo(
    () =>
      _.throttle(() => {
        setDisplayedMessages([...cachedMessagesRef.current]);
      }, 500),
    []
  );

  const handleInfo = React.useCallback((info) => {
    cachedMessagesRef.current.push(info);
    displayCachedMessages();
  }, []);

  React.useEffect(() => {
    setDisplayedMessages([]);
    cachedMessagesRef.current = [];
  }, [executeNumber]);

  React.useEffect(() => {
    if (sessionId && socket) {
      socket.on(`session-info-${sessionId}`, handleInfo);
      return () => {
        socket.off(`session-info-${sessionId}`, handleInfo);
      };
    }
  }, [sessionId, socket]);

  return <MessagesView items={displayedMessages} onMessageClick={onMessageClick} />;
}
