<script lang="ts" context="module">
  async function loadRow(props, index) {
    const { jslid, formatterFunction, display } = props;

    const response = await apiCall('jsldata/get-rows', {
      jslid,
      offset: index,
      limit: 1,
      formatterFunction,
      filters: display ? display.compileJslFilters() : null,
    });

    if (response.errorMessage) return response;
    return response[0];
  }
</script>

<script lang="ts">
  import { apiCall } from '../utility/api';
  import _ from 'lodash';
  import LoadingFormView from './LoadingFormView.svelte';

  export let display;

  async function handleLoadRow() {
    return await loadRow($$props, display.config.formViewRecordNumber || 0);
  }

  async function handleLoadRowCount() {
    return null;
  }
</script>

<LoadingFormView {...$$props} loadRowFunc={handleLoadRow} loadRowCountFunc={handleLoadRowCount} rowCountNotAvailable />
