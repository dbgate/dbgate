<script lang="ts">
  import _ from 'lodash';
  import { intersectLineBox } from './designerMath';

  export let reference;
  export let onRemoveReference;
  export let onChangeReference;
  export let designer;
  export let domTables;
  export let settings;

  export let zoomKoef;

  let src = null;
  let dst = null;

  let arrowPt = null;
  let arrowAngle = 0;

  const arwi = 12;
  const arhi = 12;
  const arpad = 3;

  export function recomputePosition(zoomKoef) {
    const { designerId, sourceId, targetId, columns, joinType } = reference;

    /** @type {DomTableRef} */
    const sourceTable = domTables[sourceId];
    /** @type {DomTableRef} */
    const targetTable = domTables[targetId];
    if (!sourceTable || !targetTable) return null;
    const sourceRect = sourceTable.getRect();
    const targetRect = targetTable.getRect();
    if (!sourceRect || !targetRect) return null;

    if (zoomKoef > 0) {
      sourceRect.left /= zoomKoef;
      sourceRect.right /= zoomKoef;
      sourceRect.top /= zoomKoef;
      sourceRect.bottom /= zoomKoef;
      targetRect.left /= zoomKoef;
      targetRect.right /= zoomKoef;
      targetRect.top /= zoomKoef;
      targetRect.bottom /= zoomKoef;
    }

    src = {
      x: (sourceRect.left + sourceRect.right) / 2,
      y: (sourceRect.top + sourceRect.bottom) / 2,
    };

    dst = {
      x: (targetRect.left + targetRect.right) / 2,
      y: (targetRect.top + targetRect.bottom) / 2,
    };

    arrowPt = intersectLineBox(src, dst, targetRect)[0];
    arrowAngle = Math.atan2(dst.y - src.y, dst.x - src.x);
  }

  $: {
    domTables;
    recomputePosition(zoomKoef);
  }
</script>

<svg>
  {#if src && dst}
    <polyline
      points={`
      ${src.x},${src.y}
      ${dst.x},${dst.y}
  `}
    />
  {/if}

  {#if arrowPt}
    <g transform={`translate(${arrowPt.x} ${arrowPt.y})`}>
      <polygon
        transform={`rotate(${180 + (arrowAngle * 180) / Math.PI})`}
        points={`
      0,0
      ${arwi},${arhi / 2}
      ${arwi},${-arhi / 2}
  `}
      />
    </g>
  {/if}
</svg>

<!--  -->
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

  polygon {
    fill: var(--theme-font-1);
  }
</style>
