<script lang="ts" context="module">
  async function loadRow(props, select) {
    const { conid, database } = props;

    if (!select) return null;

    const response = await apiCall('database-connections/sql-select', {
      conid,
      database,
      select,
    });

    if (response.errorMessage) return response;
    return response.rows[0];
  }
</script>

<script lang="ts">
  import { apiCall } from '../utility/api';
  import _ from 'lodash';
  import LoadingFormView from './LoadingFormView.svelte';

  export let display;

  async function handleLoadRow() {
    return await loadRow($$props, display.getPageQuery(display.config.formViewRecordNumber || 0, 1));
  }

  async function handleLoadRowCount() {
    const countRow = await loadRow($$props, display.getCountQuery());
    return countRow ? parseInt(countRow.count) : null;
  }
</script>

<LoadingFormView {...$$props} loadRowFunc={handleLoadRow} loadRowCountFunc={handleLoadRowCount} />
