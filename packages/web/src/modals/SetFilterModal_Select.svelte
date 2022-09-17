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
          { value: 'NULL', label: 'is NULL' },
          { value: 'NOT NULL', label: 'is not NULL' },
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
          { value: 'NULL', label: 'is NULL' },
          { value: 'NOT NULL', label: 'is not NULL' },
        ];
      case 'datetime':
        return [
          { value: '=', label: 'eqals' },
          { value: '<>', label: 'does not equal' },
          { value: '<', label: 'is before' },
          { value: '>', label: 'is after' },
          { value: '<=', label: 'is before or equal' },
          { value: '>=', label: 'is after or equal' },
          { value: 'NULL', label: 'is NULL' },
          { value: 'NOT NULL', label: 'is not NULL' },
        ];
      case 'mongo':
        return [
          { value: '=', label: 'eqals' },
          { value: '<>', label: 'does not equal' },
          { value: '<', label: 'is smaller' },
          { value: '>', label: 'is greater' },
          { value: '<=', label: 'is smaller or equal' },
          { value: '>=', label: 'is greater or equal' },
          { value: '+', label: 'contains' },
          { value: '~', label: 'does not contain' },
          { value: '^', label: 'begins with' },
          { value: '!^', label: 'does not begin with' },
          { value: '$', label: 'ends with' },
          { value: '!$', label: 'does not end with' },
          { value: 'EXISTS', label: 'field exists' },
          { value: 'NOT EXISTS', label: 'field does not exist' },
        ];
      case 'eval':
        return [
          { value: '=', label: 'eqals' },
          { value: '<>', label: 'does not equal' },
          { value: '<', label: 'is smaller' },
          { value: '>', label: 'is greater' },
          { value: '<=', label: 'is smaller or equal' },
          { value: '>=', label: 'is greater or equal' },
          { value: '+', label: 'contains' },
          { value: '~', label: 'does not contain' },
          { value: '^', label: 'begins with' },
          { value: '!^', label: 'does not begin with' },
          { value: '$', label: 'ends with' },
          { value: '!$', label: 'does not end with' },
          { value: 'NULL', label: 'is NULL' },
          { value: 'NOT NULL', label: 'is not NULL' },
        ];
    }
  }
</script>

<FormSelectFieldRaw {name} options={getOptions()} isNative />
