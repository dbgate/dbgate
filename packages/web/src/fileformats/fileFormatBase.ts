const fileFormatBase = {
  addFilesToSourceList: async (file, newSources, newValues) => {
    const sourceName = file.name;
    newSources.push(sourceName);
    newValues[`sourceFile_${sourceName}`] = {
      fileName: file.full,
    };
  },
};

export default fileFormatBase;
