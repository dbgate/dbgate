import React from 'react';
import { Helmet } from 'react-helmet';

export default function ThemeHelmet() {
  return (
    <Helmet>
      <style>{`
        .color-red { color: red; }
        .color-green { color: green; }
        .color-on-statusbar-green { color: lime; }
        .color-blue { color: blue; }
        `}</style>
    </Helmet>
  );
}
