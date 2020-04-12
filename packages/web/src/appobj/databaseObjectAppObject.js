import tableAppObject from './tableAppObject';
import viewAppObject from './viewAppObject';

const databaseObjectAppObject = () => ({ objectTypeField, ...other }, props) => {
  switch (objectTypeField) {
    case 'tables':
      // @ts-ignore
      return tableAppObject()(other, props);
    case 'views':
      // @ts-ignore
      return viewAppObject()(other, props);
  }
  return null;
};

export default databaseObjectAppObject;
