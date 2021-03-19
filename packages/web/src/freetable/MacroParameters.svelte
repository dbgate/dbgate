<script lang="ts">
  import _ from 'lodash';
  import { getContext } from 'svelte';
  import { writable } from 'svelte/store';
  import FormArgumentList from '../forms/FormArgumentList.svelte';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormFieldTemplateRow from '../forms/FormFieldTemplateRow.svelte';

  export let args = [];
  const macroValues = getContext('macroValues');
  export let namePrefix;
  // export let onChangeValues;

  //   const initialValues = {
  //     ..._.fromPairs(args.filter(x => x.default != null).map(x => [`${namePrefix}${x.name}`, x.default])),
  //     ...macroValues,
  //   };

  // const values = writable(initialValues);

  // $: if (onChangeValues) onChangeValues($values);
</script>

<FormProviderCore values={macroValues} template={FormFieldTemplateRow}>
  <FormArgumentList {args} {namePrefix} />
</FormProviderCore>
