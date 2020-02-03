import io from 'socket.io-client';
import React from 'react';

const SocketContext = React.createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = React.useState();
  React.useEffect(() => {
    // const newSocket = io('http://localhost:3000', { transports: ['websocket'] });
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);
  }, []);
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export default function useSocket() {
  return React.useContext(SocketContext);
}
