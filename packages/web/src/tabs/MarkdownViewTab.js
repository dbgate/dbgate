import React from 'react';
import axios from '../utility/axios';
import LoadingInfo from '../widgets/LoadingInfo';
import MarkdownExtendedView from '../markdown/MarkdownExtendedView';

export default function MarkdownViewTab({ savedFile }) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [text, setText] = React.useState(null);

  const handleLoad = async () => {
    setIsLoading(true);
    const resp = await axios.post('files/load', {
      folder: 'markdown',
      file: savedFile,
      format: 'text',
    });
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

  return <MarkdownExtendedView>{text || ''}</MarkdownExtendedView>;
}

MarkdownViewTab.allowAddToFavorites = props => true;
