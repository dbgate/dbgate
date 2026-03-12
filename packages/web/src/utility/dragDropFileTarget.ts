import _ from 'lodash';
import { isFileDragActive } from '../stores';
import { fromEvent } from 'file-selector';
import uploadFiles from './uploadFiles';
import getElectron from './getElectron';

function isEvtWithFiles(event) {
  if (!event.dataTransfer) {
    return !!event.target && !!event.target.files;
  }
  // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/types
  // https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Recommended_drag_types#file
  return Array.prototype.some.call(
    event.dataTransfer.types,
    type => type === 'Files' || type === 'application/x-moz-file'
  );
}
export default function dragDropFileTarget(node, items) {
  let dragTargetsRef = [];

  function handleDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();

    dragTargetsRef = [...dragTargetsRef, event.target];

    if (isEvtWithFiles(event)) {
      isFileDragActive.set(true);
    }

    return false;
  }
  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      try {
        event.dataTransfer.dropEffect = 'copy';
      } catch {}
    }
  }
  function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();

    // Only deactivate once the dropzone and all children have been left
    const targets = dragTargetsRef.filter(target => node && node.contains(target));
    // Make sure to remove a target present multiple times only once
    // (Firefox may fire dragenter/dragleave multiple times on the same element)
    const targetIdx = targets.indexOf(event.target);
    if (targetIdx !== -1) {
      targets.splice(targetIdx, 1);
    }
    dragTargetsRef = targets;
    if (targets.length > 0) {
      return;
    }

    isFileDragActive.set(false);
  }
  async function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    isFileDragActive.set(false);

    if (isEvtWithFiles(event)) {
      const electron = getElectron();
      if (electron && event.dataTransfer?.files?.length) {
        // Electron 37+ removed File.path in favour of webUtils.getPathForFile().
        // Older Electron sets file.path automatically; newer requires webUtils.
        const electronModule = window['require']('electron');
        const files = Array.from(event.dataTransfer.files).map((file: any) => {
          if (!file.path && electronModule?.webUtils) {
            file.path = electronModule.webUtils.getPathForFile(file);
          }
          return file;
        });
        uploadFiles(files);
      } else {
        const files = await fromEvent(event);
        uploadFiles(files);
      }
    }
  }

  node.addEventListener('dragenter', handleDragEnter);
  node.addEventListener('dragover', handleDragOver);
  node.addEventListener('dragleave', handleDragLeave);
  node.addEventListener('drop', handleDrop);

  return {
    destroy() {
      node.removeEventListener('dragenter', handleDragEnter);
      node.removeEventListener('dragover', handleDragOver);
      node.removeEventListener('dragleave', handleDragLeave);
      node.removeEventListener('drop', handleDrop);
    },
  };
}
