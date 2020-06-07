import _ from 'lodash';
import React from 'react';
import MessagesView from './MessagesView';
import useSocket from '../utility/SocketProvider';

export default function SocketMessagesView({ eventName, onMessageClick = undefined, executeNumber }) {
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
    if (eventName && socket) {
      socket.on(eventName, handleInfo);
      return () => {
        socket.off(eventName, handleInfo);
      };
    }
  }, [eventName, socket]);

  return <MessagesView items={displayedMessages} onMessageClick={onMessageClick} />;
}
