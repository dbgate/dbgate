const dataTypeMapperTransform = (oldType, newType) => database => {
  return {
    ...database,
    tables: database.tables.map(table => {
      return {
        ...table,
        columns: table.columns.map(column => {
          if (column.dataType?.toLowerCase() === oldType?.toLowerCase()) {
            return {
              ...column,
              dataType: newType,
            };
          }
          return column;
        }),
      };
    }),
  };
};

module.exports = dataTypeMapperTransform;
