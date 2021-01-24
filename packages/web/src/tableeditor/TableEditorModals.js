import _ from 'lodash';
import React from 'react';
import ModalBase from '../modals/ModalBase';
import ModalContent from '../modals/ModalContent';
import ModalFooter from '../modals/ModalFooter';
import ModalHeader from '../modals/ModalHeader';
import { FormProvider } from '../utility/FormProvider';
import { FormCheckboxField, FormTextField } from '../utility/forms';
import FormStyledButton from '../widgets/FormStyledButton';

export function ColumnEditorModal({ modalState, columnInfo = undefined, tableInfo, setTableInfo }) {
  const initialValues = columnInfo
    ? {
        ..._.pick(columnInfo, ['columnName', 'dataType', 'autoIncrement', 'defaultValue', 'computedExpression']),
      }
    : {};
  return (
    <FormProvider initialValues={initialValues}>
      <ModalBase modalState={modalState}>
        <ModalHeader modalState={modalState}>{columnInfo ? 'Edit column' : 'Add new column'}</ModalHeader>
        <ModalContent>
          <FormTextField name="columnName" label="Column name" />
          <FormTextField name="dataType" label="Data type" />
          <FormCheckboxField name="notNull" label="NOT NULL" />
          {/* <FormCheckboxField name="isPrimaryKey" label="Is Primary Key" /> */}
          <FormCheckboxField name="autoIncrement" label="Is Autoincrement" />
          <FormTextField name="defaultValue" label="Default value" />
          <FormTextField name="computedExpression" label="Computed expression" />
        </ModalContent>
        <ModalFooter>
          <FormStyledButton value="Close" onClick={() => modalState.close()} />
        </ModalFooter>
      </ModalBase>
    </FormProvider>
  );

  //   <>
  //   <ModalFormItemText
  //     inputElementId="column_editor_column_name"
  //     field="name"
  //     label="Column name"
  //     ref={x => (this.domName = x)}
  //   />

  //   <ModalFormItemTextWithDropDown inputElementId="column_editor_data_type" field="dataType" label="Data type">
  //     <DropDownMenuItem onClick={this.setDataType.bind(this, 'int')}>int</DropDownMenuItem>
  //     <DropDownMenuItem onClick={this.setDataType.bind(this, 'nvarchar(250)')}>nvarchar(250)</DropDownMenuItem>
  //     <DropDownMenuItem onClick={this.setDataType.bind(this, 'datetime')}>datetime</DropDownMenuItem>
  //     <DropDownMenuItem onClick={this.setDataType.bind(this, 'numeric(10,2)')}>numeric(10,2)</DropDownMenuItem>
  //     <DropDownMenuItem onClick={this.setDataType.bind(this, 'float')}>float</DropDownMenuItem>
  //   </ModalFormItemTextWithDropDown>

  //   <ModalFormItemCheckBox inputElementId="column_editor_not_null" field="notNull" label="NOT NULL" />
  //   <ModalFormItemCheckBox inputElementId="column_editor_primary_key" field="primaryKey" label="Is Primary Key" />
  //   <ModalFormItemCheckBox
  //     inputElementId="column_editor_auto_increment"
  //     field="autoIncrement"
  //     label="Is Autoincrement"
  //   />

  //   <ModalFormItemText inputElementId="column_editor_default_value" field="defaultValue" label="Default value" />

  //   <div className="form-group row">
  //     <label className="col-sm-4 form-control-label">Referenced table</label>
  //     <div className="col-sm-8">
  //       <Select
  //         options={selectTableOptions}
  //         value={this.refTableName}
  //         onChange={value => this.changeRefTable(value.value)}
  //         clearable={false}
  //       />
  //     </div>
  //   </div>

  //   {_.includes(dbCaps.columnListOptionalColumns, 'isSparse') && (
  //     <ModalFormItemCheckBox inputElementId="column_editor_is_sparse" field="isSparse" label="Is Sparse" />
  //   )}
  //   {_.includes(dbCaps.columnListOptionalColumns, 'computedExpression') && (
  //     <ModalFormItemText
  //       inputElementId="column_editor_computed_expression"
  //       field="computedExpression"
  //       label="Computed Expression"
  //     />
  //   )}
  //   {_.includes(dbCaps.columnListOptionalColumns, 'isPersisted') && !!this.props.model.computedExpression && (
  //     <ModalFormItemCheckBox inputElementId="column_editor_is_persisted" field="isPersisted" label="Is Persisted" />
  //   )}
  // </>
  // );
}

// export class ColumnEditorDialog extends RefTableObjectEditorBase<ColumnInfo> {
//     wasPrimaryKey: boolean;

//     renderBody() {
//         var dbCaps = getDatabaseEngineCaps(this.props.database);

//         let selectTableOptions = [];
//         if (this.tables) selectTableOptions = this.tables.map(function (x) { return { value: x.fullName, label: x.fullName }; });

//         return <div>
//             <ModalFormItemText inputElementId='column_editor_column_name' field='name' label="Column name" ref={x => this.domName = x} />

//             <ModalFormItemTextWithDropDown inputElementId='column_editor_data_type' field='dataType' label="Data type" >
//                 <DropDownMenuItem onClick={this.setDataType.bind(this, 'int')}>int</DropDownMenuItem>
//                 <DropDownMenuItem onClick={this.setDataType.bind(this, 'nvarchar(250)')}>nvarchar(250)</DropDownMenuItem>
//                 <DropDownMenuItem onClick={this.setDataType.bind(this, 'datetime')}>datetime</DropDownMenuItem>
//                 <DropDownMenuItem onClick={this.setDataType.bind(this, 'numeric(10,2)')}>numeric(10,2)</DropDownMenuItem>
//                 <DropDownMenuItem onClick={this.setDataType.bind(this, 'float')}>float</DropDownMenuItem>
//             </ModalFormItemTextWithDropDown>

//             <ModalFormItemCheckBox inputElementId='column_editor_not_null' field='notNull' label="NOT NULL" />
//             <ModalFormItemCheckBox inputElementId='column_editor_primary_key' field='primaryKey' label="Is Primary Key" />
//             <ModalFormItemCheckBox inputElementId='column_editor_auto_increment' field='autoIncrement' label="Is Autoincrement" />

//             <ModalFormItemText inputElementId='column_editor_default_value' field='defaultValue' label="Default value" />

//             <div className='form-group row'>
//                 <label className='col-sm-4 form-control-label'>Referenced table</label>
//                 <div className='col-sm-8'>
//                     <Select options={selectTableOptions} value={this.refTableName} onChange={value => this.changeRefTable(value.value)} clearable={false} />
//                 </div>
//             </div>

//             {_.includes(dbCaps.columnListOptionalColumns, 'isSparse') &&
//                 <ModalFormItemCheckBox inputElementId='column_editor_is_sparse' field='isSparse' label='Is Sparse' />
//             }
//             {_.includes(dbCaps.columnListOptionalColumns, 'computedExpression') &&
//                 <ModalFormItemText inputElementId='column_editor_computed_expression' field='computedExpression' label='Computed Expression' />
//             }
//             {_.includes(dbCaps.columnListOptionalColumns, 'isPersisted') && !!this.props.model.computedExpression &&
//                 <ModalFormItemCheckBox inputElementId='column_editor_is_persisted' field='isPersisted' label='Is Persisted' />
//             }

//         </div>;
//     }

//     async okButtonClick(result = 'addnew') {
//         await this.validate();
//         this.okButtonClickBase(result);
//     }

//     async onCreated() {
//         if (this.props.addNewObject) {
//             this.okButtonTitle = 'Save and Add Next';
//         }
//         this.wasPrimaryKey = this.props.model.primaryKey;
//         await super.onCreated();
//     }

//     renderAdditionalButtons() {
//         if (this.props.addNewObject) {
//             return <button type="button" className="btn btn-primary" onClick={() => this.okButtonClick('close')} ref={x => this.domOkButton = x}>Save and Close</button>
//         }
//     }

//     setDataType(type: string) {
//         this.props.model.dataType = type;
//         this.forceUpdate();
//     }

//     get refTableName() {
//         let col = new TableColumnClientObject(this.props.table, this.props.model, this.props.tableInfo);
//         let fk = col.getForeignKeys().filter(x => x.columns.length == 1)[0];
//         if (!fk) return null;
//         return createFullName(fk.refSchemaName, fk.refTableName);
//     }

//     async changeRefTable(table) {
//         let newTable = this.tables.filter(x => x.fullName == table)[0];
//         if (!newTable) return;
//         let col = new TableColumnClientObject(this.props.table, this.props.model, this.props.tableInfo);
//         let fks = col.getForeignKeys().filter(x => x.columns.length == 1);
//         _.remove(this.props.tableInfo.foreignKeys, x => _.includes(fks, x));
//         this.refTableInfo = await newTable.getTableInfoAsync();
//         let refInfo = this.refTableInfo;
//         if (refInfo.primaryKey && refInfo.primaryKey.columns.length == 1) {
//             let column = refInfo.columns.filter(x => x.name == refInfo.primaryKey.columns[0].refColumnName)[0];
//             if (column) {
//                 this.props.model.dataType = column.dataType;
//                 if (!this.props.model.name) this.props.model.name = column.name;
//                 let fk = {
//                     refTableName: refInfo.name,
//                     refSchemaName: refInfo.schema,
//                     columns: [{ refColumnName: this.props.model.name }],
//                     refColumns: [{ refColumnName: column.name }],
//                 };
//                 this.props.tableInfo.foreignKeys.push(fk as any);
//             }
//         }
//         this.forceUpdate();
//     }

//     async validate() {
//         if (this.props.model.primaryKey && !this.wasPrimaryKey) {
//             if (!this.props.tableInfo.primaryKey) {
//                 this.props.tableInfo.primaryKey = { columns: [] } as any;
//             }
//             this.props.tableInfo.primaryKey.columns.push({ refColumnName: this.props.model.name });
//         }
//         if (!this.props.model.primaryKey && this.wasPrimaryKey) {
//             if (this.props.tableInfo.primaryKey) {
//                 _.remove(this.props.tableInfo.primaryKey.columns, x => x.refColumnName == this.props.model.name);
//                 if (this.props.tableInfo.primaryKey.columns.length == 0) {
//                     this.props.tableInfo.primaryKey = null;
//                 }
//             }
//         }
//     }
// }
