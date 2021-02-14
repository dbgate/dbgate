import React from 'react';
import { DropDownMenuItem, DropDownMenuDivider } from '../modals/DropDownMenu';

export default function SqlEditorContextMenu({ execute, insertJoin, toggleComment, formatCode }) {
  return (
    <>
      {!!execute && (
        <DropDownMenuItem onClick={execute} keyText="F5 or Ctrl+Enter">
          Execute query
        </DropDownMenuItem>
      )}
      {!!insertJoin && (
        <DropDownMenuItem onClick={insertJoin} keyText="Ctrl+J">
          Insert SQL Join
        </DropDownMenuItem>
      )}
      {!!toggleComment && (
        <DropDownMenuItem onClick={toggleComment} keyText="Ctrl+/">
          Toggle comment
        </DropDownMenuItem>
      )}
      {!!formatCode && (
        <DropDownMenuItem onClick={formatCode} >
          Format code
        </DropDownMenuItem>
      )}
    </>
  );
}
