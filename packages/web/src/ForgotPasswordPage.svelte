<script lang="ts">
  import { writable } from 'svelte/store';
  import FormTextField from './forms/FormTextField.svelte';
  import FormSubmit from './forms/FormSubmit.svelte';
  import SpecialPageLayout from './widgets/SpecialPageLayout.svelte';
  import FormProviderCore from './forms/FormProviderCore.svelte';
  import { apiCall } from './utility/api';
  import ErrorInfo from './elements/ErrorInfo.svelte';
  import Link from './elements/Link.svelte';

  const values = writable({});

  let error = null;
  let success = false;
  let isSubmitting = false;
</script>

<SpecialPageLayout>
  <FormProviderCore {values}>
    <div class="heading">Reset Password</div>

    {#if success}
      <div class="success-message">
        If an account with that email exists, we've sent a password reset link to your email address. Please check your
        inbox and follow the instructions.
      </div>
      <div class="back-link">
        <Link internalRedirect="/login.html" data-testid="ForgotPasswordPage_backToLogin">
          Back to Login
        </Link>
      </div>
    {:else}
      <div class="text">
        Enter your email address and we'll send you a link to reset your password.
      </div>

      <FormTextField
        label="Email"
        name="email"
        type="email"
        autocomplete="email"
        saveOnInput
        data-testid="ForgotPasswordPage_email"
      />

      {#if error}
        <ErrorInfo message={error} />
      {/if}

      <div class="submit">
        <FormSubmit
          value={isSubmitting ? 'Sending...' : 'Send Reset Link'}
          disabled={isSubmitting}
          on:click={async e => {
            error = null;
            isSubmitting = true;
            const resp = await apiCall('storage/request-password-reset', e.detail);
            isSubmitting = false;
            if (resp?.error) {
              error = resp.error;
              return;
            }
            success = true;
          }}
          data-testid="ForgotPasswordPage_submit"
        />
      </div>

      <div class="back-link">
        <Link internalRedirect="/login.html" data-testid="ForgotPasswordPage_backToLogin">
          Back to Login
        </Link>
      </div>
    {/if}
  </FormProviderCore>
</SpecialPageLayout>

<style>
  .heading {
    text-align: center;
    margin: 1em;
    font-size: xx-large;
  }

  .submit {
    margin: var(--dim-large-form-margin);
    display: flex;
  }

  .submit :global(input) {
    flex: 1;
    font-size: larger;
  }

  .submit :global(input:disabled) {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .text {
    margin-left: var(--dim-large-form-margin);
    margin-right: var(--dim-large-form-margin);
    margin-bottom: var(--dim-large-form-margin);
  }

  .success-message {
    margin: var(--dim-large-form-margin);
    padding: 15px;
    background-color: var(--theme-bg-green);
    border: 1px solid var(--theme-border);
    border-radius: 4px;
    color: var(--theme-generic-font);
  }

  .back-link {
    margin: var(--dim-large-form-margin);
    text-align: center;
  }
</style>
