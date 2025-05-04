export default function formatFileSize(size) {
  if (size > 1000000000) return `${Math.round(size / 100000000) / 10} GB`;
  if (size > 1000000) return `${Math.round(size / 100000) / 10} MB`;
  if (size > 1000) return `${Math.round(size / 100) / 10} KB`;
  return `${size} bytes`;
}
