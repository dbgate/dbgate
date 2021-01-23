import React from 'react';
import LoadingInfo from '../widgets/LoadingInfo';
import MarkdownExtendedView from '../markdown/MarkdownExtendedView';
import useEditorData from '../utility/useEditorData';

export default function MarkdownPreviewTab({ sourceTabId, tabVisible }) {
  const [reloadToken, setReloadToken] = React.useState(0);
  const { editorData, isLoading } = useEditorData({ tabid: sourceTabId, reloadToken });

  React.useEffect(() => {
    if (tabVisible) setReloadToken(x => x + 1);
  }, [tabVisible]);

  if (isLoading) {
    return (
      <div>
        <LoadingInfo message="Loading markdown page" />
      </div>
    );
  }

  return <MarkdownExtendedView>{editorData || ''}</MarkdownExtendedView>;
}
