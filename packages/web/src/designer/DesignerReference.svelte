<script lang="ts">
  import _ from 'lodash';
  import { isConnectedByReference } from './designerTools';
  import contextMenu from '../utility/contextMenu';

  export let reference;
  export let onRemoveReference;
  export let onChangeReference;
  export let designer;
  export let domTables;

  let src = null;
  let dst = null;

  let minpos;
  let columnsY = [];

  const buswi = 10;
  const extwi = 25;

  export function recomputePosition() {
    const { designerId, sourceId, targetId, columns, joinType } = reference;

    /** @type {DomTableRef} */
    const sourceTable = domTables[sourceId];
    /** @type {DomTableRef} */
    const targetTable = domTables[targetId];
    if (!sourceTable || !targetTable) return null;
    const sourceRect = sourceTable.getRect();
    const targetRect = targetTable.getRect();
    if (!sourceRect || !targetRect) return null;

    const possibilities = [];
    possibilities.push({ xsrc: sourceRect.left - buswi, dirsrc: -1, xdst: targetRect.left - buswi, dirdst: -1 });
    possibilities.push({ xsrc: sourceRect.left - buswi, dirsrc: -1, xdst: targetRect.right + buswi, dirdst: 1 });
    possibilities.push({ xsrc: sourceRect.right + buswi, dirsrc: 1, xdst: targetRect.left - buswi, dirdst: -1 });
    possibilities.push({ xsrc: sourceRect.right + buswi, dirsrc: 1, xdst: targetRect.right + buswi, dirdst: 1 });

    minpos = _.minBy(possibilities, p => Math.abs(p.xsrc - p.xdst));

    let srcY = _.mean(columns.map(x => sourceTable.getColumnY(x.source)));
    let dstY = _.mean(columns.map(x => targetTable.getColumnY(x.target)));

    if (columns.length == 0) {
      srcY = sourceTable.getColumnY('');
      dstY = targetTable.getColumnY('');
    }

    src = { x: minpos.xsrc, y: srcY };
    dst = { x: minpos.xdst, y: dstY };

    columnsY = columns.map((col, colIndex) => {
      const y1 = sourceTable.getColumnY(col.source);
      const y2 = targetTable.getColumnY(col.target);
      return [y1, y2];
    });
  }

  $: {
    domTables;
    recomputePosition();
  }

  function createMenu() {
    const isConnected = isConnectedByReference(
      designer,
      { designerId: reference?.sourceId },
      { designerId: reference?.targetId },
      reference
    );
    const setJoinType = joinType => {
      onChangeReference({
        ...reference,
        joinType,
      });
    };

    return [
      { text: 'Remove', onClick: () => onRemoveReference(reference) },
      !isConnected && [
        { divider: true },
        { onClick: () => setJoinType('INNER JOIN'), text: 'Set INNER JOIN' },
        { onClick: () => setJoinType('LEFT JOIN'), text: 'Set LEFT JOIN' },
        { onClick: () => setJoinType('RIGHT JOIN'), text: 'Set RIGHT JOIN' },
        { onClick: () => setJoinType('FULL OUTER JOIN'), text: 'Set FULL OUTER JOIN' },
        { onClick: () => setJoinType('CROSS JOIN'), text: 'Set CROSS JOIN' },
        { onClick: () => setJoinType('WHERE EXISTS'), text: 'Set WHERE EXISTS' },
        { onClick: () => setJoinType('WHERE NOT EXISTS'), text: 'Set WHERE NOT EXISTS' },
      ],
    ];
  }
</script>

{#if src && dst && minpos}
  <svg>
    <polyline
      points={`
      ${src.x},${src.y}
      ${src.x + extwi * minpos.dirsrc},${src.y}
      ${dst.x + extwi * minpos.dirdst},${dst.y}
      ${dst.x},${dst.y}
  `}
    />
    {#each columnsY as coly}
      <polyline
        points={`
  ${src.x},${src.y}
  ${src.x},${coly[0]}
  ${src.x - buswi * minpos.dirsrc},${coly[0]}
`}
      />
      <polyline
        points={`
  ${dst.x},${dst.y}
  ${dst.x},${coly[1]}
  ${dst.x - buswi * minpos.dirdst},${coly[1]}
`}
      />
    {/each}
  </svg>

  <div
    use:contextMenu={createMenu}
    class="wrapper"
    style={`left: ${(src.x + extwi * minpos.dirsrc + dst.x + extwi * minpos.dirdst) / 2 - 16}px;
            top: ${(src.y + dst.y) / 2 - 16}px`}
  >
    <div class="text">
      {_.snakeCase(reference?.joinType || 'CROSS JOIN')
        .replace('_', '\xa0')
        .replace('_', '\xa0')}
    </div>
  </div>
{/if}

<style>
  svg {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
  }
  polyline {
    fill: none;
    stroke: var(--theme-bg-4);
    stroke-width: 2;
  }

  .wrapper {
    position: absolute;
    border: 1px solid var(--theme-border);
    background-color: var(--theme-bg-1);
    z-index: 900;
    border-radius: 10px;
    width: 32px;
    height: 32px;
  }

  .text {
    position: relative;
    float: left;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 900;
    white-space: nowrap;
    background-color: var(--theme-bg-1);
  }
</style>
