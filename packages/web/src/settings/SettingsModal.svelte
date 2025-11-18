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
    currentEditorWrapEnabled,
    currentEditorTheme,
    currentEditorKeybindigMode,
    extensions,
    selectedWidget,
    lockedDatabaseMode,
    visibleWidgetSideBar,
    currentTheme,
    getSystemTheme,
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
  import AiSettingsTab from './AiSettingsTab.svelte';
  import { _t } from '../translations';
  import hasPermission from '../utility/hasPermission';
  import ConfirmModal from '../modals/ConfirmModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { internalRedirectTo } from '../clientAuth';
  import { getSelectedLanguage } from '../translations';

  const electron = getElectron();
  let restartWarning = false;
  let licenseKeyCheckResult = null;

  export let selectedTab = 'general';

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
  <ModalBase {...$$restProps} noPadding fixedHeight>
    <div slot="header">{_t('settings.title', { defaultMessage: 'Settings' })}</div>

    <FormValues let:values>
      <TabControl
        bind:value={selectedTab}
        isInline
        inlineTabs
        scrollableContentContainer
        containerMaxWidth="100%"
        containerMaxHeight="calc(100% - 34px)"
        maxHeight100
        flex1
        tabs={[
          hasPermission('settings/change') && {
            identifier: 'general',
            label: _t('settings.general', { defaultMessage: 'General' }),
            slot: 1,
          },
          isProApp() &&
            electron && {
              identifier: 'license',
              label: _t('settings.license', { defaultMessage: 'License' }),
              slot: 7,
            },
          hasPermission('settings/change') && {
            identifier: 'connection',
            label: _t('settings.connection', { defaultMessage: 'Connection' }),
            slot: 2,
          },
          { identifier: 'theme', label: _t('settings.theme', { defaultMessage: 'Themes' }), slot: 3 },
          hasPermission('settings/change') && {
            identifier: 'default-actions',
            label: _t('settings.defaultActions', { defaultMessage: 'Default Actions' }),
            slot: 4,
          },
          hasPermission('settings/change') && {
            identifier: 'behaviour',
            label: _t('settings.behaviour', { defaultMessage: 'Behaviour' }),
            slot: 5,
          },
          hasPermission('settings/change') && {
            identifier: 'external-tools',
            label: _t('settings.externalTools', { defaultMessage: 'External tools' }),
            slot: 8,
          },
          hasPermission('settings/change') && {
            identifier: 'other',
            label: _t('settings.other', { defaultMessage: 'Other' }),
            slot: 6,
          },
          isProApp() && hasPermission('settings/change') && { identifier: 'ai', label: 'AI', slot: 9 },
        ]}
      >
        <svelte:fragment slot="1">
          {#if electron}
            <div class="heading">{_t('settings.appearance', { defaultMessage: 'Appearance' })}</div>
            <FormCheckboxField
              name="app.useNativeMenu"
              label={isMac()
                ? _t('settings.useNativeWindowTitle', { defaultMessage: 'Use native window title' })
                : _t('settings.useSystemNativeMenu', { defaultMessage: 'Use system native menu' })}
              on:change={() => {
                restartWarning = true;
              }}
            />
            {#if restartWarning}
              <div class="ml-5 mb-3">
                <FontIcon icon="img warn" />
                {_t('settings.nativeMenuRestartWarning', {
                  defaultMessage: 'Native menu settings will be applied after app restart',
                })}
              </div>
            {/if}
          {/if}

          <FormCheckboxField
            name="tabGroup.showServerName"
            label={_t('settings.tabGroup.showServerName', {
              defaultMessage: 'Show server name alongside database name in title of the tab group',
            })}
            defaultValue={false}
          />
          <div class="heading">{_t('settings.localization', { defaultMessage: 'Localization' })}</div>
          <FormSelectField
            label={_t('settings.localization.language', { defaultMessage: 'Language' })}
            name="localization.language"
            defaultValue={getSelectedLanguage()}
            isNative
            options={[
              { value: 'en', label: 'English' },
              { value: 'cs', label: 'Čeština' },
              { value: 'sk', label: 'Slovenčina' },
              { value: 'de', label: 'Deutsch' },
              { value: 'fr', label: 'Français' },
            ]}
            on:change={() => {
              showModal(ConfirmModal, {
                message: _t('settings.localization.reloadWarning', {
                  defaultMessage: 'Application will be reloaded to apply new language settings',
                }),
                onConfirm: () => {
                  setTimeout(() => {
                    internalRedirectTo(electron ? '/index.html' : '/');
                  }, 100);
                },
              });
            }}
          />

          <div class="heading">{_t('settings.dataGrid.title', { defaultMessage: 'Data grid' })}</div>
          <FormTextField
            name="dataGrid.pageSize"
            label={_t('settings.dataGrid.pageSize', {
              defaultMessage: 'Page size (number of rows for incremental loading, must be between 5 and 50000)',
            })}
            defaultValue="100"
          />
          <FormCheckboxField
            name="dataGrid.showHintColumns"
            label={_t('settings.dataGrid.showHintColumns', { defaultMessage: 'Show foreign key hints' })}
            defaultValue={true}
          />
          <!-- <FormCheckboxField name="dataGrid.showHintColumns" label="Show foreign key hints" defaultValue={true} /> -->

          <FormCheckboxField
            name="dataGrid.thousandsSeparator"
            label={_t('settings.dataGrid.thousandsSeparator', {
              defaultMessage: 'Use thousands separator for numbers',
            })}
          />

          <FormTextField
            name="dataGrid.defaultAutoRefreshInterval"
            label={_t('settings.dataGrid.defaultAutoRefreshInterval', {
              defaultMessage: 'Default grid auto refresh interval in seconds',
            })}
            defaultValue="10"
          />

          <FormCheckboxField
            name="dataGrid.alignNumbersRight"
            label={_t('settings.dataGrid.alignNumbersRight', { defaultMessage: 'Align numbers to right' })}
            defaultValue={false}
          />

          <FormTextField
            name="dataGrid.collectionPageSize"
            label={_t('settings.dataGrid.collectionPageSize', {
              defaultMessage: 'Collection page size (for MongoDB JSON view, must be between 5 and 1000)',
            })}
            defaultValue="50"
          />

          <FormSelectField
            label={_t('settings.dataGrid.coloringMode', { defaultMessage: 'Row coloring mode' })}
            name="dataGrid.coloringMode"
            isNative
            defaultValue="36"
            options={[
              {
                value: '36',
                label: _t('settings.dataGrid.coloringMode.36', { defaultMessage: 'Every 3rd and 6th row' }),
              },
              {
                value: '2-primary',
                label: _t('settings.dataGrid.coloringMode.2-primary', {
                  defaultMessage: 'Every 2-nd row, primary color',
                }),
              },
              {
                value: '2-secondary',
                label: _t('settings.dataGrid.coloringMode.2-secondary', {
                  defaultMessage: 'Every 2-nd row, secondary color',
                }),
              },
              { value: 'none', label: _t('settings.dataGrid.coloringMode.none', { defaultMessage: 'None' }) },
            ]}
          />

          <FormCheckboxField
            name="dataGrid.showAllColumnsWhenSearch"
            label={_t('settings.dataGrid.showAllColumnsWhenSearch', {
              defaultMessage: 'Show all columns when searching',
            })}
            defaultValue={false}
          />

          <div class="heading">{_t('settings.sqlEditor', { defaultMessage: 'SQL editor' })}</div>

          <div class="flex">
            <div class="col-3">
              <FormSelectField
                label={_t('settings.sqlEditor.sqlCommandsCase', { defaultMessage: 'SQL commands case' })}
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
              <FormFieldTemplateLarge
                label={_t('settings.editor.keybinds', { defaultMessage: 'Editor keybinds' })}
                type="combo"
              >
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
              <FormFieldTemplateLarge
                label={_t('settings.editor.wordWrap', { defaultMessage: 'Enable word wrap' })}
                type="combo"
              >
                <CheckboxField
                  checked={$currentEditorWrapEnabled}
                  on:change={e => ($currentEditorWrapEnabled = e.target.checked)}
                />
              </FormFieldTemplateLarge>
            </div>
          </div>

          <FormTextField
            name="sqlEditor.limitRows"
            label={_t('settings.sqlEditor.limitRows', { defaultMessage: 'Return only N rows from query' })}
            placeholder={_t('settings.sqlEditor.limitRowsPlaceholder', { defaultMessage: '(No rows limit)' })}
          />

          <FormCheckboxField
            name="sqlEditor.showTableAliasesInCodeCompletion"
            label={_t('settings.sqlEditor.showTableAliasesInCodeCompletion', {
              defaultMessage: 'Show table aliases in code completion',
            })}
            defaultValue={false}
          />

          <FormCheckboxField
            name="sqlEditor.disableSplitByEmptyLine"
            label={_t('settings.sqlEditor.disableSplitByEmptyLine', { defaultMessage: 'Disable split by empty line' })}
            defaultValue={false}
          />

          <FormCheckboxField
            name="sqlEditor.disableExecuteCurrentLine"
            label={_t('settings.sqlEditor.disableExecuteCurrentLine', {
              defaultMessage: 'Disable current line execution (Execute current)',
            })}
            defaultValue={false}
          />
        </svelte:fragment>
        <svelte:fragment slot="2">
          <div class="heading">{_t('settings.connection', { defaultMessage: 'Connection' })}</div>

          <FormFieldTemplateLarge
            label={_t('settings.connection.showOnlyTabsFromSelectedDatabase', {
              defaultMessage: 'Show only tabs from selected database',
            })}
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
            label={_t('settings.connection.autoRefresh', {
              defaultMessage: 'Automatic refresh of database model on background',
            })}
            defaultValue={false}
          />
          <FormTextField
            name="connection.autoRefreshInterval"
            label={_t('settings.connection.autoRefreshInterval', {
              defaultMessage: 'Interval between automatic DB structure reloads in seconds',
            })}
            defaultValue="30"
            disabled={values['connection.autoRefresh'] === false}
          />
          <FormSelectField
            label={_t('settings.connection.sshBindHost', { defaultMessage: 'Local host address for SSH connections' })}
            name="connection.sshBindHost"
            isNative
            defaultValue="127.0.0.1"
            options={[
              { value: '127.0.0.1', label: '127.0.0.1 (IPv4)' },
              { value: '::1', label: '::1  (IPv6)' },
              { value: 'localhost', label: 'localhost (domain name)' },
            ]}
          />

          <div class="heading">{_t('settings.session', { defaultMessage: 'Query sessions' })}</div>
          <FormCheckboxField
            name="session.autoClose"
            label={_t('settings.session.autoClose', {
              defaultMessage: 'Automatic close query sessions after period without any activity',
            })}
            defaultValue={true}
          />
          <FormTextField
            name="session.autoCloseTimeout"
            label={_t('settings.session.autoCloseTimeout', {
              defaultMessage: 'Interval, after which query session without activity is closed (in minutes)',
            })}
            defaultValue="15"
            disabled={values['session.autoClose'] === false}
          />
        </svelte:fragment>

        <svelte:fragment slot="3">
          <div class="heading">{_t('settings.appearance', { defaultMessage: 'Application theme' })}</div>

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
        </svelte:fragment>
        <svelte:fragment slot="4">
          <div class="heading">{_t('settings.defaultActions', { defaultMessage: 'Default actions' })}</div>

          <FormSelectField
            label={_t('settings.defaultActions.connectionClick', { defaultMessage: 'Connection click' })}
            name="defaultAction.connectionClick"
            isNative
            defaultValue="connect"
            options={[
              {
                value: 'openDetails',
                label: _t('settings.defaultActions.connectionClick.openDetails', {
                  defaultMessage: 'Edit / open details',
                }),
              },
              {
                value: 'connect',
                label: _t('settings.defaultActions.connectionClick.connect', { defaultMessage: 'Connect' }),
              },
              {
                value: 'none',
                label: _t('settings.defaultActions.connectionClick.none', { defaultMessage: 'Do nothing' }),
              },
            ]}
          />

          <FormSelectField
            label={_t('settings.defaultActions.databaseClick', { defaultMessage: 'Database click' })}
            name="defaultAction.databaseClick"
            isNative
            defaultValue="switch"
            options={[
              {
                value: 'switch',
                label: _t('settings.defaultActions.databaseClick.switch', { defaultMessage: 'Switch database' }),
              },
              {
                value: 'none',
                label: _t('settings.defaultActions.databaseClick.none', { defaultMessage: 'Do nothing' }),
              },
            ]}
          />

          <FormCheckboxField
            name="defaultAction.useLastUsedAction"
            label={_t('settings.defaultActions.useLastUsedAction', { defaultMessage: 'Use last used action' })}
            defaultValue={true}
          />

          <FormDefaultActionField
            label={_t('settings.defaultActions.tableClick', { defaultMessage: 'Table click' })}
            objectTypeField="tables"
            disabled={values['defaultAction.useLastUsedAction'] !== false}
          />
          <FormDefaultActionField
            label={_t('settings.defaultActions.viewClick', { defaultMessage: 'View click' })}
            objectTypeField="views"
            disabled={values['defaultAction.useLastUsedAction'] !== false}
          />
          <FormDefaultActionField
            label={_t('settings.defaultActions.materializedViewClick', { defaultMessage: 'Materialized view click' })}
            objectTypeField="matviews"
            disabled={values['defaultAction.useLastUsedAction'] !== false}
          />
          <FormDefaultActionField
            label={_t('settings.defaultActions.procedureClick', { defaultMessage: 'Procedure click' })}
            objectTypeField="procedures"
            disabled={values['defaultAction.useLastUsedAction'] !== false}
          />
          <FormDefaultActionField
            label={_t('settings.defaultActions.functionClick', { defaultMessage: 'Function click' })}
            objectTypeField="functions"
            disabled={values['defaultAction.useLastUsedAction'] !== false}
          />
          <FormDefaultActionField
            label={_t('settings.defaultActions.collectionClick', { defaultMessage: 'NoSQL collection click' })}
            objectTypeField="collections"
            disabled={values['defaultAction.useLastUsedAction'] !== false}
          />
        </svelte:fragment>
        <svelte:fragment slot="5">
          <div class="heading">{_t('settings.behaviour', { defaultMessage: 'Behaviour' })}</div>

          <FormCheckboxField
            name="behaviour.useTabPreviewMode"
            label={_t('settings.behaviour.useTabPreviewMode', { defaultMessage: 'Use tab preview mode' })}
            defaultValue={true}
          />

          <FormCheckboxField
            name="behaviour.jsonPreviewWrap"
            label={_t('settings.behaviour.jsonPreviewWrap', { defaultMessage: 'Wrap JSON in preview' })}
            defaultValue={false}
          />

          <div class="tip">
            <FontIcon icon="img tip" />
            {_t('settings.behaviour.singleClickPreview', {
              defaultMessage:
                'When you single-click or select a file in the "Tables, Views, Functions" view, it is shown in a preview mode and reuses an existing tab (preview tab). This is useful if you are quickly browsing tables and don\'t want every visited table to have its own tab. When you start editing the table or use double-click to open the table from the "Tables" view, a new tab is dedicated to that table.',
            })}
          </div>

          <FormCheckboxField
            name="behaviour.openDetailOnArrows"
            label={_t('settings.behaviour.openDetailOnArrows', {
              defaultMessage: 'Open detail on keyboard navigation',
            })}
            defaultValue={true}
            disabled={values['behaviour.useTabPreviewMode'] === false}
          />

          <div class="heading">{_t('settings.confirmations', { defaultMessage: 'Confirmations' })}</div>

          <FormCheckboxField
            name="skipConfirm.tableDataSave"
            label={_t('settings.confirmations.skipConfirm.tableDataSave', {
              defaultMessage: 'Skip confirmation when saving table data (SQL)',
            })}
          />
          <FormCheckboxField
            name="skipConfirm.collectionDataSave"
            label={_t('settings.confirmations.skipConfirm.collectionDataSave', {
              defaultMessage: 'Skip confirmation when saving collection data (NoSQL)',
            })}
          />
        </svelte:fragment>
        <svelte:fragment slot="6">
          <div class="heading">{_t('settings.other', { defaultMessage: 'Other' })}</div>

          <FormTextField
            name="other.gistCreateToken"
            label={_t('settings.other.gistCreateToken', { defaultMessage: 'API token for creating error gists' })}
            defaultValue=""
          />

          <FormSelectField
            label={_t('settings.other.autoUpdateApplication', { defaultMessage: 'Auto update application' })}
            name="app.autoUpdateMode"
            isNative
            defaultValue=""
            options={[
              {
                value: 'skip',
                label: _t('settings.other.autoUpdateApplication.skip', {
                  defaultMessage: 'Do not check for new versions',
                }),
              },
              {
                value: '',
                label: _t('settings.other.autoUpdateApplication.check', { defaultMessage: 'Check for new versions' }),
              },
              {
                value: 'download',
                label: _t('settings.other.autoUpdateApplication.download', {
                  defaultMessage: 'Check and download new versions',
                }),
              },
            ]}
          />

          {#if isProApp()}
            <FormCheckboxField
              name="ai.allowSendModels"
              label={_t('settings.other.ai.allowSendModels', {
                defaultMessage: 'Allow to send DB models and query snippets to AI service',
              })}
              defaultValue={false}
            />
          {/if}
        </svelte:fragment>

        <svelte:fragment slot="7">
          <div class="heading">{_t('settings.other.license', { defaultMessage: 'License' })}</div>
          <FormTextAreaField
            name="other.licenseKey"
            label={_t('settings.other.licenseKey', { defaultMessage: 'License key' })}
            rows={7}
            onChange={async value => {
              licenseKeyCheckResult = await apiCall('config/check-license', { licenseKey: value });
            }}
          />
          {#if licenseKeyCheckResult}
            <div class="m-3 ml-5">
              {#if licenseKeyCheckResult.status == 'ok'}
                <div>
                  <FontIcon icon="img ok" />
                  {_t('settings.other.licenseKey.valid', { defaultMessage: 'License key is valid' })}
                </div>
                {#if licenseKeyCheckResult.validTo}
                  <div>
                    {_t('settings.other.licenseKey.validTo', { defaultMessage: 'License valid to:' })}
                    {licenseKeyCheckResult.validTo}
                  </div>
                {/if}
                {#if licenseKeyCheckResult.expiration}
                  <div>
                    {_t('settings.other.licenseKey.expiration', { defaultMessage: 'License key expiration:' })}
                    <b>{safeFormatDate(licenseKeyCheckResult.expiration)}</b>
                  </div>
                {/if}
              {:else if licenseKeyCheckResult.status == 'error'}
                <div>
                  <FontIcon icon="img error" />
                  {licenseKeyCheckResult.errorMessage ??
                    _t('settings.other.licenseKey.invalid', { defaultMessage: 'License key is invalid' })}
                  {#if licenseKeyCheckResult.expiration}
                    <div>
                      {_t('settings.other.licenseKey.expiration', { defaultMessage: 'License key expiration:' })}
                      <b>{safeFormatDate(licenseKeyCheckResult.expiration)}</b>
                    </div>
                  {/if}
                </div>
                {#if licenseKeyCheckResult.isExpired}
                  <div class="mt-2">
                    <FormStyledButton
                      value={_t('settings.other.licenseKey.checkForNew', {
                        defaultMessage: 'Check for new license key',
                      })}
                      skipWidth
                      on:click={async () => {
                        licenseKeyCheckResult = await apiCall('config/get-new-license', { oldLicenseKey: licenseKey });
                        if (licenseKeyCheckResult.licenseKey) {
                          apiCall('config/update-settings', { 'other.licenseKey': licenseKeyCheckResult.licenseKey });
                        }
                      }}
                    />
                  </div>
                {/if}
              {/if}
            </div>
          {/if}
        </svelte:fragment>

        <svelte:fragment slot="8">
          <div class="heading">{_t('settings.externalTools', { defaultMessage: 'External tools' })}</div>
          <FormTextField
            name="externalTools.mysqldump"
            label={_t('settings.other.externalTools.mysqldump', {
              defaultMessage: 'mysqldump (backup MySQL database)',
            })}
            defaultValue="mysqldump"
          />
          <FormTextField
            name="externalTools.mysql"
            label={_t('settings.other.externalTools.mysql', { defaultMessage: 'mysql (restore MySQL database)' })}
            defaultValue="mysql"
          />
          <FormTextField
            name="externalTools.mysqlPlugins"
            label={_t('settings.other.externalTools.mysqlPlugins', {
              defaultMessage:
                'Folder with mysql plugins (for example for authentication). Set only in case of problems',
            })}
            defaultValue=""
          />
          <FormTextField
            name="externalTools.pg_dump"
            label={_t('settings.other.externalTools.pg_dump', {
              defaultMessage: 'pg_dump (backup PostgreSQL database)',
            })}
            defaultValue="pg_dump"
          />
          <FormTextField
            name="externalTools.psql"
            label={_t('settings.other.externalTools.psql', { defaultMessage: 'psql (restore PostgreSQL database)' })}
            defaultValue="psql"
          />
        </svelte:fragment>

        <svelte:fragment slot="9">
          <AiSettingsTab {values} />
        </svelte:fragment>
      </TabControl>
    </FormValues>

    <div slot="footer">
      <!-- <FormSubmit value="OK" on:click={handleOk} /> -->
      <FormStyledButton value={_t('common.close', { defaultMessage: 'Close' })} on:click={closeCurrentModal} />
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
