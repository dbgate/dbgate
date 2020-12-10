import React from 'react';
import axios from '../utility/axios';
import LoadingInfo from '../widgets/LoadingInfo';
import Markdown from 'markdown-to-jsx';
import styled from 'styled-components';

const Wrapper = styled.div`
  padding: 10px;
  overflow: auto;
  flex: 1;
`;

export default function MarkdownViewTab({ file }) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [text, setText] = React.useState(null);

  const handleLoad = async () => {
    setIsLoading(true);
    const resp = await axios.post('files/load', { folder: 'markdown', file, format: 'text' });
    setText(resp.data);
    setIsLoading(false);
  };

  React.useEffect(() => {
    handleLoad();
  }, []);

  if (isLoading) {
    return (
      <div>
        <LoadingInfo message="Loading markdown page" />
      </div>
    );
  }

  return (
    <Wrapper>
      <Markdown>{text || ''}</Markdown>
    </Wrapper>
  );
}
