<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let constraintType;
  export let constraintName;

  function getConstraintIcon(type) {
    if (type == 'primaryKey') return 'img primary-key';
    if (type == 'foreignKey') return 'img foreign-key';
    return null;
  }
</script>

<span class="nowrap">
  <FontIcon icon={getConstraintIcon(constraintType)} />
  {constraintName || '(without name)'}
</span>
