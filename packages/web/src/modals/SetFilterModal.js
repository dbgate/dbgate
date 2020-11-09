import React from 'react';
import ModalBase from './ModalBase';
import FormStyledButton from '../widgets/FormStyledButton';
import styled from 'styled-components';
import { FormButtonRow, FormSubmit, FormSelectFieldRaw, FormRow, FormRadioGroupItem, FormTextFieldRaw } from '../utility/forms';
import ModalHeader from './ModalHeader';
import ModalFooter from './ModalFooter';
import ModalContent from './ModalContent';
import { Formik, Form } from 'formik';
import { TextField } from '../utility/inputs';

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

function Select({ filterType, name }) {
  return (
    <FormSelectFieldRaw name={name}>
      {filterType == 'number' && (
        <>
          <option value="=">eqals</option>
          <option value="<>">does not equal</option>
          <option value="<">is smaller</option>
          <option value=">">is greater</option>
          <option value="<=">is smaller or equal</option>
          <option value=">=">is greater or equal</option>
        </>
      )}
      {filterType == 'string' && (
        <>
          <option value="+">contains</option>
          <option value="~">does not contain</option>
          <option value="^">begins with</option>
          <option value="!^">does not begin with</option>
          <option value="$">ends with</option>
          <option value="!$">does not end with</option>
          <option value="=">equals</option>
          <option value="<>">does not equal</option>
          <option value="<">is smaller</option>
          <option value=">">is greater</option>
          <option value="<=">is smaller or equal</option>
          <option value=">=">is greater or equal</option>
        </>
      )}
      {filterType == 'datetime' && (
        <>
          <option value="=">eqals</option>
          <option value="<>">does not equal</option>
          <option value="<">is before</option>
          <option value=">">is after</option>
          <option value="<=">is before or equal</option>
          <option value=">=">is after or equal</option>
        </>
      )}
    </FormSelectFieldRaw>
  );
}

export default function SetFilterModal({ modalState, onFilter, filterType, condition1 }) {
  const editorRef = React.useRef(null);
  //   const [condition1, setValue1] = React.useState(condition);
  //   const [value2, setValue2] = React.useState('equals');
  //   const [mode, setMode] = React.useState('and');
  React.useEffect(() => {
    setTimeout(() => {
      if (editorRef.current) editorRef.current.focus();
    }, 1);
  }, []);

  const createTerm = (condition, value) => {
    if (!value) return null;
    if (filterType == 'string') return `${condition}"${value}"`;
    return `${condition}${value}`;
  };

  const handleOk = (values) => {
    const { value1, condition1, value2, condition2, joinOperator } = values;
    const term1 = createTerm(condition1, value1);
    const term2 = createTerm(condition2, value2);
    if (term1 && term2) onFilter(`${term1}${joinOperator}${term2}`);
    else if (term1) onFilter(term1);
    else if (term2) onFilter(term2);
    modalState.close();
  };

  return (
    <ModalBase modalState={modalState}>
      <Formik onSubmit={handleOk} initialValues={{ condition1, condition2: '=', joinOperator: ' ' }}>
        <Form>
          <ModalHeader modalState={modalState}>Set filter</ModalHeader>
          <ModalContent>
            <FormRow>Show rows where</FormRow>
            <FormRow>
              <Select filterType={filterType} name="condition1" />
              <FormTextFieldRaw name="value1" editorRef={editorRef} />
            </FormRow>
            <FormRow>
              <FormRadioGroupItem name="joinOperator" value=" " text="And" />
              <FormRadioGroupItem name="joinOperator" value="," text="Or" />
            </FormRow>
            <FormRow>
              <Select filterType={filterType} name="condition2" />
              <FormTextFieldRaw name="value2" />
            </FormRow>
          </ModalContent>
          <ModalFooter>
            <FormSubmit text="OK" />
            <FormStyledButton type="button" value="Close" onClick={modalState.close} />
          </ModalFooter>
        </Form>
      </Formik>
    </ModalBase>
  );
}
