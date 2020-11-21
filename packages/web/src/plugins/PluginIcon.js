import React from 'react';

export default function PluginIcon({ plugin, className = undefined }) {
  return (
    <img src="https://raw.githubusercontent.com/dbshell/dbgate-plugin-csv/master/icon.svg" className={className} />
  );
}
