import React from 'react';
import { TabPage, TabControl } from '../widgets/TabControl';
import useSocket from '../utility/SocketProvider';
import JslDataGrid from './JslDataGrid';

export default function ResultTabs({ children, sessionId, executeNumber }) {
  const socket = useSocket();
  const [resultIds, setResultIds] = React.useState([]);

  const handleResultSet = (props) => {
    const { jslid } = props;
    setResultIds((ids) => [...ids, jslid]);
  };

  React.useEffect(() => {
    setResultIds([]);
  }, [executeNumber]);

  React.useEffect(() => {
    if (sessionId && socket) {
      socket.on(`session-recordset-${sessionId}`, handleResultSet);
      return () => {
        socket.off(`session-recordset-${sessionId}`, handleResultSet);
      };
    }
  }, [sessionId, socket]);

  return (
    <TabControl activePageIndex={resultIds.length > 0 ? 1 : 0}>
      {children}
      {resultIds.map((jslid, index) => (
        <TabPage label={`Result ${index + 1}`} key={index}>
          <JslDataGrid jslid={jslid} />
        </TabPage>
      ))}
    </TabControl>
  );
}
