<script lang="ts">
  import _ from 'lodash';

  import Designer from './Designer.svelte';
  import { isConnectedByReference, referenceIsConnecting } from './designerTools';
  import QueryDesignerReference from './QueryDesignerReference.svelte';
</script>

<Designer
  {...$$props}
  settings={{
    showTableCloseButton: true,
    allowColumnOperations: true,
    allowCreateRefByDrag: true,
    allowTableAlias: true,
    allowScrollColumns: true,
    canSelectColumns: true,
    referenceMenu: ({ designer, reference, onChangeReference, onRemoveReference }) => {
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
    },
    createReferenceText: reference =>
      _.snakeCase(reference?.joinType || 'CROSS JOIN')
        .replace('_', '\xa0')
        .replace('_', '\xa0'),
  }}
  referenceComponent={QueryDesignerReference}
/>
