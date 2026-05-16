<script lang="ts">
  import _ from 'lodash';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import { apiOff, apiOn, apiCall } from '../utility/api';
  import createRef from '../utility/createRef';
  import { _t } from '../translations';

  import useEffect from '../utility/useEffect';

  import MessageView from './MessageView.svelte';
  import { useSettings } from '../utility/metadataLoaders';

  export let showProcedure = false;
  export let showLine = false;
  export let showCaller = false;
  export let eventName;
  export let executeNumber = null;
  export let showNoMessagesAlert = false;
  export let startLine = 0;
  export let onChangeErrors = null;
  export let onMessageClick = null;
  export let onExplainError = null;
  export let engine = null;

  const settings = useSettings();

  const cachedMessagesRef = createRef([]);
  const lastErrorMessageCountRef = createRef(0);
  const preserveLogsRef = createRef(false);

  let preserveLogs = $settings?.['sqlEditor.preserveLogs'] ?? false;
  let _preserveLogsSyncValue = preserveLogs;
  let displayedMessages = [];

  $: preserveLogsRef.set(preserveLogs);

  // Settings tab → local: update checkbox when settings change externally
  $: {
    const settingsValue = $settings?.['sqlEditor.preserveLogs'] ?? false;
    if (settingsValue !== _preserveLogsSyncValue) {
      _preserveLogsSyncValue = settingsValue;
      preserveLogs = settingsValue;
    }
  }

  // Local → settings: persist checkbox change to settings
  $: {
    if (preserveLogs !== _preserveLogsSyncValue) {
      _preserveLogsSyncValue = preserveLogs;
      apiCall('config/update-settings', { 'sqlEditor.preserveLogs': preserveLogs });
    }
  }

  const displayCachedMessages = _.throttle(() => {
    displayedMessages = [...cachedMessagesRef.get()];
  }, 500);

  const handleInfo = info => {
    cachedMessagesRef.get().push(info);
    displayCachedMessages();
  };

  $: effect = useEffect(() => {
    if (eventName) {
      apiOn(eventName, handleInfo);
      return () => {
        apiOff(eventName, handleInfo);
      };
    }
    return () => {};
  });

  function handleClearMessages() {
    cachedMessagesRef.set([]);
    displayedMessages = [];
  }

  $: {
    if (executeNumber >= 0) {
      if (!preserveLogsRef.get()) {
        displayedMessages = [];
        cachedMessagesRef.set([]);
      }
    }
  }

  $: {
    if (onChangeErrors) {
      const errors = displayedMessages.filter(x => x.severity == 'error' && x.line != null);
      if (lastErrorMessageCountRef.get() != errors.length) {
        onChangeErrors(
          errors.map(err => ({
            ...err,
            line: err.line == null ? null : err.line + startLine,
          }))
        );
        lastErrorMessageCountRef.set(errors.length);
      }
    }
  }

  $: $effect;
</script>

{#if showNoMessagesAlert && (!displayedMessages || displayedMessages.length == 0)}
  <ErrorInfo message={_t('message.NoMessages', { defaultMessage: 'No messages' })} icon="img alert" />
{:else}
  <MessageView
    items={displayedMessages}
    {onMessageClick}
    {showProcedure}
    {showLine}
    {showCaller}
    {startLine}
    {onExplainError}
    {engine}
    bind:preserveLogs
    onClear={executeNumber == null ? handleClearMessages : null}
  />
{/if}
