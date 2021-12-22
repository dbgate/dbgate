<script lang="ts">
  import _ from 'lodash';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import { apiOff, apiOn } from '../utility/api';
  import createRef from '../utility/createRef';

  import useEffect from '../utility/useEffect';

  import MessageView from './MessageView.svelte';

  export let showProcedure = false;
  export let showLine = false;
  export let eventName;
  export let executeNumber;
  export let showNoMessagesAlert = false;

  const cachedMessagesRef = createRef([]);

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

  $: $effect;
</script>

{#if showNoMessagesAlert && (!displayedMessages || displayedMessages.length == 0)}
  <ErrorInfo message="No messages" icon="img alert" />
{:else}
  <MessageView items={displayedMessages} on:messageclick {showProcedure} {showLine} />
{/if}
