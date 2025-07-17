<script lang="ts">
  import flatpickr from 'flatpickr';
  import 'flatpickr/dist/flatpickr.min.css';
  import 'flatpickr/dist/themes/dark.css';

  import { onMount } from 'svelte';

  let flatpickrInstance;
  let inputElement;

  export let defaultValue = ['today', 'today'];
  export let onChange: (value) => void;

  onMount(() => {
    flatpickrInstance = flatpickr(inputElement, {
      mode: 'range',
      maxDate: 'today',
      dateFormat: 'Y-m-d',
      defaultDate: defaultValue,

      onClose: selectedDates => {
        console.log('Selected dates:', selectedDates);
        if (selectedDates.length === 1) {
          flatpickrInstance.setDate([selectedDates[0], selectedDates[0]], true);
        }
        onChange(selectedDates.length == 1 ? [selectedDates[0], selectedDates[0]] : selectedDates);
      },
    });
  });
</script>

<input bind:this={inputElement} type="text" class="input1" />
