import { openedModals } from '../stores';
import uuidv1 from 'uuid/v1';

export function showModal(component, props = {}) {
  const modalId = uuidv1();
  openedModals.update(x => [...x, { component, modalId, props }]);
}

export function closeModal(modalId) {
  openedModals.update(x => x.filter(y => y.modalId != modalId));
}
