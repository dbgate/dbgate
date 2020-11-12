import React from 'react';
import { Helmet } from 'react-helmet';
import useTheme from '../theme/useTheme';

export default function ThemeHelmet() {
  const theme = useTheme();
  return (
    <Helmet>
      <style>{`
        .color-red { color: red; }
        .color-green { color: green; }
        .color-on-statusbar-green { color: lime; }
        .color-blue { color: blue; }

        .color-blue-icon { color: #05A; }
        .color-magenta-icon { color: #808 }
        .color-yellow-icon { color: #880 }
        .color-green-icon { color: #0A3; }

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
        `}</style>
    </Helmet>
  );
}
