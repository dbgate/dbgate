import React from 'react';
import Markdown from 'markdown-to-jsx';
import styled from 'styled-components';
import OpenChartLink from './OpenChartLink';
import MarkdownLink from './MarkdownLink';
import OpenSqlLink from './OpenSqlLink';

const Wrapper = styled.div`
  padding: 10px;
  overflow: auto;
  flex: 1;
`;

export default function MarkdownExtendedView({ children }) {
  return (
    <Wrapper>
      <Markdown
        options={{
          overrides: {
            OpenChartLink: {
              component: OpenChartLink,
            },
            OpenSqlLink: {
              component: OpenSqlLink,
            },
            a: MarkdownLink,
          },
        }}
      >
        {children || ''}
      </Markdown>
    </Wrapper>
  );
}
