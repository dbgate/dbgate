<script context="module">
  export const themeClassName = 'theme-dark';
  export const themeName = 'Dark';
  export const themeType = 'dark';
</script>

<style>
  :global(.theme-dark) {
    --theme-font-1: #e3e3e3;
    --theme-font-2: #b5b5b5;
    --theme-font-3: #888888;
    --theme-font-4: #5a5a5a;
    --theme-font-hover: #8dcff8; /* blue-9 */
    --theme-font-link: #65b7f3; /* blue-8 */
    --theme-font-alt: #b2e58b; /* green-9 */

    /* --theme-bg-0: #000;
  --theme-bg-1: #333;
  --theme-bg-2: #4d4d4d;
  --theme-bg-3: #676767;
  --theme-bg-4: #818181;
  --theme-bg-alt: #111d2c; */

    --theme-bg-0: #111;
    --theme-bg-1: #333;
    --theme-bg-2: #4d4d4d;
    --theme-bg-3: #676767;
    --theme-bg-4: #818181;
    --theme-bg-alt: #111d2c;

    --theme-bg-gold: #443111; /* gold-2 */
    --theme-bg-orange: #442a11; /*orange-2 */
    --theme-bg-green: #1d3712; /* green-2 */
    --theme-bg-volcano: #441d12; /* volcano-2 */
    --theme-bg-red: #431418; /* red-2 */
    --theme-bg-blue: #15395b; /* blue-3 */
    --theme-bg-magenta: #551c3b; /* magenta-3 */

    --theme-font-inv-1: #ffffff;
    --theme-font-inv-15: #dedede;
    --theme-font-inv-2: #b3b3b3;
    --theme-font-inv-3: #808080;
    --theme-font-inv-4: #4d4d4d;

    --theme-bg-inv-1: #222;
    --theme-bg-inv-2: #3c3c3c;
    --theme-bg-inv-3: #565656;
    --theme-bg-inv-4: #707070;

    --theme-border: #555;

    --theme-bg-hover: #555;
    --theme-bg-selected: #1d4d7e; /* blue-4 */
    --theme-bg-selected-point: #1765ad; /* blue-5 */

    --theme-bg-statusbar-inv: #0050b3;
    --theme-bg-statusbar-inv-hover: #096dd9;
    --theme-bg-statusbar-inv-font: #222;
    --theme-bg-statusbar-inv-bg: #ccc;
    --theme-bg-modalheader: rgb(43, 60, 61);

    --theme-bg-button-inv: #004488;
    --theme-bg-button-inv-2: #1a5794;
    --theme-bg-button-inv-3: #346aa0;

    --theme-icon-blue: #3c9ae8;
    --theme-icon-green: #8fd460;
    --theme-icon-red: #e84749;
    --theme-icon-gold: #e8b339;
    --theme-icon-yellow: #e8d639;
    --theme-icon-magenta: #e0529c;

    --theme-icon-inv-green: #8fd460;
    --theme-icon-inv-red: #e84749;

    --token-base: #303030;
    --token-text: #ddd;
    --token-keyword: white;
    --token-selector-tag: white;
    --token-literal: white;
    --token-section: white;
    --token-link: white;
    --token-subst: #ddd; /* default - using text color */
    --token-string: #d88;
    --token-title: #d88;
    --token-name: #d88;
    --token-type: #d88;
    --token-attribute: #d88;
    --token-symbol: #d88;
    --token-bullet: #d88;
    --token-built_in: #d88;
    --token-addition: #d88;
    --token-variable: #d88;
    --token-template-tag: #d88;
    --token-template-variable: #d88;
    --token-comment: #979797;
    --token-quote: #979797;
    --token-deletion: #979797;
    --token-meta: #979797;
    --token-doctag: inherit; /* Inherits text color, but uses bold */
    --token-strong: bold;
    --token-emphasis: italic;
  }
</style>
