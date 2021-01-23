import io from 'socket.io-client';
import React from 'react';
import resolveApi from './resolveApi';
import { cacheClean } from './cache';

const SocketContext = React.createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = React.useState();
  React.useEffect(() => {
    // const newSocket = io('http://localhost:3000', { transports: ['websocket'] });
    const newSocket = io(resolveApi());
    setSocket(newSocket);
    newSocket.on('clean-cache', reloadTrigger => cacheClean(reloadTrigger));
  }, []);
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export default function useSocket() {
  return React.useContext(SocketContext);
}
