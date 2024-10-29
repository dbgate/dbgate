function replaceInText(text, replacements) {
  let result = text;
  for (const key of Object.keys(replacements)) {
    result = result.split(key).join(replacements[key]);
  }
  return result;
}

function replaceInCollection(collection, replacements) {
  return collection.map(item => {
    if (item.createSql) {
      return {
        ...item,
        createSql: replaceInText(item.createSql, replacements),
      };
    }
    return item;
  });
}

const sqlTextReplacementTransform = replacements => database => {
  return {
    ...database,
    views: replaceInCollection(database.views, replacements),
  };
};

module.exports = sqlTextReplacementTransform;
