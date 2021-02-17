export default function changeTheme(theme) {
  for (const [prop, color] of Object.entries(theme)) {
    if (Array.isArray(color)) {
      for (let index = 0; index < color.length; index++) {
        const varString = `--theme-${prop}_${index}`;
        document.documentElement.style.setProperty(varString, color[index]);
      }
    } else {
      const varString = `--theme-${prop}`;
      document.documentElement.style.setProperty(varString, color);
    }
  }
}
