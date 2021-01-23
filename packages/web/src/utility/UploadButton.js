import React from 'react';
import useTheme from '../theme/useTheme';
import { FormStyledLabel } from '../widgets/FormStyledButton';
import styled from 'styled-components';
import { useUploadFiles } from './UploadsProvider';

const Wrapper = styled.div`
  margin: 10px;
`;

export default function UploadButton() {
  const theme = useTheme();
  const uploadFiles = useUploadFiles();
  const handleChange = e => {
    const files = [...e.target.files];
    uploadFiles(files);
  };
  return (
    <Wrapper>
      <FormStyledLabel htmlFor="uploadFileButton" theme={theme}>
        Upload file
      </FormStyledLabel>
      <input type="file" id="uploadFileButton" hidden onChange={handleChange} />
    </Wrapper>
  );
}
