<script>
  export let icon;
  export let title = null;
  export let padLeft = false;
  export let padRight = false;
  export let style = null;

  const iconNames = {
    'icon minus-box': 'mdi mdi-minus-box-outline',
    'icon plus-box': 'mdi mdi-plus-box-outline',
    'icon invisible-box': 'mdi mdi-minus-box-outline icon-invisible',
    'icon cloud-upload': 'mdi mdi-cloud-upload',
    'icon import': 'mdi mdi-application-import',
    'icon export': 'mdi mdi-application-export',
    'icon new-connection': 'mdi mdi-database-plus',
    'icon tables': 'mdi mdi-table-multiple',
    'icon favorite': 'mdi mdi-star',
    'icon share': 'mdi mdi-share-variant',
    'icon add': 'mdi mdi-plus-circle',
    'icon connection': 'mdi mdi-connection',
    'icon cell-data': 'mdi mdi-details',
    'icon sql-generator': 'mdi mdi-cog-transfer',
    'icon keyboard': 'mdi mdi-keyboard-settings',
    'icon settings': 'mdi mdi-cog',
    'icon version': 'mdi mdi-ticket-confirmation',

    'icon columns': 'mdi mdi-view-column',
    'icon columns-outline': 'mdi mdi-view-column-outline',

    'icon database': 'mdi mdi-database',
    'icon server': 'mdi mdi-server',
    'icon table': 'mdi mdi-table',
    'icon archive': 'mdi mdi-archive',
    'icon file': 'mdi mdi-file',
    'icon loading': 'mdi mdi-loading mdi-spin',
    'icon close': 'mdi mdi-close',
    'icon filter': 'mdi mdi-filter',
    'icon filter-off': 'mdi mdi-filter-off',
    'icon reload': 'mdi mdi-reload',
    'icon undo': 'mdi mdi-undo',
    'icon redo': 'mdi mdi-redo',
    'icon save': 'mdi mdi-content-save',
    'icon account': 'mdi mdi-account',
    'icon sql-file': 'mdi mdi-file',
    'icon web': 'mdi mdi-web',
    'icon home': 'mdi mdi-home',
    'icon query-design': 'mdi mdi-vector-polyline-edit',
    'icon form': 'mdi mdi-form-select',
    'icon history': 'mdi mdi-history',
    'icon structure': 'mdi mdi-tools',
    'icon square': 'mdi mdi-square',

    'icon edit': 'mdi mdi-pencil',
    'icon delete': 'mdi mdi-delete',
    'icon arrow-up': 'mdi mdi-arrow-up',
    'icon arrow-down': 'mdi mdi-arrow-down',
    'icon arrow-left': 'mdi mdi-arrow-left',
    'icon arrow-begin': 'mdi mdi-arrow-collapse-left',
    'icon arrow-end': 'mdi mdi-arrow-collapse-right',
    'icon arrow-right': 'mdi mdi-arrow-right',
    'icon arrow-left-bold': 'mdi mdi-arrow-left-bold',
    'icon arrow-right-bold': 'mdi mdi-arrow-right-bold',
    'icon triple-left': 'mdi mdi-chevron-triple-left',
    'icon triple-right': 'mdi mdi-chevron-triple-right',
    'icon format-code': 'mdi mdi-code-tags-check',
    'icon show-wizard': 'mdi mdi-comment-edit',
    'icon disconnected': 'mdi mdi-lan-disconnect',
    'icon theme': 'mdi mdi-brightness-6',
    'icon error': 'mdi mdi-close-circle',
    'icon ok': 'mdi mdi-check-circle',
    'icon check': 'mdi mdi-check',
    'icon markdown': 'mdi mdi-application',
    'icon preview': 'mdi mdi-file-find',
    'icon eye': 'mdi mdi-eye',
    'icon check-all': 'mdi mdi-check-all',
    'icon checkbox-blank': 'mdi mdi-checkbox-blank-outline',
    'icon checkbox-marked': 'mdi mdi-checkbox-marked-outline',
    'icon dots-horizontal': 'mdi mdi-dots-horizontal',
    'icon dots-vertical': 'mdi mdi-dots-vertical',

    'icon run': 'mdi mdi-play',
    'icon chevron-down': 'mdi mdi-chevron-down',
    'icon chevron-left': 'mdi mdi-chevron-left',
    'icon chevron-right': 'mdi mdi-chevron-right',
    'icon chevron-up': 'mdi mdi-chevron-up',
    'icon menu-right': 'mdi mdi-menu-right',
    'icon plugin': 'mdi mdi-toy-brick',
    'icon menu': 'mdi mdi-menu',
    'icon add-column': 'mdi mdi-table-column-plus-after',
    'icon add-key': 'mdi mdi-key-plus',
    'icon report': 'mdi mdi-file-chart',
    'icon swap': 'mdi mdi-swap-horizontal-bold',
    'icon deploy': 'mdi mdi-content-save-move',
    'icon compare': 'mdi mdi-compare',
    'icon no-color': 'mdi mdi-format-color-marker-cancel',
    'icon palette': 'mdi mdi-palette',

    'img ok': 'mdi mdi-check-circle color-icon-green',
    'img ok-inv': 'mdi mdi-check-circle color-icon-inv-green',
    'img alert': 'mdi mdi-alert-circle color-icon-blue',
    'img error': 'mdi mdi-close-circle color-icon-red',
    'img error-inv': 'mdi mdi-close-circle color-icon-inv-red',
    'img warn': 'mdi mdi-alert color-icon-gold',
    'img info': 'mdi mdi-information color-icon-blue',
    // 'img statusbar-ok': 'mdi mdi-check-circle color-on-statusbar-green',

    'img archive': 'mdi mdi-table color-icon-gold',
    'img archive-folder': 'mdi mdi-database-outline color-icon-green',
    'img autoincrement': 'mdi mdi-numeric-1-box-multiple-outline',
    'img column': 'mdi mdi-table-column',
    'img server': 'mdi mdi-server color-icon-blue',
    'img primary-key': 'mdi mdi-key-star color-icon-yellow',
    'img foreign-key': 'mdi mdi-key-link',
    'img sql-file': 'mdi mdi-file',
    'img shell': 'mdi mdi-flash color-icon-blue',
    'img chart': 'mdi mdi-chart-bar color-icon-magenta',
    'img markdown': 'mdi mdi-application color-icon-red',
    'img preview': 'mdi mdi-file-find color-icon-red',
    'img favorite': 'mdi mdi-star color-icon-yellow',
    'img query-design': 'mdi mdi-vector-polyline-edit color-icon-red',
    'img yaml': 'mdi mdi-code-brackets color-icon-red',
    'img compare': 'mdi mdi-compare color-icon-red',

    'img add': 'mdi mdi-plus-circle color-icon-green',
    'img minus': 'mdi mdi-minus-circle color-icon-red',
    'img equal': 'mdi mdi-equal',
    'img changed': 'mdi mdi-file-edit color-icon-yellow',

    'img free-table': 'mdi mdi-table color-icon-green',
    'img macro': 'mdi mdi-hammer-wrench',
    'img json': 'mdi mdi-code-json icon-magenta',

    'img database': 'mdi mdi-database color-icon-gold',
    'img sqlite-database': 'mdi mdi-database color-icon-blue',
    'img table': 'mdi mdi-table color-icon-blue',
    'img collection': 'mdi mdi-table color-icon-red',
    'img view': 'mdi mdi-table color-icon-magenta',
    'img procedure': 'mdi mdi-cog color-icon-blue',
    'img function': 'mdi mdi-function-variant',
    'img table-structure': 'mdi mdi-tools color-icon-blue',
    'img view-structure': 'mdi mdi-tools color-icon-magenta',

    'img sort-asc': 'mdi mdi-sort-alphabetical-ascending color-icon-green',
    'img sort-desc': 'mdi mdi-sort-alphabetical-descending color-icon-green',

    'img reference': 'mdi mdi-link-box',
    'img link': 'mdi mdi-link',
    'img filter': 'mdi mdi-filter',
    'img group': 'mdi mdi-group',
  };
</script>

<span class={iconNames[icon] || icon} {title} class:padLeft class:padRight {style} on:click />

<style>
  .padLeft {
    margin-right: 0.25rem;
  }

  .padRight {
    margin-right: 0.25rem;
  }
</style>
