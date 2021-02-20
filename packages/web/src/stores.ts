import { writable } from 'svelte/store';

export const selectedWidget = writable('database');
export const openedConnections = writable([]);
export const currentDatabase = writable(null);

// export const leftPanelWidth = writable(300);
