<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { useConfig } from '../utility/metadataLoaders';
  import moment from 'moment';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import Link from '../elements/Link.svelte';

  const config = useConfig();
  $: version = $config?.version;
  $: buildTime = $config?.buildTime;
</script>

<ModalBase {...$$restProps}>
  <svelte:fragment slot="header">About DbGate</svelte:fragment>
  <div class="flex">
    <img src="logo192.png" />
    <div>
      <div class="m-1">
        Version: <span>{version}</span>
      </div>
      <div class="m-1">
        Build date: <span>{moment(buildTime).format('YYYY-MM-DD')}</span>
      </div>
      <div class="m-1">
        Web: <Link href="https://dbgate.org">dbgate.org</Link>
      </div>
      <div class="m-1">
        Source codes: <Link href="https://github.com/dbgate/dbgate/">github</Link>
      </div>
      <div class="m-1">
        Docker container: <Link href="https://hub.docker.com/r/dbgate/dbgate">docker hub</Link>
      </div>
      <div class="m-1">
        Online demo: <Link href="https://demo.dbgate.org">demo.dbgate.org</Link>
      </div>
      <div class="m-1">
        Search plugins: <Link href="https://www.npmjs.com/search?q=keywords:dbgateplugin">npmjs.com</Link>
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
