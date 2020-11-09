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
        .color-blue-icon { color: #05A; }
        .color-magenta-icon { color: #808 }
        .color-yellow-icon { color: #880 }
        `}</style>
    </Helmet>
  );
}
