<script lang="ts">
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';
  import FormPasswordField from './forms/FormPasswordField.svelte';
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
  let token = null;

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    token = urlParams.get('token');
    
    if (!token) {
      error = 'Invalid reset link';
    }
  });
</script>

<SpecialPageLayout>
  <FormProviderCore {values}>
    <div class="heading">Set New Password</div>

    {#if success}
      <div class="success-message">
        Your password has been reset successfully! You can now log in with your new password.
      </div>
      <div class="back-link">
        <Link internalRedirect="/login.html" data-testid="ResetPasswordPage_backToLogin">
          Go to Login
        </Link>
      </div>
    {:else}
      <div class="text">
        Enter your new password below.
      </div>

      <FormPasswordField
        label="New Password"
        name="newPassword"
        autocomplete="new-password"
        saveOnInput
        data-testid="ResetPasswordPage_newPassword"
      />

      <FormPasswordField
        label="Confirm Password"
        name="confirmPassword"
        autocomplete="new-password"
        saveOnInput
        data-testid="ResetPasswordPage_confirmPassword"
      />

      {#if error}
        <ErrorInfo message={error} />
      {/if}

      <div class="submit">
        <FormSubmit
          value={isSubmitting ? 'Resetting...' : 'Reset Password'}
          disabled={isSubmitting || !token}
          on:click={async e => {
            error = null;
            
            if (!e.detail.newPassword || !e.detail.confirmPassword) {
              error = 'Please fill in all fields';
              return;
            }
            
            if (e.detail.newPassword !== e.detail.confirmPassword) {
              error = 'Passwords do not match';
              return;
            }
            
            if (e.detail.newPassword.length < 6) {
              error = 'Password must be at least 6 characters long';
              return;
            }
            
            isSubmitting = true;
            const resp = await apiCall('storage/reset-password', {
              token,
              newPassword: e.detail.newPassword,
            });
            isSubmitting = false;
            
            if (resp?.error) {
              error = resp.error;
              return;
            }
            
            success = true;
          }}
          data-testid="ResetPasswordPage_submit"
        />
      </div>

      <div class="back-link">
        <Link internalRedirect="/login.html" data-testid="ResetPasswordPage_backToLogin">
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
    color: var(--theme-font-1);
  }

  .back-link {
    margin: var(--dim-large-form-margin);
    text-align: center;
  }
</style>
