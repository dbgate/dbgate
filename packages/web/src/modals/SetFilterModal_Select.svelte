<script lang="ts">
  import FormSelectFieldRaw from '../forms/FormSelectFieldRaw.svelte';

  export let name;
  export let filterType;
  export let structuredFilterType;

  function getOptions() {
    const res = [];
    if (structuredFilterType.supportEquals) {
      res.push({ value: '=', label: 'equals' }, { value: '<>', label: 'does not equal' });
    }

    if (structuredFilterType.supportStringInclusion) {
      res.push(
        { value: '+', label: 'contains' },
        { value: '~', label: 'does not contain' },
        { value: '^', label: 'begins with' },
        { value: '!^', label: 'does not begin with' },
        { value: '$', label: 'ends with' },
        { value: '!$', label: 'does not end with' }
      );
    }

    if (structuredFilterType.supportNumberLikeComparison) {
      res.push(
        { value: '<', label: 'is smaller' },
        { value: '>', label: 'is greater' },
        { value: '<=', label: 'is smaller or equal' },
        { value: '>=', label: 'is greater or equal' }
      );
    }

    if (structuredFilterType.supportDatetimeComparison) {
      res.push(
        { value: '<', label: 'is before' },
        { value: '>', label: 'is after' },
        { value: '<=', label: 'is before or equal' },
        { value: '>=', label: 'is after or equal' }
      );
    }

    if (structuredFilterType.supportNullTesting) {
      res.push({ value: 'NULL', label: 'is NULL' }, { value: 'NOT NULL', label: 'is not NULL' });
    }

    if (structuredFilterType.supportExistsTesting) {
      res.push({ value: 'EXISTS', label: 'field exists' }, { value: 'NOT EXISTS', label: 'field does not exist' });
    }

    if (structuredFilterType.supportSqlCondition) {
      res.push(
        { value: 'sql', label: 'SQL condition' },
        { value: 'sqlRight', label: 'SQL condition - right side only' }
      );
    }

    return res;
  }
</script>

<FormSelectFieldRaw {name} options={getOptions()} isNative />
