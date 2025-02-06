module.exports = `
SELECT table_name as "pureName"
FROM system_schema.tables 
WHERE keyspace_name='#DATABASE#';
`;
