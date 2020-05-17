import React from 'react';
import resolveApi from '../utility/resolveApi';

export default function InfoPageTab({ page }) {
  return <iframe src={`${resolveApi()}/pages/${page}`} />;
}
