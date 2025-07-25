export async function parseFileAsString(file) {
  try {
    const text = await file.text();
    const data = text;
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}
