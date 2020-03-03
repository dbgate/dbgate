export default function fullDisplayName({ schemaName, pureName }) {
  if (schemaName) return `${schemaName}.${pureName}`;
  return pureName;
}
