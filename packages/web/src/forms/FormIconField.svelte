<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import { getFormContext } from './FormProviderCore.svelte';

  export let name;
  export let label;
  export let defaultIcon;

  export let templateProps = {};
  const { template, values, setFieldValue } = getFormContext();

  let showPicker = false;

  // Real-world subject icons for application identification
  const ICONS = [
    { icon: defaultIcon, name: '(Default icon)' },

    // Applications & Tools
    { icon: 'mdi mdi-application', name: 'Application' },
    { icon: 'mdi mdi-cog', name: 'Settings' },
    { icon: 'mdi mdi-tools', name: 'Tools' },
    { icon: 'mdi mdi-wrench', name: 'Wrench' },
    { icon: 'mdi mdi-hammer', name: 'Hammer' },
    { icon: 'mdi mdi-screwdriver', name: 'Screwdriver' },
    { icon: 'mdi mdi-palette', name: 'Palette' },
    { icon: 'mdi mdi-brush', name: 'Brush' },
    { icon: 'mdi mdi-calculator', name: 'Calculator' },

    // Files & Folders
    { icon: 'mdi mdi-file', name: 'File' },
    { icon: 'mdi mdi-folder', name: 'Folder' },
    { icon: 'mdi mdi-folder-open', name: 'Folder Open' },
    { icon: 'mdi mdi-file-document', name: 'Document' },
    { icon: 'mdi mdi-file-image', name: 'Image File' },
    { icon: 'mdi mdi-file-video', name: 'Video File' },
    { icon: 'mdi mdi-file-music', name: 'Music File' },
    { icon: 'mdi mdi-archive', name: 'Archive' },


    // Core Applications
    { icon: 'mdi mdi-database', name: 'Database' },
    { icon: 'mdi mdi-server', name: 'Server' },
    { icon: 'mdi mdi-web', name: 'Web' },
    { icon: 'mdi mdi-cloud', name: 'Cloud' },
    { icon: 'mdi mdi-monitor', name: 'Monitor' },
    { icon: 'mdi mdi-laptop', name: 'Laptop' },
    { icon: 'mdi mdi-cellphone', name: 'Mobile' },

    // Business & Finance
    { icon: 'mdi mdi-briefcase', name: 'Business' },
    { icon: 'mdi mdi-bank', name: 'Banking' },
    { icon: 'mdi mdi-currency-usd', name: 'Finance' },
    { icon: 'mdi mdi-chart-line', name: 'Analytics' },
    { icon: 'mdi mdi-chart-bar', name: 'Reports' },
    { icon: 'mdi mdi-chart-pie', name: 'Statistics' },
    { icon: 'mdi mdi-calculator', name: 'Calculator' },
    { icon: 'mdi mdi-cash-register', name: 'Sales' },
    { icon: 'mdi mdi-credit-card', name: 'Payments' },
    { icon: 'mdi mdi-receipt', name: 'Invoicing' },

    // Communication & Social
    { icon: 'mdi mdi-email', name: 'Email' },
    { icon: 'mdi mdi-phone', name: 'Phone' },
    { icon: 'mdi mdi-message', name: 'Messaging' },
    { icon: 'mdi mdi-chat', name: 'Chat' },
    { icon: 'mdi mdi-forum', name: 'Forum' },
    { icon: 'mdi mdi-account-group', name: 'Team' },
    { icon: 'mdi mdi-bullhorn', name: 'Marketing' },
    { icon: 'mdi mdi-newspaper', name: 'News' },

    // Education & Knowledge
    { icon: 'mdi mdi-school', name: 'Education' },
    { icon: 'mdi mdi-book', name: 'Library' },
    { icon: 'mdi mdi-book-open', name: 'Learning' },
    { icon: 'mdi mdi-certificate', name: 'Certification' },
    { icon: 'mdi mdi-graduation-cap', name: 'Academic' },
    { icon: 'mdi mdi-microscope', name: 'Research' },
    { icon: 'mdi mdi-flask', name: 'Laboratory' },
    { icon: 'mdi mdi-library', name: 'Archive' },

    // Healthcare & Medical
    { icon: 'mdi mdi-hospital-building', name: 'Hospital' },
    { icon: 'mdi mdi-medical-bag', name: 'Medical' },
    { icon: 'mdi mdi-heart-pulse', name: 'Health' },
    { icon: 'mdi mdi-pill', name: 'Pharmacy' },
    { icon: 'mdi mdi-tooth', name: 'Dental' },
    { icon: 'mdi mdi-eye', name: 'Vision' },
    { icon: 'mdi mdi-stethoscope', name: 'Clinic' },

    // Transportation & Logistics
    { icon: 'mdi mdi-truck', name: 'Logistics' },
    { icon: 'mdi mdi-car', name: 'Automotive' },
    { icon: 'mdi mdi-airplane', name: 'Aviation' },
    { icon: 'mdi mdi-ship-wheel', name: 'Maritime' },
    { icon: 'mdi mdi-train', name: 'Railway' },
    { icon: 'mdi mdi-bus', name: 'Transit' },
    { icon: 'mdi mdi-bike', name: 'Cycling' },
    { icon: 'mdi mdi-map', name: 'Navigation' },
    { icon: 'mdi mdi-gas-station', name: 'Fuel' },

    // Real Estate & Construction
    { icon: 'mdi mdi-home', name: 'Real Estate' },
    { icon: 'mdi mdi-office-building', name: 'Commercial' },
    { icon: 'mdi mdi-factory', name: 'Industrial' },
    { icon: 'mdi mdi-hammer', name: 'Construction' },
    { icon: 'mdi mdi-wrench', name: 'Maintenance' },
    { icon: 'mdi mdi-tools', name: 'Tools' },
    { icon: 'mdi mdi-city', name: 'Urban Planning' },

    // Retail & E-commerce
    { icon: 'mdi mdi-store', name: 'Retail' },
    { icon: 'mdi mdi-shopping', name: 'Shopping' },
    { icon: 'mdi mdi-cart', name: 'E-commerce' },
    { icon: 'mdi mdi-barcode', name: 'Inventory' },
    { icon: 'mdi mdi-package-variant', name: 'Shipping' },
    { icon: 'mdi mdi-gift', name: 'Gifts' },

    // Entertainment & Media
    { icon: 'mdi mdi-camera', name: 'Photography' },
    { icon: 'mdi mdi-video', name: 'Video' },
    { icon: 'mdi mdi-music', name: 'Music' },
    { icon: 'mdi mdi-gamepad-variant', name: 'Gaming' },
    { icon: 'mdi mdi-movie', name: 'Cinema' },
    { icon: 'mdi mdi-television', name: 'Broadcasting' },
    { icon: 'mdi mdi-radio', name: 'Radio' },
    { icon: 'mdi mdi-theater', name: 'Theater' },

    // Food & Hospitality
    { icon: 'mdi mdi-food', name: 'Food Service' },
    { icon: 'mdi mdi-coffee', name: 'Cafe' },
    { icon: 'mdi mdi-silverware-fork-knife', name: 'Restaurant' },
    { icon: 'mdi mdi-pizza', name: 'Pizza' },
    { icon: 'mdi mdi-cake', name: 'Bakery' },
    { icon: 'mdi mdi-glass-wine', name: 'Bar' },
    { icon: 'mdi mdi-bed', name: 'Hotel' },

    // Sports & Fitness
    { icon: 'mdi mdi-dumbbell', name: 'Fitness' },
    { icon: 'mdi mdi-basketball', name: 'Basketball' },
    { icon: 'mdi mdi-soccer', name: 'Soccer' },
    { icon: 'mdi mdi-tennis', name: 'Tennis' },
    { icon: 'mdi mdi-golf', name: 'Golf' },
    { icon: 'mdi mdi-run', name: 'Running' },
    { icon: 'mdi mdi-swim', name: 'Swimming' },
    { icon: 'mdi mdi-yoga', name: 'Yoga' },

    // Nature & Environment
    { icon: 'mdi mdi-tree', name: 'Forestry' },
    { icon: 'mdi mdi-flower', name: 'Gardening' },
    { icon: 'mdi mdi-leaf', name: 'Environment' },
    { icon: 'mdi mdi-weather-sunny', name: 'Weather' },
    { icon: 'mdi mdi-earth', name: 'Geography' },
    { icon: 'mdi mdi-water', name: 'Water' },
    { icon: 'mdi mdi-fire', name: 'Energy' },
    { icon: 'mdi mdi-lightning-bolt', name: 'Power' },

    // Science & Technology
    { icon: 'mdi mdi-rocket', name: 'Aerospace' },
    { icon: 'mdi mdi-atom', name: 'Physics' },
    { icon: 'mdi mdi-dna', name: 'Genetics' },
    { icon: 'mdi mdi-telescope', name: 'Astronomy' },
    { icon: 'mdi mdi-robot', name: 'Robotics' },
    { icon: 'mdi mdi-chip', name: 'Electronics' },

    // Security & Safety
    { icon: 'mdi mdi-shield', name: 'Security' },
    { icon: 'mdi mdi-lock', name: 'Access Control' },
    { icon: 'mdi mdi-key', name: 'Authentication' },
    { icon: 'mdi mdi-fire-truck', name: 'Emergency' },
    { icon: 'mdi mdi-police-badge', name: 'Law Enforcement' },

    // Time & Scheduling
    { icon: 'mdi mdi-calendar', name: 'Calendar' },
    { icon: 'mdi mdi-clock', name: 'Time Tracking' },
    { icon: 'mdi mdi-timer', name: 'Timer' },
    { icon: 'mdi mdi-alarm', name: 'Reminders' },

    // Creative & Design
    { icon: 'mdi mdi-palette', name: 'Design' },
    { icon: 'mdi mdi-brush', name: 'Art' },
    { icon: 'mdi mdi-draw', name: 'Drawing' },
    { icon: 'mdi mdi-image', name: 'Graphics' },
    { icon: 'mdi mdi-format-paint', name: 'Painting' },

    // Alpha Icons
    { icon: 'mdi mdi-alpha-a-circle', name: 'A' },
    { icon: 'mdi mdi-alpha-b-circle', name: 'B' },
    { icon: 'mdi mdi-alpha-c-circle', name: 'C' },
    { icon: 'mdi mdi-alpha-d-circle', name: 'D' },
    { icon: 'mdi mdi-alpha-e-circle', name: 'E' },
    { icon: 'mdi mdi-alpha-f-circle', name: 'F' },
    { icon: 'mdi mdi-alpha-g-circle', name: 'G' },
    { icon: 'mdi mdi-alpha-h-circle', name: 'H' },
    { icon: 'mdi mdi-alpha-i-circle', name: 'I' },
    { icon: 'mdi mdi-alpha-j-circle', name: 'J' },
    { icon: 'mdi mdi-alpha-k-circle', name: 'K' },
    { icon: 'mdi mdi-alpha-l-circle', name: 'L' },
    { icon: 'mdi mdi-alpha-m-circle', name: 'M' },
    { icon: 'mdi mdi-alpha-n-circle', name: 'N' },
    { icon: 'mdi mdi-alpha-o-circle', name: 'O' },
    { icon: 'mdi mdi-alpha-p-circle', name: 'P' },
    { icon: 'mdi mdi-alpha-q-circle', name: 'Q' },
    { icon: 'mdi mdi-alpha-r-circle', name: 'R' },
    { icon: 'mdi mdi-alpha-s-circle', name: 'S' },
    { icon: 'mdi mdi-alpha-t-circle', name: 'T' },
    { icon: 'mdi mdi-alpha-u-circle', name: 'U' },
    { icon: 'mdi mdi-alpha-v-circle', name: 'V' },
    { icon: 'mdi mdi-alpha-w-circle', name: 'W' },
    { icon: 'mdi mdi-alpha-x-circle', name: 'X' },
    { icon: 'mdi mdi-alpha-y-circle', name: 'Y' },
    { icon: 'mdi mdi-alpha-z-circle', name: 'Z' },

    // Numeric Icons
    { icon: 'mdi mdi-numeric-0-circle', name: '0' },
    { icon: 'mdi mdi-numeric-1-circle', name: '1' },
    { icon: 'mdi mdi-numeric-2-circle', name: '2' },
    { icon: 'mdi mdi-numeric-3-circle', name: '3' },
    { icon: 'mdi mdi-numeric-4-circle', name: '4' },
    { icon: 'mdi mdi-numeric-5-circle', name: '5' },
    { icon: 'mdi mdi-numeric-6-circle', name: '6' },
    { icon: 'mdi mdi-numeric-7-circle', name: '7' },
    { icon: 'mdi mdi-numeric-8-circle', name: '8' },
    { icon: 'mdi mdi-numeric-9-circle', name: '9' },
    { icon: 'mdi mdi-numeric-10-circle', name: '10' },

    // Alpha Outline Icons
    { icon: 'mdi mdi-alpha-a-circle-outline', name: 'A Outline' },
    { icon: 'mdi mdi-alpha-b-circle-outline', name: 'B Outline' },
    { icon: 'mdi mdi-alpha-c-circle-outline', name: 'C Outline' },
    { icon: 'mdi mdi-alpha-d-circle-outline', name: 'D Outline' },
    { icon: 'mdi mdi-alpha-e-circle-outline', name: 'E Outline' },
    { icon: 'mdi mdi-alpha-f-circle-outline', name: 'F Outline' },
    { icon: 'mdi mdi-alpha-g-circle-outline', name: 'G Outline' },
    { icon: 'mdi mdi-alpha-h-circle-outline', name: 'H Outline' },
    { icon: 'mdi mdi-alpha-i-circle-outline', name: 'I Outline' },
    { icon: 'mdi mdi-alpha-j-circle-outline', name: 'J Outline' },
    { icon: 'mdi mdi-alpha-k-circle-outline', name: 'K Outline' },
    { icon: 'mdi mdi-alpha-l-circle-outline', name: 'L Outline' },
    { icon: 'mdi mdi-alpha-m-circle-outline', name: 'M Outline' },
    { icon: 'mdi mdi-alpha-n-circle-outline', name: 'N Outline' },
    { icon: 'mdi mdi-alpha-o-circle-outline', name: 'O Outline' },
    { icon: 'mdi mdi-alpha-p-circle-outline', name: 'P Outline' },
    { icon: 'mdi mdi-alpha-q-circle-outline', name: 'Q Outline' },
    { icon: 'mdi mdi-alpha-r-circle-outline', name: 'R Outline' },
    { icon: 'mdi mdi-alpha-s-circle-outline', name: 'S Outline' },
    { icon: 'mdi mdi-alpha-t-circle-outline', name: 'T Outline' },
    { icon: 'mdi mdi-alpha-u-circle-outline', name: 'U Outline' },
    { icon: 'mdi mdi-alpha-v-circle-outline', name: 'V Outline' },
    { icon: 'mdi mdi-alpha-w-circle-outline', name: 'W Outline' },
    { icon: 'mdi mdi-alpha-x-circle-outline', name: 'X Outline' },
    { icon: 'mdi mdi-alpha-y-circle-outline', name: 'Y Outline' },
    { icon: 'mdi mdi-alpha-z-circle-outline', name: 'Z Outline' },

    // Numeric Outline Icons
    { icon: 'mdi mdi-numeric-0-circle-outline', name: '0 Outline' },
    { icon: 'mdi mdi-numeric-1-circle-outline', name: '1 Outline' },
    { icon: 'mdi mdi-numeric-2-circle-outline', name: '2 Outline' },
    { icon: 'mdi mdi-numeric-3-circle-outline', name: '3 Outline' },
    { icon: 'mdi mdi-numeric-4-circle-outline', name: '4 Outline' },
    { icon: 'mdi mdi-numeric-5-circle-outline', name: '5 Outline' },
    { icon: 'mdi mdi-numeric-6-circle-outline', name: '6 Outline' },
    { icon: 'mdi mdi-numeric-7-circle-outline', name: '7 Outline' },
    { icon: 'mdi mdi-numeric-8-circle-outline', name: '8 Outline' },
    { icon: 'mdi mdi-numeric-9-circle-outline', name: '9 Outline' },
    { icon: 'mdi mdi-numeric-10-circle-outline', name: '10 Outline' },
  ];

  function selectIcon(iconName) {
    setFieldValue(name, iconName);
    showPicker = false;
  }

  function togglePicker() {
    showPicker = !showPicker;
  }

  function handleKeydown(event, action) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  $: iconValue = $values?.[name];
</script>

<svelte:component this={template} type="select" {label} {...templateProps}>
  <div class="icon-field-container">
    <div
      class="selected-icon"
      on:click={togglePicker}
      on:keydown={e => handleKeydown(e, togglePicker)}
      role="button"
      tabindex="0"
    >
      <FontIcon icon={iconValue || defaultIcon} />
      <span class="icon-name">{ICONS.find(icon => icon.icon === iconValue)?.name || '(Default icon)'}</span>
      <FontIcon icon="icon chevron-down" />
    </div>

    {#if showPicker}
      <div class="icon-picker">
        <div class="icon-picker-header">
          <span>Choose an icon</span>
          <InlineButton on:click={togglePicker}>
            <FontIcon icon="icon close" />
          </InlineButton>
        </div>

        <div class="icon-grid">
          {#each ICONS as { icon, name: iconDisplayName }}
            <div
              class="icon-option"
              class:selected={iconValue === icon}
              on:click={() => selectIcon(icon)}
              on:keydown={e => handleKeydown(e, () => selectIcon(icon))}
              role="button"
              tabindex="0"
              title={iconDisplayName}
            >
              <FontIcon {icon} />
              <span class="icon-label">{iconDisplayName}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</svelte:component>

<style>
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--theme-font-1);
  }
  .icon-field-container {
    position: relative;
  }

  .selected-icon {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 1px solid var(--theme-border);
    border-radius: 4px;
    background: var(--theme-bg-0);
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .selected-icon:hover {
    border-color: var(--theme-border-hover);
  }

  .selected-icon:focus {
    outline: none;
    border-color: var(--theme-font-link);
    box-shadow: 0 0 0 2px var(--theme-font-link-opacity);
  }

  .icon-name {
    flex: 1;
    color: var(--theme-font-1);
  }

  .icon-picker {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1000;
    background: var(--theme-bg-0);
    border: 1px solid var(--theme-border);
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-height: 400px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .icon-picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border-bottom: 1px solid var(--theme-border);
    background: var(--theme-bg-1);
    font-weight: 500;
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 1px;
    padding: 0.5rem;
    overflow-y: auto;
    max-height: 320px;
  }

  .icon-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
    text-align: center;
  }

  .icon-option:hover {
    background: var(--theme-bg-hover);
  }

  .icon-option.selected {
    background: var(--theme-bg-selected);
    color: var(--theme-font-link);
  }

  .icon-option:focus {
    outline: none;
    background: var(--theme-bg-hover);
    box-shadow: 0 0 0 2px var(--theme-font-link-opacity);
  }

  .icon-label {
    font-size: 0.75rem;
    color: var(--theme-font-2);
    line-height: 1.2;
    word-break: break-word;
  }

  .icon-option.selected .icon-label {
    color: var(--theme-font-link);
    font-weight: 500;
  }
</style>
