<!-- Chatbot “thinking” indicator -->
<div class="typing-indicator" aria-label="Chatbot is thinking">
  <span></span><span></span><span></span>
</div>

<style>
  /* Container keeps the dots neatly aligned */
  .typing-indicator {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    justify-content: center;
    /* Optional tweaks */
    height: 1.25rem; /* keeps layout height consistent */
  }

  /* Each dot */
  .typing-indicator span {
    width: 0.5rem;
    height: 0.5rem;
    background: currentColor; /* inherits text color */
    border-radius: 50%;
    opacity: 0.2; /* start slightly faded */
    animation: pulse 1s infinite ease-in-out;
  }

  /* Delay each dot so they animate sequentially */
  .typing-indicator span:nth-child(1) {
    animation-delay: 0s;
  }
  .typing-indicator span:nth-child(2) {
    animation-delay: 0.15s;
  }
  .typing-indicator span:nth-child(3) {
    animation-delay: 0.3s;
  }

  /* Keyframes for the pulsing effect */
  @keyframes pulse {
    0%,
    80%,
    100% {
      opacity: 0.2;
      transform: translateY(0);
    }
    40% {
      opacity: 1;
      transform: translateY(-0.2rem);
    }
  }
</style>
