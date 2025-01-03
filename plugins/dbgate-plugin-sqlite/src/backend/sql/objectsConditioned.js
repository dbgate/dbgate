module.exports = `
select * from sqlite_master where (type='table' or type='view') and name =OBJECT_ID_CONDITION
`;
