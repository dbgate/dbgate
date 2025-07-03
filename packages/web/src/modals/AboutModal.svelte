<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { useConfig } from '../utility/metadataLoaders';
  import moment from 'moment';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import Link from '../elements/Link.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { isProApp } from '../utility/proTools';

  const config = useConfig();
  $: version = $config?.version;
  $: buildTime = $config?.buildTime;
</script>

<ModalBase {...$$restProps}>
  <svelte:fragment slot="header">About DbGate</svelte:fragment>
  <div class="flex">
    <img src="logo192.png" />
    <div class="ml-4">
      <div>
        Version: <span>{version}</span>
      </div>
      <div>
        Build date: <span>{moment(buildTime).format('YYYY-MM-DD')}</span>
      </div>
      <div>
        License type: <span
          >{$config?.checkedLicense && $config?.checkedLicense?.type != 'community'
            ? ($config?.checkedLicense?.licenseTypeObj?.name ?? 'Unknown')
            : 'Community'}</span
        >
      </div>
      {#if $config?.checkedLicense?.users}
        <div>
          User count: <span>{$config?.checkedLicense?.users}</span>
        </div>
      {/if}

      <div class="mt-2">
        <FontIcon icon="mdi mdi-web color-icon-blue" /> Web: <Link href="https://dbgate.io">dbgate.io</Link>
      </div>
      {#if isProApp()}
        <div>
          <FontIcon icon="mdi mdi-email color-icon-red" /> Support: <Link href="mailto:support@dbgate.io"
            >support@dbgate.io</Link
          >
        </div>
      {/if}
      <div>
        <FontIcon icon="mdi mdi-lightbulb color-icon-yellow" /> Give us feedback: <Link
          href="https://dbgate.io/feedback">dbgate.io/feedback</Link
        >
      </div>

      <div class="mt-2">
        Source codes: <Link href="https://github.com/dbgate/dbgate/">GitHub</Link>
      </div>
      <div>
        Docker container: <Link
          href={isProApp()
            ? 'https://hub.docker.com/r/dbgate/dbgate-premium'
            : 'https://hub.docker.com/r/dbgate/dbgate'}>Docker Hub</Link
        >
      </div>
      <!-- <div>
        Search plugins: <Link href="https://www.npmjs.com/search?q=keywords:dbgateplugin">npmjs.com</Link>
      </div> -->

      <div class="mt-2">
        Produced by: <span>Sprinx System a.s.</span>
      </div>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <FormStyledButton value="Close" on:click={closeCurrentModal} />
  </svelte:fragment>
</ModalBase>

<style>
  span {
    font-weight: bold;
  }
</style>
