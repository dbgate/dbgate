import { openedModals } from '../stores';
import { get } from 'svelte/store';
import uuidv1 from 'uuid/v1';
import _ from 'lodash';
import invalidateCommands from '../commands/invalidateCommands';

export function showModal(component, props = {}) {
  const modalId = uuidv1();
  openedModals.update(x => [...x, { component, modalId, props }]);
  invalidateCommands();
}

export function closeModal(modalId) {
  openedModals.update(x => x.filter(y => y.modalId != modalId));
  invalidateCommands();
}

export function closeCurrentModal() {
  openedModals.update(modals => modals.slice(0, modals.length - 1));
  invalidateCommands();
}

export function getActiveModalId() {
  const modals = get(openedModals);
  return modals[modals.length - 1]?.modalId;
}
