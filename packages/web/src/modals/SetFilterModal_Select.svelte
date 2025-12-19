<script lang="ts">
  import _ from 'lodash';
  import FormSelectFieldRaw from '../forms/FormSelectFieldRaw.svelte';
  import { _t } from '../translations';
  export let name;
  export let filterBehaviour;

  function getOptions() {
    const res = [];
    if (filterBehaviour.supportEquals) {
      res.push({ value: '=', label: _t('filter.modal.equals', {defaultMessage: 'equals'}) }, { value: '<>', label: _t('filter.modal.doesNotEqual', {defaultMessage: 'does not equal'}) });
    };

    if (filterBehaviour.supportStringInclusion) {
      res.push(
        { value: '+', label: _t('filter.modal.contains', {defaultMessage: 'contains'}) },
        { value: '~', label: _t('filter.modal.doesNotContain', {defaultMessage: 'does not contain'}) },
        { value: '^', label: _t('filter.modal.beginsWith', {defaultMessage: 'begins with'}) },
        { value: '!^', label: _t('filter.modal.doesNotBeginWith', {defaultMessage: 'does not begin with'}) },
        { value: '$', label: _t('filter.modal.endsWith', {defaultMessage: 'ends with'}) },
        { value: '!$', label: _t('filter.modal.doesNotEndWith', {defaultMessage: 'does not end with'}) }
      );
    }

    if (filterBehaviour.supportNumberLikeComparison) {
      res.push(
        { value: '<', label: _t('filter.isSmaller', {defaultMessage: 'is smaller'}) },
        { value: '>', label: _t('filter.isGreater', {defaultMessage: 'is greater'}) },
        { value: '<=', label: _t('filter.isSmallerOrEqual', {defaultMessage: 'is smaller or equal'}) },
        { value: '>=', label: _t('filter.isGreaterOrEqual', {defaultMessage: 'is greater or equal'}) }
      );
    }

    if (filterBehaviour.supportDatetimeComparison) {
      res.push(
        { value: '<', label: _t('filter.isBefore', {defaultMessage: 'is before'}) },
        { value: '>', label: _t('filter.isAfter', {defaultMessage: 'is after'}) },
        { value: '<=', label: _t('filter.isBeforeOrEqual', {defaultMessage: 'is before or equal'}) },
        { value: '>=', label: _t('filter.isAfterOrEqual', {defaultMessage: 'is after or equal'}) }
      );
    }

    if (filterBehaviour.supportNullTesting) {
      res.push({ value: 'NULL', label: _t('filter.modal.isNull', {defaultMessage: 'is NULL'}) }, { value: 'NOT NULL', label: _t('filter.modal.isNotNull', {defaultMessage: 'is not NULL'}) });
    }

    if (filterBehaviour.supportExistsTesting) {
      res.push({ value: 'EXISTS', label: _t('filter.modal.fieldExists', {defaultMessage: 'field exists'}) }, { value: 'NOT EXISTS', label: _t('filter.modal.fieldDoesNotExist', {defaultMessage: 'field does not exist'}) });
    }

    if (filterBehaviour.supportSqlCondition) {
      res.push(
        { value: 'sql', label: _t('filter.modal.sqlCondition', {defaultMessage: 'SQL condition'}) },
        { value: 'sqlRight', label: _t('filter.modal.sqlConditionRight', {defaultMessage: 'SQL condition - right side only'}) }
      );
    }

    return res;
  }
</script>

<FormSelectFieldRaw {name} options={getOptions()} isNative />
