<script lang="ts">
  import _ from 'lodash';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import Link from '../elements/Link.svelte';
  import TabControl from '../elements/TabControl.svelte';
  import CheckboxField from '../forms/CheckboxField.svelte';

  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import FormValues from '../forms/FormValues.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import SettingsFormProvider from '../forms/SettingsFormProvider.svelte';
  import TextField from '../forms/TextField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  import ModalBase from '../modals/ModalBase.svelte';
  import { closeCurrentModal } from '../modals/modalTools';
  import { EDITOR_KEYBINDINGS_MODES, EDITOR_THEMES, FONT_SIZES } from '../query/AceEditor.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import {
    currentEditorFontSize,
    currentEditorTheme,
    currentEditorKeybindigMode,
    extensions,
    selectedWidget,
    lockedDatabaseMode,
    visibleWidgetSideBar,
  } from '../stores';
  import { isMac } from '../utility/common';
  import getElectron from '../utility/getElectron';
  import ThemeSkeleton from './ThemeSkeleton.svelte';

  const electron = getElectron();
  let restartWarning = false;

  export let selectedTab = 0;

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

  function openThemePlugins() {
    closeCurrentModal();
    $selectedWidget = 'plugins';
    $visibleWidgetSideBar = true;
  }
</script>

<SettingsFormProvider>
  <ModalBase {...$$restProps} noPadding>
    <div slot="header">Settings</div>

    <FormValues let:values>
      <TabControl
        bind:value={selectedTab}
        isInline
        tabs={[
          { label: 'General', slot: 1 },
          { label: 'Connection', slot: 2 },
          { label: 'Themes', slot: 3 },
          { label: 'Default Actions', slot: 4 },
          { label: 'Confirmations', slot: 5 },
          { label: 'Other', slot: 6 },
        ]}
      >
        <svelte:fragment slot="1">
          {#if electron}
            <div class="heading">Appearance</div>
            <FormCheckboxField
              name="app.useNativeMenu"
              label={isMac() ? 'Use native window title' : 'Use system native menu'}
              on:change={() => {
                restartWarning = true;
              }}
            />
            {#if restartWarning}
              <div class="ml-5 mb-3">
                <FontIcon icon="img warn" /> Native menu settings will be applied after app restart
              </div>
            {/if}
          {/if}

          <div class="heading">Data grid</div>
          <FormTextField
            name="dataGrid.pageSize"
            label="Page size (number of rows for incremental loading, must be between 5 and 1000)"
            defaultValue="100"
          />
          <FormCheckboxField name="dataGrid.showHintColumns" label="Show foreign key hints" defaultValue={true} />
          <!-- <FormCheckboxField name="dataGrid.showHintColumns" label="Show foreign key hints" defaultValue={true} /> -->

          <FormCheckboxField name="dataGrid.thousandsSeparator" label="Use thousands separator for numbers" />

          <FormTextField
            name="dataGrid.defaultAutoRefreshInterval"
            label="Default grid auto refresh interval in seconds"
            defaultValue="10"
          />

          <div class="heading">SQL editor</div>

          <div class="flex">
            <div class="col-3">
              <FormSelectField
                label="SQL commands case"
                name="sqlEditor.sqlCommandsCase"
                isNative
                defaultValue="upperCase"
                options={[
                  { value: 'upperCase', label: 'UPPER CASE' },
                  { value: 'lowerCase', label: 'lower case' },
                ]}
              />
            </div>
            <div class="col-3">
              <FormFieldTemplateLarge label="Editor keybinds" type="combo">
                <SelectField
                  isNative
                  defaultValue="default"
                  options={EDITOR_KEYBINDINGS_MODES.map(mode => ({ label: mode.label, value: mode.value }))}
                  value={$currentEditorKeybindigMode}
                  on:change={e => ($currentEditorKeybindigMode = e.detail)}
                />
              </FormFieldTemplateLarge>
            </div>
          </div>
        </svelte:fragment>
        <svelte:fragment slot="2">
          <div class="heading">Connection</div>

          <FormFieldTemplateLarge
            label="Show only tabs from selected database"
            type="checkbox"
            labelProps={{
              onClick: () => {
                $lockedDatabaseMode = !$lockedDatabaseMode;
              },
            }}
          >
            <CheckboxField checked={$lockedDatabaseMode} on:change={e => ($lockedDatabaseMode = e.target.checked)} />
          </FormFieldTemplateLarge>

          <FormCheckboxField
            name="connection.autoRefresh"
            label="Automatic refresh of database model on background"
            defaultValue={false}
          />
          <FormTextField
            name="connection.autoRefreshInterval"
            label="Interval between automatic DB structure reloads in seconds"
            defaultValue="30"
            disabled={values['connection.autoRefresh'] === false}
          />

          <div class="heading">Query sessions</div>
          <FormCheckboxField
            name="session.autoClose"
            label="Automatic close query sessions after period without any activity"
            defaultValue={true}
          />
          <FormTextField
            name="session.autoCloseTimeout"
            label="Interval, after which query session without activity is closed (in minutes)"
            defaultValue="15"
            disabled={values['session.autoClose'] === false}
          />
        </svelte:fragment>

        <svelte:fragment slot="3">
          <div class="heading">Application theme</div>
          <div class="themes">
            {#each $extensions.themes as theme}
              <ThemeSkeleton {theme} />
            {/each}
          </div>

          <div class="m-5">
            More themes are available as <Link onClick={openThemePlugins}>plugins</Link>
            <br />
            After installing theme plugin (try search "theme" in available extensions) new themes will be available here.
          </div>

          <div class="heading">Editor theme</div>

          <div class="flex">
            <div class="col-3">
              <FormFieldTemplateLarge label="Theme" type="combo">
                <SelectField
                  isNative
                  notSelected="(use theme default)"
                  options={EDITOR_THEMES.map(theme => ({ label: theme, value: theme }))}
                  value={$currentEditorTheme}
                  on:change={e => ($currentEditorTheme = e.detail)}
                />
              </FormFieldTemplateLarge>
            </div>

            <div class="col-3">
              <FormFieldTemplateLarge label="Font size " type="combo">
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
              <FormFieldTemplateLarge label="Custom size " type="text">
                <TextField
                  value={$currentEditorFontSize == 'custom' ? '' : $currentEditorFontSize}
                  on:change={e => ($currentEditorFontSize = e.target['value'])}
                  disabled={!!FONT_SIZES.find(x => x.value == $currentEditorFontSize) &&
                    $currentEditorFontSize != 'custom'}
                />
              </FormFieldTemplateLarge>
            </div>

            <div class="col-3">
              <FormTextField name="editor.fontFamily" label="Editor font family" />
            </div>
          </div>

          <div class="editor">
            <SqlEditor value={sqlPreview} readOnly />
          </div>
        </svelte:fragment>
        <svelte:fragment slot="4">
          <div class="heading">Default actions</div>
          <FormSelectField
            label="Connection click"
            name="defaultAction.connectionClick"
            isNative
            defaultValue="connect"
            options={[
              { value: 'openDetails', label: 'Edit / open details' },
              { value: 'connect', label: 'Connect' },
            ]}
          />

          <FormSelectField
            label="Table click"
            name="defaultAction.dbObjectClick.tables"
            isNative
            defaultValue=""
            options={[
              { value: '', label: 'Open data, or open existing' },
              { value: 'Open data', label: 'Open data (always new tab)' },
              { value: 'Open form', label: 'Open form (always new tab)' },
              { value: 'Open structure', label: 'Open structure' },
              { value: 'SQL: CREATE TABLE', label: 'SQL: CREATE' },
              { value: 'SQL: SELECT', label: 'SQL: SELECT' },
            ]}
          />

          <FormSelectField
            label="View click"
            name="defaultAction.dbObjectClick.views"
            isNative
            defaultValue=""
            options={[
              { value: '', label: 'Open data, or open existing' },
              { value: 'Open data', label: 'Open data (always new tab)' },
              { value: 'SQL: CREATE VIEW', label: 'SQL: CREATE' },
            ]}
          />

          <FormSelectField
            label="Materialized view click"
            name="defaultAction.dbObjectClick.matviews"
            isNative
            defaultValue=""
            options={[
              { value: '', label: 'Open data, or open existing' },
              { value: 'Open data', label: 'Open data (always new tab)' },
              { value: 'SQL: CREATE MATERIALIZED VIEW', label: 'SQL: CREATE' },
            ]}
          />

          <FormSelectField
            label="Procedure click"
            name="defaultAction.dbObjectClick.procedures"
            isNative
            defaultValue=""
            options={[
              { value: '', label: 'SQL: CREATE' },
              { value: 'SQL: EXECUTE', label: 'SQL: EXECUTE' },
              // { value: 'SQL: CREATE PROCEDURE', label: 'SQL: CREATE' },
            ]}
          />
        </svelte:fragment>
        <svelte:fragment slot="5">
          <div class="heading">Confirmations</div>

          <FormCheckboxField name="skipConfirm.tableDataSave" label="Skip confirmation when saving table data (SQL)" />
          <FormCheckboxField
            name="skipConfirm.collectionDataSave"
            label="Skip confirmation when saving collection data (NoSQL)"
          />
        </svelte:fragment>
        <svelte:fragment slot="6">
          <div class="heading">Other</div>

          <FormTextField
            name="other.gistCreateToken"
            label="API token for creating error gists"
            defaultValue=""
          />
        </svelte:fragment>
      </TabControl>
    </FormValues>

    <div slot="footer">
      <!-- <FormSubmit value="OK" on:click={handleOk} /> -->
      <FormStyledButton value="Close" on:click={closeCurrentModal} />
    </div>
  </ModalBase>
</SettingsFormProvider>

<style>
  .heading {
    font-size: 20px;
    margin: 5px;
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
  }

  .themes {
    overflow-x: scroll;
    display: flex;
  }

  .editor {
    position: relative;
    height: 200px;
    width: 400px;
    margin-left: var(--dim-large-form-margin);
  }
</style>
