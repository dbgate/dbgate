<script lang="ts">
  import _ from 'lodash';
  import ErrorInfo from '../elements/ErrorInfo.svelte';

  import socket from '../utility/socket';

  import useEffect from '../utility/useEffect';

  import MessageView from './MessageView.svelte';

  export let showProcedure = false;
  export let showLine = false;
  export let eventName;
  export let executeNumber;

  const cachedMessagesRef = { current: [] };

  let displayedMessages = [];

  const displayCachedMessages = _.throttle(() => {
    console.log('THROTTLE', cachedMessagesRef.current);
    displayedMessages = [...cachedMessagesRef.current];
  }, 500);

  const handleInfo = info => {
    console.log('ACCEPTED', info);
    cachedMessagesRef.current.push(info);
    displayCachedMessages();
  };

  $: effect = useEffect(() => {
    if (eventName) {
      socket.on(eventName, handleInfo);
      return () => {
        socket.off(eventName, handleInfo);
      };
    }
    return () => {};
  });

  $: {
    if (executeNumber >= 0) {
      console.log('CLEAR');
      displayedMessages = [];
      cachedMessagesRef.current = [];
    }
  }

  $: $effect;

  $: console.log('displayedMessages', displayedMessages);
</script>

{#if !displayedMessages || displayedMessages.length == 0}
  <ErrorInfo message="No messages" icon="img alert" />
{:else}
  <MessageView items={displayedMessages} on:messageclick {showProcedure} {showLine} />
{/if}
