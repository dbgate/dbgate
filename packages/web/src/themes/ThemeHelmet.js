import React from 'react';
import { Helmet } from 'react-helmet';
import useTheme from '../theme/useTheme';
import _ from 'lodash';

export default function ThemeHelmet() {
  const theme = useTheme();
  return (
    <Helmet>
      <style>{`
        body {
          color: ${theme.main_font1};
        }

        body *::-webkit-scrollbar {
          height: 0.8em;
          width: 0.8em;
        }
        body *::-webkit-scrollbar-track {
          border-radius: 1px;
          background-color: ${theme.scrollbar_background};
        }
        body *::-webkit-scrollbar-corner {
          border-radius: 1px;
          background-color: ${theme.scrollbar_background2};
        }
       
        body *::-webkit-scrollbar-thumb {
          border-radius: 1px;
          background-color: ${theme.scrollbar_background3};
        }  

        body *::-webkit-scrollbar-thumb:hover {
          background-color: ${theme.scrollbar_background4};
        }

        input {
          background-color: ${theme.input_background};
          color: ${theme.input_font1};
          border: 1px solid ${theme.border};
        }

        input[disabled] {
            background-color: ${theme.input_background2};
          }
          
        select {
          background-color: ${theme.input_background};
          color: ${theme.input_font1};
          border: 1px solid ${theme.border};
        }

        select[disabled] {
          background-color: ${theme.input_background2};
        }

        textarea {
          background-color: ${theme.input_background};
          color: ${theme.input_font1};
          border: 1px solid ${theme.border};
        }

        ${_.flatten(
          _.keys(theme.main_palettes).map(color =>
            theme.main_palettes[color].map((code, index) => `.color-${color}-${index + 1} { color: ${code} }`)
          )
        ).join('\n')}

        `}</style>
    </Helmet>
  );
}
