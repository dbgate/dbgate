<script lang="ts">
    import Link from "../elements/Link.svelte";
    import CheckboxField from "../forms/CheckboxField.svelte";
    import FormFieldTemplateLarge from "../forms/FormFieldTemplateLarge.svelte";
    import SelectField from "../forms/SelectField.svelte";
    import { currentEditorFontSize, currentEditorTheme, currentTheme, extensions, getSystemTheme, selectedWidget, visibleWidgetSideBar } from "../stores";
    import { _t } from "../translations";
    import ThemeSkeleton from "./ThemeSkeleton.svelte";
    import { EDITOR_THEMES, FONT_SIZES } from '../query/AceEditor.svelte';
    import { closeCurrentModal } from "../modals/modalTools";
    import TextField from "../forms/TextField.svelte";
    import FormTextField from "../forms/FormTextField.svelte";
    import SqlEditor from "../query/SqlEditor.svelte";

    function openThemePlugins() {
        closeCurrentModal();
        $selectedWidget = 'plugins';
        $visibleWidgetSideBar = true;
    }

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
</script>

<div class="wrapper">
  <div class="heading">{_t('settings.applicationTheme', { defaultMessage: 'Application theme' })}</div>

  <FormFieldTemplateLarge
  label={_t('settings.appearance.useSystemTheme', { defaultMessage: 'Use system theme' })}
  type="checkbox"
  labelProps={{
      onClick: () => {
      if ($currentTheme) {
          $currentTheme = null;
      } else {
          $currentTheme = getSystemTheme();
      }
      },
  }}
  >
  <CheckboxField
      checked={!$currentTheme}
      on:change={e => {
      if (e.target['checked']) {
          $currentTheme = null;
      } else {
          $currentTheme = getSystemTheme();
      }
      }}
  />
  </FormFieldTemplateLarge>

  <div class="themes">
  {#each $extensions.themes as theme}
      <ThemeSkeleton {theme} />
  {/each}
  </div>

  <div class="m-5">
  {_t('settings.appearance.moreThemes', { defaultMessage: 'More themes are available as' })}
  <Link onClick={openThemePlugins}>plugins</Link>
  <br />
  {_t('settings.appearance.afterInstalling', {
      defaultMessage:
      'After installing theme plugin (try search "theme" in available extensions) new themes will be available here.',
  })}
  </div>

  <div class="heading">{_t('settings.appearance.editorTheme', { defaultMessage: 'Editor theme' })}</div>

  <div class="flex">
  <div class="col-3">
      <FormFieldTemplateLarge
      label={_t('settings.appearance.editorTheme', { defaultMessage: 'Theme' })}
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
      <FormFieldTemplateLarge
      label={_t('settings.appearance.fontSize', { defaultMessage: 'Font size' })}
      type="combo"
      >
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
          disabled={!!FONT_SIZES.find(x => x.value == $currentEditorFontSize) &&
          $currentEditorFontSize != 'custom'}
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
</style>