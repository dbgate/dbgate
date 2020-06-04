import React from 'react';
import ReactDOM from 'react-dom';
import useModalState from './useModalState';

function ShowModalComponent({ renderModal, onClose }) {
  const modalState = useModalState(true);
  if (!modalState.isOpen) {
    onClose();
  }
  return renderModal(modalState);
}

const Context = React.createContext(null);

export function ModalLayerProvider({ children }) {
  const [modals, setModals] = React.useState([]);
  return <Context.Provider value={[modals, setModals]}>{children}</Context.Provider>;
}

export function ModalLayer() {
  const [modals, setModals] = React.useContext(Context);
  return (
    <div>
      {modals.map((modal, index) => (
        <ShowModalComponent
          key={index}
          renderModal={modal}
          onClose={() => setModals((x) => x.filter((y) => y != modal))}
        />
      ))}
    </div>
  );
}

export default function useShowModal() {
  const [modals, setModals] = React.useContext(Context);
  const showModal = (renderModal) => {
    setModals([...modals, renderModal]);
  };
  return showModal;
  // const container = document.createElement('div');
  // document.body.appendChild(container);
  // ReactDOM.render(<ShowModalComponent renderModal={renderModal} container={container} />, container);
}
