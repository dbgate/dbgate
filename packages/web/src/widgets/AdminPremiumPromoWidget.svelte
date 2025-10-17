<script lang='ts'>
  import JsonUiContentRenderer from '../jsonui/JsonUiContentRenderer.svelte';
  import { JsonUiBlock } from '../jsonui/jsonuitypes';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  const data: JsonUiBlock[] = [
    { type: 'heading', text: 'Try DbGate Premium' },
    { type: 'text', text: 'Upgrade to get exclusive features:' },
    {
      type: 'ticklist',
      items: [
        'Query designer',
        'AI powered database chat',
        'Unlimited DbGate Cloud storage',
        'Shared cloud folders',
        'Charts from query result',
        'Compare database models',
        'Synchronize database structure',
        'Backup & restore database',
        'Advanced ER diagram settings',
        'Export database model',
        'Firestore, libSQL, Turso, CosmosDB, Redshift support',
        'Amazon and Azure identity providers',
        'E-mail support',
      ],
    },

    { type: 'heading', text: 'Download DbGate Premium' },
    {
      type: 'ticklist',
      items: ['Free 30 day trial', 'DbGate Premium will reuse your connections and files from DbGate Community'],
    },
    { type: 'button', text: 'Download', link: 'https://www.dbgate.io/download' },

    { type: 'heading', text: 'Purchase DbGate Premium' },
    {
      type: 'ticklist',
      items: ['Use monthly or yearly subscription'],
    },
    { type: 'button', text: 'Purchase', link: 'https://www.dbgate.io/purchase/premium' },

    { type: 'heading', text: 'Get PREMIUM license for free' },
    {
      type: 'text',
      text: 'Your feedback is very valuable for us. We have time-limited offers available for users who provide feedback.',
    },
    {
      type: 'button',
      text: 'View current offer',
      link: 'https://www.dbgate.io/review?utm_campaign=communityWidget',
    },
  ];
</script>

<WidgetsInnerContainer>
  <JsonUiContentRenderer blocks={data} />
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
