<script lang="ts">
  import FormSelectFieldRaw from '../forms/FormSelectFieldRaw.svelte';

  export let name;
  export let filterType;

  function getOptions() {
    switch (filterType) {
      case 'number':
        return [
          { value: '=', label: 'eqals' },
          { value: '<>', label: 'does not equal' },
          { value: '<', label: 'is smaller' },
          { value: '>', label: 'is greater' },
          { value: '<=', label: 'is smaller or equal' },
          { value: '>=', label: 'is greater or equal' },
        ];
      case 'string':
        return [
          { value: '+', label: 'contains' },
          { value: '~', label: 'does not contain' },
          { value: '^', label: 'begins with' },
          { value: '!^', label: 'does not begin with' },
          { value: '$', label: 'ends with' },
          { value: '!$', label: 'does not end with' },
          { value: '=', label: 'equals' },
          { value: '<>', label: 'does not equal' },
          { value: '<', label: 'is smaller' },
          { value: '>', label: 'is greater' },
          { value: '<=', label: 'is smaller or equal' },
          { value: '>=', label: 'is greater or equal' },
        ];
      case 'datetime':
        return [
          { value: '=', label: 'eqals' },
          { value: '<>', label: 'does not equal' },
          { value: '<', label: 'is before' },
          { value: '>', label: 'is after' },
          { value: '<=', label: 'is before or equal' },
          { value: '>=', label: 'is after or equal' },
        ];
    }
  }
</script>

<FormSelectFieldRaw {name} options={getOptions()} isNative />
