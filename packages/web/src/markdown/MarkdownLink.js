import React from 'react';
import useTheme from '../theme/useTheme';
import { StyledThemedLink } from '../widgets/FormStyledButton';

export default function MarkdownLink({ href, title, children }) {
  const theme = useTheme();

  return (
    <StyledThemedLink theme={theme} href={href} title={title} target="_blank">
      {children}
    </StyledThemedLink>
  );
}
