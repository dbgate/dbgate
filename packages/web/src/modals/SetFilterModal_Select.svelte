<script lang="ts">
  import FormSelectFieldRaw from '../forms/FormSelectFieldRaw.svelte';

  export let name;
  export let filterBehaviour;

  function getOptions() {
    const res = [];
    if (filterBehaviour.supportEquals) {
      res.push({ value: '=', label: 'equals' }, { value: '<>', label: 'does not equal' });
    }

    if (filterBehaviour.supportStringInclusion) {
      res.push(
        { value: '+', label: 'contains' },
        { value: '~', label: 'does not contain' },
        { value: '^', label: 'begins with' },
        { value: '!^', label: 'does not begin with' },
        { value: '$', label: 'ends with' },
        { value: '!$', label: 'does not end with' }
      );
    }

    if (filterBehaviour.supportNumberLikeComparison) {
      res.push(
        { value: '<', label: 'is smaller' },
        { value: '>', label: 'is greater' },
        { value: '<=', label: 'is smaller or equal' },
        { value: '>=', label: 'is greater or equal' }
      );
    }

    if (filterBehaviour.supportDatetimeComparison) {
      res.push(
        { value: '<', label: 'is before' },
        { value: '>', label: 'is after' },
        { value: '<=', label: 'is before or equal' },
        { value: '>=', label: 'is after or equal' }
      );
    }

    if (filterBehaviour.supportNullTesting) {
      res.push({ value: 'NULL', label: 'is NULL' }, { value: 'NOT NULL', label: 'is not NULL' });
    }

    if (filterBehaviour.supportExistsTesting) {
      res.push({ value: 'EXISTS', label: 'field exists' }, { value: 'NOT EXISTS', label: 'field does not exist' });
    }

    if (filterBehaviour.supportSqlCondition) {
      res.push(
        { value: 'sql', label: 'SQL condition' },
        { value: 'sqlRight', label: 'SQL condition - right side only' }
      );
    }

    return res;
  }
</script>

<FormSelectFieldRaw {name} options={getOptions()} isNative />
