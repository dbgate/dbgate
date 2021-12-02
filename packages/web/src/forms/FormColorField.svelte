<script lang="ts">
  import _ from 'lodash';

  import FormSelectField from '../forms/FormSelectField.svelte';
  import { presetPrimaryColors } from '@ant-design/colors';

  export let emptyLabel;
</script>

<FormSelectField
  isNative
  {...$$restProps}
  options={[
    { value: '', label: emptyLabel },
    ..._.keys(presetPrimaryColors).map(color => ({ value: color, label: _.startCase(color) })),
  ]}
/>
