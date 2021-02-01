import React from 'react';
import { DropDownMenuItem } from '../modals/DropDownMenu';
import ToolbarButton, { ToolbarDropDownButton } from '../widgets/ToolbarButton';

export default function SaveFileToolbarButton({ tabid, save, saveAs }) {
  if (!saveAs) return null;

  if (save) {
    return (
      <ToolbarDropDownButton icon="icon save" text="Save">
        <DropDownMenuItem onClick={save} keyText="Ctrl+S">
          Save
        </DropDownMenuItem>
        <DropDownMenuItem onClick={saveAs} keyText="Ctrl+Shift+S">
          Save As
        </DropDownMenuItem>
      </ToolbarDropDownButton>
    );
  }

  return (
    <ToolbarButton onClick={saveAs} icon="icon save">
      Save As
    </ToolbarButton>
  );
}
