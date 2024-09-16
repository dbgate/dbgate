module.exports = `
select metadata_modification_time as "contentHash", uuid as "objectId", engine as "tableEngine"
from system.tables 
where database='#DATABASE#';
`;
