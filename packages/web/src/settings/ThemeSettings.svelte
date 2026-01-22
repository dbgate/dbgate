<script lang="ts">
  import CheckboxField from '../forms/CheckboxField.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import {
    currentEditorFontSize,
    currentEditorTheme,
    rightPanelWidget,
  } from '../stores';
  import { _t } from '../translations';
  import ThemeSkeleton from './ThemeSkeleton.svelte';
  import { EDITOR_THEMES, FONT_SIZES } from '../query/AceEditor.svelte';
  import TextField from '../forms/TextField.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import { isProApp } from '../utility/proTools';
  import { currentThemeDefinition, getBuiltInTheme, getSystemThemeType, getBuiltInThemes, saveThemeToLocalFile } from '../plugins/themes';
  import { apiCall } from '../utility/api';
  import { showModal } from '../modals/modalTools';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { useFileThemes, usePublicCloudFiles } from '../utility/metadataLoaders';
  
    const sqlPreview = `-- example query
SELECT
  MAX(Album.AlbumId) AS max_album,
  MAX(Album.Title) AS max_title,
  Artist.ArtistId,
  'album' AS test_string,
  123 AS test_number
FROM
  Album
  INNER JOIN Artist ON Album.ArtistId = Artist.ArtistId
GROUP BY
  Artist.ArtistId
ORDER BY
  Artist.Name ASC
  `;

  function handleSaveTheme() {
    saveThemeToLocalFile();
  }

  const fileThemes = useFileThemes();
  const publicCloudFiles = usePublicCloudFiles();
  $: allThemes = [
    ...getBuiltInThemes(),
    ...($fileThemes || []),
    ...($publicCloudFiles || [])
      ?.filter(x => x.type == 'theme')
      ?.map(x => ({
        themeName: x.title,
        themePublicCloudPath: x.path,
        ...x.attributes,
      })),
  ];

  // $: console.log(
  //   'THEME CLOUD',
  //   ($publicCloudFiles || [])?.filter(x => x.type == 'theme')
  // );
</script>

<div class="wrapper">
  <div class="heading">{_t('settings.applicationTheme', { defaultMessage: 'Application theme' })}</div>

  <FormFieldTemplateLarge
    label={_t('settings.appearance.useSystemTheme', { defaultMessage: 'Use system theme' })}
    type="checkbox"
    labelProps={{
      onClick: () => {
        if ($currentThemeDefinition) {
          $currentThemeDefinition = null;
        } else {
          $currentThemeDefinition = getBuiltInTheme(getSystemThemeType());
        }
      },
    }}
  >
    <CheckboxField
      checked={!$currentThemeDefinition}
      on:change={e => {
        if (e.target['checked']) {
          $currentThemeDefinition = null;
        } else {
          $currentThemeDefinition = getBuiltInTheme(getSystemThemeType());
        }
      }}
    />
  </FormFieldTemplateLarge>

  <div class="themes" data-testid="ThemeSettings-themeList">
    {#each allThemes as theme}
      <ThemeSkeleton {theme} />
    {/each}
  </div>

  <div class="buttonline">
    <FormStyledButton
      skipWidth
      value={_t('theme.saveCurrentTheme', { defaultMessage: 'Save current theme' })}
      on:click={handleSaveTheme}
    />

    {#if isProApp()}
      <FormStyledButton
        skipWidth
        value={_t('theme.customizeWithAi', { defaultMessage: 'Customize with AI Assistant' })}
        on:click={() => {
          $rightPanelWidget = 'themeAiAssistant';
        }}
      />
    {/if}
  </div>

  <div class="heading">{_t('settings.appearance.editorTheme', { defaultMessage: 'Editor theme' })}</div>

  <div class="flex">
    <div class="col-3">
      <FormFieldTemplateLarge
        label={_t('settings.appearance.editorTheme', { defaultMessage: 'Editor theme' })}
        type="combo"
      >
        <SelectField
          isNative
          notSelected={_t('settings.appearance.editorTheme.default', { defaultMessage: '(use theme default)' })}
          options={EDITOR_THEMES.map(theme => ({ label: theme, value: theme }))}
          value={$currentEditorTheme}
          on:change={e => ($currentEditorTheme = e.detail)}
        />
      </FormFieldTemplateLarge>
    </div>

    <div class="col-3">
      <FormFieldTemplateLarge label={_t('settings.appearance.fontSize', { defaultMessage: 'Font size' })} type="combo">
        <SelectField
          isNative
          notSelected="(default)"
          options={FONT_SIZES}
          value={FONT_SIZES.find(x => x.value == $currentEditorFontSize) ? $currentEditorFontSize : 'custom'}
          on:change={e => ($currentEditorFontSize = e.detail)}
        />
      </FormFieldTemplateLarge>
    </div>

    <div class="col-3">
      <FormFieldTemplateLarge
        label={_t('settings.appearance.customSize', { defaultMessage: 'Custom size' })}
        type="text"
      >
        <TextField
          value={$currentEditorFontSize == 'custom' ? '' : $currentEditorFontSize}
          on:change={e => ($currentEditorFontSize = e.target['value'])}
          disabled={!!FONT_SIZES.find(x => x.value == $currentEditorFontSize) && $currentEditorFontSize != 'custom'}
        />
      </FormFieldTemplateLarge>
    </div>

    <div class="col-3">
      <FormTextField
        name="editor.fontFamily"
        label={_t('settings.appearance.fontFamily', { defaultMessage: 'Editor font family' })}
      />
    </div>
  </div>

  <div class="editor">
    <SqlEditor value={sqlPreview} readOnly />
  </div>
</div>

<style>
  .buttonline {
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
  }

  .heading {
    font-size: 20px;
    margin: 5px;
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
  }

  .themes {
    display: flex;
    flex-wrap: wrap;
    margin-left: var(--dim-large-form-margin);
  }

  .editor {
    position: relative;
    height: 250px;
    width: 400px;
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
    margin-bottom: var(--dim-large-form-margin);
  }

  .ai-assistant-panel {
    flex: 1;
    display: flex;
    background-color: var(--theme-altsidebar-background);
    border-left: var(--theme-altsidebar-border);
  }
</style>
