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
  import { closeCurrentModal, showModal } from '../modals/modalTools';
  import { EDITOR_KEYBINDINGS_MODES, EDITOR_THEMES, FONT_SIZES } from '../query/AceEditor.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import {
    currentEditorFontSize,
    currentEditorWrapEnabled,
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
  import { isProApp } from '../utility/proTools';
  import FormTextAreaField from '../forms/FormTextAreaField.svelte';
  import { apiCall } from '../utility/api';
  import { useSettings } from '../utility/metadataLoaders';
  import { derived } from 'svelte/store';
  import { safeFormatDate } from 'dbgate-tools';
  import FormDefaultActionField from './FormDefaultActionField.svelte';
  import { _t, getSelectedLanguage } from '../translations';
  import { internalRedirectTo } from '../clientAuth';
  import ConfirmModal from '../modals/ConfirmModal.svelte';

  const electron = getElectron();
  let restartWarning = false;
  let licenseKeyCheckResult = null;

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

  const settings = useSettings();
  const settingsValues = derived(settings, $settings => {
    if (!$settings) {
      return {};
    }
    return $settings;
  });

  $: licenseKey = $settingsValues['other.licenseKey'];
  let checkedLicenseKey = false;
  $: if (licenseKey && !checkedLicenseKey) {
    checkedLicenseKey = true;
    apiCall('config/check-license', { licenseKey }).then(result => {
      licenseKeyCheckResult = result;
    });
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
          isProApp() && electron && { label: 'License', slot: 7 },
          { label: 'Connection', slot: 2 },
          { label: 'Themes', slot: 3 },
          { label: 'Default Actions', slot: 4 },
          { label: 'Behaviour', slot: 5 },
          { label: 'External tools', slot: 8 },
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

          <FormCheckboxField
            name="tabGroup.showServerName"
            label="Show server name alongside database name in title of the tab group"
            defaultValue={false}
          />
          <!-- <div class="heading">{_t('settings.localization', { defaultMessage: 'Localization' })}</div>
          <FormSelectField
            label="Language"
            name="localization.language"
            defaultValue={getSelectedLanguage()}
            isNative
            options={[
              { value: 'en', label: 'English' },
              { value: 'cs', label: 'Czech' },
            ]}
            on:change={() => {
              showModal(ConfirmModal, {
                message: 'Application will be reloaded to apply new language settings',
                onConfirm: () => {
                  setTimeout(() => {
                    internalRedirectTo('/');
                  }, 100);
                },
              });
            }}
          /> -->

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

          <FormCheckboxField name="dataGrid.alignNumbersRight" label="Align numbers to right" defaultValue={false} />

          <FormTextField
            name="dataGrid.collectionPageSize"
            label="Collection page size (for MongoDB JSON view, must be between 5 and 1000)"
            defaultValue="50"
          />

          <FormSelectField
            label="Row coloring mode"
            name="dataGrid.coloringMode"
            isNative
            defaultValue="36"
            options={[
              { value: '36', label: 'Every 3rd and 6th row' },
              { value: '2-primary', label: 'Every 2-nd row, primary color' },
              { value: '2-secondary', label: 'Every 2-nd row, secondary color' },
              { value: 'none', label: 'None' },
            ]}
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
            <div class="col-3">
              <FormFieldTemplateLarge label="Enable word wrap" type="combo">
                <CheckboxField
                  checked={$currentEditorWrapEnabled}
                  on:change={e => ($currentEditorWrapEnabled = e.target.checked)}
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
          <FormSelectField
            label="Local host address for SSH connections"
            name="connection.sshBindHost"
            isNative
            defaultValue="127.0.0.1"
            options={[
              { value: '127.0.0.1', label: '127.0.0.1 (IPv4)' },
              { value: '::1', label: '::1  (IPv6)' },
              { value: 'localhost', label: 'localhost (domain name)' },
            ]}
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
              { value: 'none', label: 'Do nothing' },
            ]}
          />

          <FormSelectField
            label="Database click"
            name="defaultAction.databaseClick"
            isNative
            defaultValue="switch"
            options={[
              { value: 'switch', label: 'Switch database' },
              { value: 'none', label: 'Do nothing' },
            ]}
          />

          <FormCheckboxField name="defaultAction.useLastUsedAction" label="Use last used action" defaultValue={true} />

          <FormDefaultActionField
            label="Table click"
            objectTypeField="tables"
            disabled={values['defaultAction.useLastUsedAction'] !== false}
          />
          <FormDefaultActionField
            label="View click"
            objectTypeField="views"
            disabled={values['defaultAction.useLastUsedAction'] !== false}
          />
          <FormDefaultActionField
            label="Materialized view click"
            objectTypeField="matviews"
            disabled={values['defaultAction.useLastUsedAction'] !== false}
          />
          <FormDefaultActionField
            label="Procedure click"
            objectTypeField="procedures"
            disabled={values['defaultAction.useLastUsedAction'] !== false}
          />
          <FormDefaultActionField
            label="Function click"
            objectTypeField="functions"
            disabled={values['defaultAction.useLastUsedAction'] !== false}
          />
          <FormDefaultActionField
            label="NoSQL collection click"
            objectTypeField="collections"
            disabled={values['defaultAction.useLastUsedAction'] !== false}
          />
        </svelte:fragment>
        <svelte:fragment slot="5">
          <div class="heading">Behaviour</div>

          <FormCheckboxField name="behaviour.useTabPreviewMode" label="Use tab preview mode" defaultValue={true} />

          <div class="tip">
            <FontIcon icon="img tip" /> When you single-click or select a file in the "Tables, Views, Functions" view, it
            is shown in a preview mode and reuses an existing tab (preview tab). This is useful if you are quickly browsing
            tables and don't want every visited table to have its own tab. When you start editing the table or use double-click
            to open the table from the "Tables" view, a new tab is dedicated to that table.
          </div>

          <FormCheckboxField
            name="behaviour.openDetailOnArrows"
            label="Open detail on keyboard navigation"
            defaultValue={true}
            disabled={values['behaviour.useTabPreviewMode'] === false}
          />

          <div class="heading">Confirmations</div>

          <FormCheckboxField name="skipConfirm.tableDataSave" label="Skip confirmation when saving table data (SQL)" />
          <FormCheckboxField
            name="skipConfirm.collectionDataSave"
            label="Skip confirmation when saving collection data (NoSQL)"
          />
        </svelte:fragment>
        <svelte:fragment slot="6">
          <div class="heading">Other</div>

          <FormTextField name="other.gistCreateToken" label="API token for creating error gists" defaultValue="" />

          <FormSelectField
            label="Auto update application"
            name="app.autoUpdateMode"
            isNative
            defaultValue=""
            options={[
              { value: 'skip', label: 'Do not check for new versions' },
              { value: '', label: 'Check for new versions' },
              { value: 'download', label: 'Check and download new versions' },
            ]}
          />

          {#if isProApp()}
            <FormCheckboxField
              name="ai.allowSendModels"
              label="Allow to send DB models and query snippets to AI service"
              defaultValue={false}
            />
          {/if}
        </svelte:fragment>

        <svelte:fragment slot="7">
          <div class="heading">License</div>
          <FormTextAreaField
            name="other.licenseKey"
            label="License key"
            rows={7}
            onChange={async value => {
              licenseKeyCheckResult = await apiCall('config/check-license', { licenseKey: value });
            }}
          />
          {#if licenseKeyCheckResult}
            <div class="m-3 ml-5">
              {#if licenseKeyCheckResult.status == 'ok'}
                <div>
                  <FontIcon icon="img ok" /> License key is valid
                </div>
                {#if licenseKeyCheckResult.validTo}
                  <div>
                    License valid to: {licenseKeyCheckResult.validTo}
                  </div>
                {/if}
                {#if licenseKeyCheckResult.expiration}
                  <div>License key expiration: <b>{safeFormatDate(licenseKeyCheckResult.expiration)}</b></div>
                {/if}
              {:else if licenseKeyCheckResult.status == 'error'}
                <FontIcon icon="img error" /> License key is invalid
              {/if}
            </div>
          {/if}
        </svelte:fragment>

        <svelte:fragment slot="8">
          <div class="heading">External tools</div>
          <FormTextField
            name="externalTools.mysqldump"
            label="mysqldump (backup MySQL database)"
            defaultValue="mysqldump"
          />
          <FormTextField name="externalTools.mysql" label="mysql (restore MySQL database)" defaultValue="mysql" />
          <FormTextField
            name="externalTools.mysqlPlugins"
            label="Folder with mysql plugins (for example for authentication). Set only in case of problems"
            defaultValue=""
          />
         <FormTextField
            name="externalTools.pg_dump"
            label="pg_dump (backup PostgreSQL database)"
            defaultValue="pg_dump"
          />
          <FormTextField
            name="externalTools.psql"
            label="psql (restore PostgreSQL database)"
            defaultValue="psql"
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

  .tip {
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
