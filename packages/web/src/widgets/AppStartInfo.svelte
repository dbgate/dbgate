<script lang="ts">
  export let message;

  const isDark =
    localStorage.getItem('currentThemeType') === 'dark' ||
    (!localStorage.getItem('currentThemeType') &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
</script>

<div class="starting-dbgate" class:isDark>
  <div class="inner-flex">
    <div class="lds-ellipsis">
      <div />
      <div />
      <div />
      <div />
    </div>
    <div>{message}</div>
  </div>
</div>

<style>
  @media (prefers-color-scheme: dark) {
    .starting-dbgate {
      background-color: #111;
      color: #e3e3e3;
    }
  }
  .lds-ellipsis {
    display: inline-block;
    position: relative;
    width: 80px;
    height: 80px;
  }
  .isDark {
    background-color: #111;
    color: #e3e3e3;
  }
  .lds-ellipsis div {
    position: absolute;
    top: 33px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #262626;
    animation-timing-function: cubic-bezier(0, 1, 1, 0);
  }
  .isDark .lds-ellipsis div {
    background: #e3e3e3;
  }
  .lds-ellipsis div:nth-child(1) {
    left: 8px;
    animation: lds-ellipsis1 0.6s infinite;
  }
  .lds-ellipsis div:nth-child(2) {
    left: 8px;
    animation: lds-ellipsis2 0.6s infinite;
  }
  .lds-ellipsis div:nth-child(3) {
    left: 32px;
    animation: lds-ellipsis2 0.6s infinite;
  }
  .lds-ellipsis div:nth-child(4) {
    left: 56px;
    animation: lds-ellipsis3 0.6s infinite;
  }
  @keyframes lds-ellipsis1 {
    0% {
      transform: scale(0);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes lds-ellipsis3 {
    0% {
      transform: scale(1);
    }
    100% {
      transform: scale(0);
    }
  }
  @keyframes lds-ellipsis2 {
    0% {
      transform: translate(0, 0);
    }
    100% {
      transform: translate(24px, 0);
    }
  }

  .starting-dbgate {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-around;
  }

  .inner-flex {
    display: flex;
    align-items: center;
    flex-direction: column;
  }
</style>
