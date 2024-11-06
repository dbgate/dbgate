<script lang="ts">
  import _ from 'lodash';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import { apiOff, apiOn } from '../utility/api';
  import createRef from '../utility/createRef';

  import useEffect from '../utility/useEffect';

  import MessageView from './MessageView.svelte';

  export let showProcedure = false;
  export let showLine = false;
  export let showCaller = false;
  export let eventName;
  export let executeNumber;
  export let showNoMessagesAlert = false;
  export let startLine = 0;
  export let onChangeErrors = null;
  export let onMessageClick = null;

  const cachedMessagesRef = createRef([]);
  const lastErrorMessageCountRef = createRef(0);

  let displayedMessages = [];

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

  $: {
    if (executeNumber >= 0) {
      displayedMessages = [];
      cachedMessagesRef.set([]);
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
  <ErrorInfo message="No messages" icon="img alert" />
{:else}
  <MessageView items={displayedMessages} {onMessageClick} {showProcedure} {showLine} {showCaller} {startLine} />
{/if}
