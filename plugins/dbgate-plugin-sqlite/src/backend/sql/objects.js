module.exports = `
select * from sqlite_master where (type='table' or type='view')
`;
