import React from 'react';
import ModalBase from './ModalBase';
import FormStyledButton from '../widgets/FormStyledButton';
import styled from 'styled-components';
import ModalHeader from './ModalHeader';
import ModalFooter from './ModalFooter';
import ModalContent from './ModalContent';

const Wrapper = styled.div`
  display: flex;
`;

const OptionsWrapper = styled.div`
  margin-left: 10px;
`;

function RadioGroupItem({ text, value, defaultChecked = undefined, setMode }) {
  return (
    <div>
      <input
        type="radio"
        name="multiple_values_option"
        id={`multiple_values_option_${value}`}
        defaultChecked={defaultChecked}
        onClick={() => setMode(value)}
      />
      <label htmlFor={`multiple_values_option_${value}`}>{text}</label>
    </div>
  );
}

export default function FilterMultipleValuesModal({ modalState, onFilter }) {
  const editorRef = React.useRef(null);
  const [text, setText] = React.useState('');
  const [mode, setMode] = React.useState('is');
  React.useEffect(() => {
    setTimeout(() => {
      if (editorRef.current) editorRef.current.focus();
    }, 1);
  }, []);

  const handleOk = () => {
    onFilter(mode, text);
    modalState.close();
  };

  return (
    <ModalBase modalState={modalState}>
      <ModalHeader modalState={modalState}>Filter multiple values</ModalHeader>
      <ModalContent>
        <Wrapper>
          <textarea rows={10} ref={editorRef} value={text} onChange={(e) => setText(e.target.value)} />
          <OptionsWrapper>
            <RadioGroupItem text="Is one of line" value="is" defaultChecked setMode={setMode} />
            <RadioGroupItem text="Is not one of line" value="is_not" setMode={setMode} />
            <RadioGroupItem text="Contains" value="contains" setMode={setMode} />
            <RadioGroupItem text="Begins" value="begins" setMode={setMode} />
            <RadioGroupItem text="Ends" value="ends" setMode={setMode} />
          </OptionsWrapper>
        </Wrapper>
      </ModalContent>
      <ModalFooter>
        <FormStyledButton type="button" value="OK" onClick={handleOk} />
        <FormStyledButton type="button" value="Close" onClick={modalState.close} />
      </ModalFooter>
    </ModalBase>
  );
}
