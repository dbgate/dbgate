<script lang="ts" context="module">
  import { apiCall } from '../utility/api';
  async function loadRow(props, select, options = {}) {
    const { conid, database } = props;

    if (!select) return null;

    const response = await apiCall('database-connections/sql-select', {
      conid,
      database,
      select,
      auditLogSessionGroup: 'data-form',
      ...options,
    });

    if (response.errorMessage) return response;
    return response.rows[0];
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import LoadingFormView from './LoadingFormView.svelte';

  export let display;

  async function handleLoadRow() {
    return await loadRow($$props, display.getPageQuery(display.config.formViewRecordNumber || 0, 1));
  }

  async function handleLoadRowCount() {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Row count query timed out')), 3000)
    );
    try {
      const countRow = await Promise.race([
        loadRow($$props, display.getCountQuery(), { commandTimeout: 3000 }),
        timeoutPromise,
      ]);
      return countRow ? parseInt(countRow.count) : null;
    } catch (err) {
      return { errorMessage: err.message || 'Error loading row count' };
    }
  }
</script>

<LoadingFormView {...$$props} loadRowFunc={handleLoadRow} loadRowCountFunc={handleLoadRowCount} />
