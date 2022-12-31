<script lang="ts">
  import _ from 'lodash';
  import SelectionMapView, { findAllObjectPaths, findLatPaths, findLonPaths } from '../elements/SelectionMapView.svelte';
  import SelectField from '../forms/SelectField.svelte';

  export let selection;

  $: latitudeFields = _.uniq(_.flatten(selection.map(x => findLatPaths(x.rowData)))) as string[];
  $: longitudeFields = _.uniq(_.flatten(selection.map(x => findLonPaths(x.rowData)))) as string[];
  $: allFields = _.uniq(_.flatten(selection.map(x => findAllObjectPaths(x.rowData)))) as string[];

  let latitudeField = '';
  let longitudeField = '';

  $: {
    if (latitudeFields.length > 0 && !allFields.includes(latitudeField)) {
      latitudeField = latitudeFields[0];
    }
  }
  $: {
    if (longitudeFields.length > 0 && !allFields.includes(longitudeField)) {
      longitudeField = longitudeFields[0];
    }
  }
</script>

<div class="container">
  {#if allFields.length >= 2}
    <div>
      Lat:
      <SelectField
        isNative
        options={allFields.map(x => ({ label: x, value: x }))}
        value={latitudeField}
        on:change={e => {
          latitudeField = e.detail;
        }}
      />
      Lon:
      <SelectField
        isNative
        options={allFields.map(x => ({ label: x, value: x }))}
        value={longitudeField}
        on:change={e => {
          longitudeField = e.detail;
        }}
      />
    </div>
  {/if}

  <SelectionMapView {selection} {latitudeField} {longitudeField} />
</div>

<style>
  .container {
    display: flex;
    flex: 1;
    flex-direction: column;
  }
</style>
