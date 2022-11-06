import sveltePreprocess from 'svelte-preprocess';

const ignoreWarnings = [
  'a11y-click-events-have-key-events',
  'a11y-missing-attribute',
  'a11y-invalid-attribute',
  'a11y-no-noninteractive-tabindex',
  'a11y-label-has-associated-control',
  'unused-export-let',
];

export default {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: sveltePreprocess(),

  onwarn: (warning, handler) => {
    if (ignoreWarnings.includes(warning.code)) return;
    // console.log('***************************', warning.code);
    handler(warning);
  },
};
