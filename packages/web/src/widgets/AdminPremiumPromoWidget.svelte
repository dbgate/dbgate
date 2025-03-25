<script>
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { openWebLink } from '../utility/simpleTools';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
</script>

<WidgetsInnerContainer>
  <h2>Try DbGate Premium</h2>

  <p>Upgrade to get exclusive features:</p>

  <ul>
    <li>Query designer</li>
    <li>Compare database models</li>
    <li>Synchronize database structure</li>
    <li>Backup &amp; restore database</li>
    <li>Export database model</li>
    <li>AI assistant</li>
    <li>libSQL, Turso, CosmosDB, Redshift support</li>
    <li>Amazon and Azure identity providers</li>
    <li>E-mail support</li>
  </ul>

  <h2>Download DbGate Premium</h2>
  <ul>
    <li>Free 30 day trial</li>
    <li>DbGate Premium will reuse your connections and files from DbGate Community</li>
  </ul>

  <div class="center">
    <FormStyledButton on:click={() => openWebLink('https://dbgate.io/download')} value="Download" />
  </div>

  <h2>Purchase DbGate Premium</h2>
  <ul>
    <li>Use monthly or yearly subscription</li>
  </ul>

  <div class="center">
    <FormStyledButton on:click={() => openWebLink('https://dbgate.io/purchase/premium')} value="Purchase" />
  </div>
</WidgetsInnerContainer>

<style>
  h2 {
    text-align: center;
  }

  p {
    margin: 10px;
  }

  ul {
    margin: 10px;
    list-style: none;
    padding: 0;
  }

  li {
    position: relative;
    padding-left: 1rem;
    margin-bottom: 0.2rem;
  }

  li:before {
    content: '\F0E1E';
    font-family: 'Material Design Icons';
    color: var(--theme-icon-green);

    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
  }

  .center {
    text-align: center;
  }
</style>
