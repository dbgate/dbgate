import React from 'react';
import _ from 'lodash';
import { TabPage, TabControl } from '../widgets/TabControl';
import useSocket from '../utility/SocketProvider';
import JslDataGrid from './JslDataGrid';

export default function ResultTabs({ children, sessionId, executeNumber }) {
  const socket = useSocket();
  const [resultInfos, setResultInfos] = React.useState([]);

  const handleResultSet = React.useCallback(props => {
    const { jslid, resultIndex } = props;
    setResultInfos(array => [...array, { jslid, resultIndex }]);
  }, []);

  React.useEffect(() => {
    setResultInfos([]);
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
    <TabControl activePageLabel={resultInfos.length > 0 ? 'Result 1' : null}>
      {children}
      {_.sortBy(resultInfos, 'resultIndex').map(info => (
        <TabPage label={`Result ${info.resultIndex + 1}`} key={info.jslid}>
          <JslDataGrid jslid={info.jslid} key={info.jslid} />
        </TabPage>
      ))}
    </TabControl>
  );
}
