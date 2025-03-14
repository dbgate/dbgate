<script context="module">
  export function getNumberIcon(number) {
    switch (number) {
      case 1:
        return 'mdi mdi-numeric-1-circle';
      case 2:
        return 'mdi mdi-numeric-2-circle';
      case 3:
        return 'mdi mdi-numeric-3-circle';
      case 4:
        return 'mdi mdi-numeric-4-circle';
      case 5:
        return 'mdi mdi-numeric-5-circle';
      case 6:
        return 'mdi mdi-numeric-6-circle';
      case 7:
        return 'mdi mdi-numeric-7-circle';
      case 8:
        return 'mdi mdi-numeric-8-circle';
      case 9:
        return 'mdi mdi-numeric-9-circle';
    }
    if (number > 9) return 'mdi mdi-numeric-9-plus-circle';
    return null;
  }
</script>

<script>
  export let icon;
  export let title = null;
  export let padLeft = false;
  export let padRight = false;
  export let style = null;

  const iconNames = {
    'icon minus-box': 'mdi mdi-minus-box-outline',
    'icon plus-box': 'mdi mdi-plus-box-outline',
    'icon plus-thick': 'mdi mdi-plus-thick',
    'icon minus-thick': 'mdi mdi-minus-thick',
    'icon invisible-box': 'mdi mdi-minus-box-outline icon-invisible',
    'icon cloud-upload': 'mdi mdi-cloud-upload',
    'icon import': 'mdi mdi-application-import',
    'icon export': 'mdi mdi-application-export',
    'icon new-connection': 'mdi mdi-database-plus',
    'icon tables': 'mdi mdi-table-multiple',
    'icon favorite': 'mdi mdi-star',
    'icon share': 'mdi mdi-share-variant',
    'icon add': 'mdi mdi-plus-circle',
    'icon minus': 'mdi mdi-minus-circle',
    'icon connection': 'mdi mdi-connection',
    'icon cell-data': 'mdi mdi-details',
    'icon sql-generator': 'mdi mdi-cog-transfer',
    'icon keyboard': 'mdi mdi-keyboard-settings',
    'icon settings': 'mdi mdi-cog',
    'icon users': 'mdi mdi-account-multiple',
    'icon role': 'mdi mdi-account-group',
    'icon admin': 'mdi mdi-security',
    'icon auth': 'mdi mdi-account-key',
    'icon version': 'mdi mdi-ticket-confirmation',
    'icon pin': 'mdi mdi-pin',
    'icon pin-outline': 'mdi mdi-pin-outline',
    'icon arrange': 'mdi mdi-arrange-send-to-back',
    'icon app': 'mdi mdi-layers-triple',
    'icon open-in-new': 'mdi mdi-open-in-new',
    'icon add-folder': 'mdi mdi-folder-plus-outline',
    'icon add-column': 'mdi mdi-table-column-plus-after',
    'icon parameter': 'mdi mdi-at',
    'icon trigger': 'mdi mdi-lightning-bolt',
    'icon scheduler-event': 'mdi mdi-calendar-blank',
    'icon arrow-link': 'mdi mdi-arrow-top-right-thick',

    'icon window-restore': 'mdi mdi-window-restore',
    'icon window-maximize': 'mdi mdi-window-maximize',
    'icon window-close': 'mdi mdi-window-close',
    'icon window-minimize': 'mdi mdi-window-minimize',
    'img dbgate': 'mdi mdi-database color-icon-gold',

    'icon columns': 'mdi mdi-view-column',
    'icon columns-outline': 'mdi mdi-view-column-outline',

    'icon locked-database-mode': 'mdi mdi-database-lock',
    'icon unlocked-database-mode': 'mdi mdi-database-eye',

    'icon database': 'mdi mdi-database',
    'icon server': 'mdi mdi-server',
    'icon table': 'mdi mdi-table',
    'icon form': 'mdi mdi-form-select',
    'icon archive': 'mdi mdi-archive',
    'icon file': 'mdi mdi-file',
    'icon loading': 'mdi mdi-loading mdi-spin',
    'icon close': 'mdi mdi-close',
    'icon unsaved': 'mdi mdi-record',
    'icon stop': 'mdi mdi-close-octagon',
    'icon play': 'mdi mdi-play',
    'icon play-stop': 'mdi mdi-stop',
    'icon pause': 'mdi mdi-pause',
    'icon filter': 'mdi mdi-filter',
    'icon filter-off': 'mdi mdi-filter-off',
    'icon reload': 'mdi mdi-reload',
    'icon refresh': 'mdi mdi-refresh',
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
    'icon triple-up': 'mdi mdi-chevron-triple-up',
    'icon triple-down': 'mdi mdi-chevron-triple-down',
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
    'icon add': 'mdi mdi-plus-circle',
    'icon json': 'mdi mdi-code-json',
    'icon lock': 'mdi mdi-lock',
    'icon custom-join': 'mdi mdi-arrow-left-right-bold',
    'icon parent-filter': 'mdi mdi-home-alert',
    'icon parent-filter-outline': 'mdi mdi-home-alert-outline',
    'icon download': 'mdi mdi-download',
    'icon text': 'mdi mdi-text',
    'icon ai': 'mdi mdi-head-lightbulb',
    'icon wait': 'mdi mdi-timer-sand',

    'icon run': 'mdi mdi-play',
    'icon chevron-down': 'mdi mdi-chevron-down',
    'icon chevron-left': 'mdi mdi-chevron-left',
    'icon chevron-right': 'mdi mdi-chevron-right',
    'icon chevron-up': 'mdi mdi-chevron-up',
    'icon chevron-double-down': 'mdi mdi-chevron-double-down',
    'icon chevron-double-left': 'mdi mdi-chevron-double-left',
    'icon chevron-double-right': 'mdi mdi-chevron-double-right',
    'icon chevron-double-up': 'mdi mdi-chevron-double-up',
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
    'icon split': 'mdi mdi-view-split-vertical',

    'icon num-0': 'mdi mdi-numeric-0-circle',
    'icon num-1': 'mdi mdi-numeric-1-circle',
    'icon num-2': 'mdi mdi-numeric-2-circle',
    'icon num-3': 'mdi mdi-numeric-3-circle',
    'icon num-4': 'mdi mdi-numeric-4-circle',
    'icon num-5': 'mdi mdi-numeric-5-circle',
    'icon num-6': 'mdi mdi-numeric-6-circle',
    'icon num-7': 'mdi mdi-numeric-7-circle',
    'icon num-8': 'mdi mdi-numeric-8-circle',
    'icon num-9': 'mdi mdi-numeric-9-circle',
    'icon num-9-plus': 'mdi mdi-numeric-9-plus-circle',

    'icon num-0-outline': 'mdi mdi-numeric-0-circle-outline',
    'icon num-1-outline': 'mdi mdi-numeric-1-circle-outline',
    'icon num-2-outline': 'mdi mdi-numeric-2-circle-outline',
    'icon num-3-outline': 'mdi mdi-numeric-3-circle-outline',
    'icon num-4-outline': 'mdi mdi-numeric-4-circle-outline',
    'icon num-5-outline': 'mdi mdi-numeric-5-circle-outline',
    'icon num-6-outline': 'mdi mdi-numeric-6-circle-outline',
    'icon num-7-outline': 'mdi mdi-numeric-7-circle-outline',
    'icon num-8-outline': 'mdi mdi-numeric-8-circle-outline',
    'icon num-9-outline': 'mdi mdi-numeric-9-circle-outline',
    'icon num-9-plus-outline': 'mdi mdi-numeric-9-plus-circle-outline',

    'icon type-string': 'mdi mdi-code-string',
    'icon type-object': 'mdi mdi-code-braces-box',
    'icon type-array': 'mdi mdi-code-array',
    'icon type-number': 'mdi mdi-pound-box',
    'icon type-boolean': 'mdi mdi-code-equal',
    'icon type-date': 'mdi mdi-alpha-d-box',
    'icon type-objectid': 'mdi mdi-alpha-i-box',
    'icon type-null': 'mdi mdi-code-equal',
    'icon type-unknown': 'mdi mdi-help-box',

    'icon at': 'mdi mdi-at',
    'icon expand-all': 'mdi mdi-expand-all',
    'icon collapse-all': 'mdi mdi-collapse-all',

    'icon transaction': 'mdi mdi-code-json',
    'icon commit': 'mdi mdi-check-circle',
    'icon rollback': 'mdi mdi-close-circle',
    'icon autocommit-on': 'mdi mdi-check-circle',
    'icon autocommit-off': 'mdi mdi-check-circle-outline',

    'img ok': 'mdi mdi-check-circle color-icon-green',
    'img ok-inv': 'mdi mdi-check-circle color-icon-inv-green',
    'img alert': 'mdi mdi-alert-circle color-icon-blue',
    'img error': 'mdi mdi-close-circle color-icon-red',
    'img error-inv': 'mdi mdi-close-circle color-icon-inv-red',
    'img warn': 'mdi mdi-alert color-icon-gold',
    'img info': 'mdi mdi-information color-icon-blue',
    'img debug': 'mdi mdi-monitor color-icon-green',
    // 'img statusbar-ok': 'mdi mdi-check-circle color-on-statusbar-green',
    'img circular': 'mdi mdi-circular-saw color-icon-red',

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
    'img diagram': 'mdi mdi-graph color-icon-blue',
    'img yaml': 'mdi mdi-code-brackets color-icon-red',
    'img compare': 'mdi mdi-compare color-icon-red',
    'img app': 'mdi mdi-layers-triple color-icon-magenta',
    'img app-command': 'mdi mdi-flash color-icon-green',
    'img app-query': 'mdi mdi-view-comfy color-icon-magenta',
    'img connection': 'mdi mdi-connection color-icon-blue',
    'img profiler': 'mdi mdi-gauge color-icon-blue',
    'img users': 'mdi mdi-account-multiple color-icon-blue',
    'img role': 'mdi mdi-account-group color-icon-blue',
    'img admin': 'mdi mdi-security color-icon-blue',
    'img auth': 'mdi mdi-account-key color-icon-blue',

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
    'img raw-table': 'mdi mdi-table-large color-icon-blue',
    'img collection': 'mdi mdi-table color-icon-red',
    'img query-data': 'mdi mdi-table color-icon-yellow',
    'img view': 'mdi mdi-table color-icon-magenta',
    'img raw-view': 'mdi mdi-table-large color-icon-magenta',
    'img procedure': 'mdi mdi-cog color-icon-blue',
    'img function': 'mdi mdi-function-variant',
    'img table-structure': 'mdi mdi-tools color-icon-blue',
    'img view-structure': 'mdi mdi-tools color-icon-magenta',

    'img sort-asc': 'mdi mdi-sort-alphabetical-ascending color-icon-green',
    'img sort-desc': 'mdi mdi-sort-alphabetical-descending color-icon-green',
    'img map': 'mdi mdi-map color-icon-blue',

    'img reference': 'mdi mdi-link-box',
    'img link': 'mdi mdi-link',
    'img filter': 'mdi mdi-filter',
    'img group': 'mdi mdi-group',
    'img perspective': 'mdi mdi-eye color-icon-yellow',
    'img parent-filter': 'mdi mdi-home-alert color-icon-yellow',

    'img folder': 'mdi mdi-folder color-icon-yellow',
    'img type-string': 'mdi mdi-alphabetical color-icon-blue',
    'img type-hash': 'mdi mdi-pound color-icon-blue',
    'img type-set': 'mdi mdi-format-list-bulleted color-icon-blue',
    'img type-list': 'mdi mdi-format-list-numbered color-icon-blue',
    'img type-zset': 'mdi mdi-format-list-checks  color-icon-blue',
    'img type-stream': 'mdi mdi-view-stream color-icon-blue',
    'img type-binary': 'mdi mdi-file color-icon-blue',
    'img type-rejson': 'mdi mdi-color-json color-icon-blue',
    'img keydb': 'mdi mdi-key color-icon-blue',

    'img duplicator': 'mdi mdi-content-duplicate color-icon-green',
    'img import': 'mdi mdi-database-import color-icon-green',
    'img export': 'mdi mdi-database-export color-icon-green',
    'img transform': 'mdi mdi-rotate-orbit color-icon-blue',
    'img tip': 'mdi mdi-lightbulb-on color-icon-yellow',

    'img filter-active': 'mdi mdi-filter-cog color-icon-blue',

    'img db-backup': 'mdi mdi-database-export color-icon-yellow',
    'img db-restore': 'mdi mdi-database-import color-icon-red',
  };
</script>

<span
  class={iconNames[icon] || icon}
  {title}
  class:padLeft
  class:padRight
  {style}
  on:click
  data-testid={$$props['data-testid']}
/>

<style>
  .padLeft {
    margin-left: 0.25rem;
  }

  .padRight {
    margin-right: 0.25rem;
  }
</style>
