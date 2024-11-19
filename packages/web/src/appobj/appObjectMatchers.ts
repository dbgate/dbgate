export function matchDatabaseObjectAppObject(obj1, obj2) {
  return (
    obj1?.objectTypeField == obj2?.objectTypeField &&
    obj1?.conid == obj2?.conid &&
    obj1?.database == obj2?.database &&
    obj1?.pureName == obj2?.pureName &&
    obj1?.schemaName == obj2?.schemaName
  );
}
