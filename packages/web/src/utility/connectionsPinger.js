import _ from 'lodash';
import { openedConnections, currentDatabase } from '../stores';
import axiosInstance from './axiosInstance';

const doServerPing = value => {
  axiosInstance().post('server-connections/ping', { connections: value });
};

const doDatabasePing = value => {
  const database = _.get(value, 'name');
  const conid = _.get(value, 'connection._id');
  if (conid && database) {
    axiosInstance().post('database-connections/ping', { conid, database });
  }
};

let openedConnectionsHandle = null;
openedConnections.subscribe(value => {
  doServerPing(value);
  if (openedConnectionsHandle) window.clearInterval(openedConnectionsHandle);
  openedConnectionsHandle = window.setInterval(() => doServerPing(value), 30 * 1000);
});

let currentDatabaseHandle = null;
currentDatabase.subscribe(value => {
  doDatabasePing(value);
  if (currentDatabaseHandle) window.clearInterval(currentDatabaseHandle);
  currentDatabaseHandle = window.setInterval(() => doDatabasePing(value), 30 * 1000);
});
