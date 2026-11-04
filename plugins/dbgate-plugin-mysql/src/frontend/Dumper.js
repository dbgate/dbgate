const { SqlDumper, arrayToHexString } = global.DBGATE_PACKAGES['dbgate-tools'];
const _isArray = require('lodash/isArray');

class Dumper extends SqlDumper {
  /** @param type {import('dbgate-types').TransformType} */
  transform(type, dumpExpr) {
    switch (type) {
      case 'GROUP:YEAR':
      case 'YEAR':
        this.put('^year(%c)', dumpExpr);
        break;
      case 'MONTH':
        this.put('^month(%c)', dumpExpr);
        break;
      case 'DAY':
        this.put('^day(%c)', dumpExpr);
        break;
      case 'GROUP:MONTH':
        this.put("^date_format(%c, '%s')", dumpExpr, '%Y-%m');
        break;
      case 'GROUP:DAY':
        this.put("^date_format(%c, '%s')", dumpExpr, '%Y-%m-%d');
        break;
      default:
        dumpExpr();
        break;
    }
  }

  renameTable(obj, newName) {
    this.putCmd('^rename ^table %f ^to %i', obj, newName);
  }

  changeColumn(oldcol, newcol, constraints) {
    if (!oldcol.notNull) {
      this.fillNewNotNullDefaults({
        ...newcol,
        columnName: oldcol.columnName,
      });
    }
    this.put('^alter ^table %f ^change ^column %i %i ', oldcol, oldcol.columnName, newcol.columnName);
    this.alterColumnDefinition(newcol);
    this.inlineConstraints(constraints);
    this.endCommand();
  }

  changeColumnPosition(column, afterColumnName) {
    this.put('^alter ^table %f ^modify ^column %i ', column, column.columnName);
    this.alterColumnDefinition(column);
    if (afterColumnName) {
      this.put(' ^after %i', afterColumnName);
    } else {
      this.put(' ^first');
    }
    this.endCommand();
  }

  /**
   * Full column definition for CHANGE/MODIFY COLUMN - MySQL replaces whole column definition, so properties,
   * which are not used in CREATE TABLE (charset, collation, generated column, invisible) must be repeated
   */
  alterColumnDefinition(col) {
    if (col.generationExpression) {
      this.columnType(col.dataType);
      this.put(' ');
      this.specialColumnOptions(col);
      this.columnCharset(col);
      this.put('^as (%s)', col.generationExpression);
      this.put(col.isStoredGenerated ? ' ^stored' : ' ^virtual');
      // MariaDB doesn't allow NULL/NOT NULL for generated columns, MySQL default is NULL
      if (col.notNull) this.put(' ^not ^null');
      if (col.columnComment) this.put(' ^comment %v', col.columnComment);
      if (col.isInvisible) this.put(' ^invisible');
      return;
    }

    this.isAlterColumnDefinition = true;
    try {
      this.columnDefinition(col);
    } finally {
      this.isAlterColumnDefinition = false;
    }
    if (col.isInvisible) this.put(' ^invisible');
  }

  columnCharset(col) {
    if (!/^(var)?char\b|^(tiny|medium|long)?text$|^(enum|set)\s*\(/i.test(col.dataType || '')) return;
    if (col.characterSet && /^\w+$/.test(col.characterSet)) this.put('^character ^set %s ', col.characterSet);
    if (col.collation && /^\w+$/.test(col.collation)) this.put('^collate %s ', col.collation);
  }

  autoIncrement() {}

  specialColumnOptions(column) {
    if (column.isUnsigned) {
      this.put('^unsigned ');
    }
    if (column.isZerofill) {
      this.put('^zerofill ');
    }
    if (column.autoIncrement) {
      this.put('^auto_increment ');
    }
    if (this.isAlterColumnDefinition) {
      this.columnCharset(column);
    }
  }

  columnDefinition(col, options) {
    super.columnDefinition(col, options);
    if (col.onUpdateExpression) {
      if (!col.notNull && !col.defaultValue?.toString()?.trim()) {
        this.put(' ^default ^null ');
      }
      this.put(' ^on ^update %s ', col.onUpdateExpression);
    }
    if (col.columnComment) {
      this.put(' ^comment %v ', col.columnComment);
    }
  }

  renameColumn(column, newcol) {
    this.changeColumn(
      column,
      {
        ...column,
        columnName: newcol,
      },
      []
    );
  }

  enableConstraints(table, enabled) {
    this.putCmd('^set FOREIGN_KEY_CHECKS = %s', enabled ? '1' : '0');
  }

  comment(value) {
    this.put('/* %s */', value);
  }

  beginTransaction() {
    this.putCmd('^start ^transaction');
  }

  selectTableIntoNewTable(sourceName, targetName) {
    this.putCmd('^create ^table %f (^select * ^from %f)', targetName, sourceName);
  }

  putByteArrayValue(value) {
    this.putRaw(`unhex('${arrayToHexString(value)}')`);
  }

  selectScopeIdentity() {
    this.put('^select ^last_insert_id()');
  }

  indexType(ix) {
    if (ix.isUnique) {
      this.put(' ^unique');
      return;
    }
    if (ix.indexType?.toLowerCase() == 'fulltext') {
      this.put(' ^fulltext');
      return;
    }
  }

  callableTemplate(func) {
    const parameters = (func.parameters || []).filter(x => x.parameterMode != 'RETURN');

    const putParameters = (parameters, delimiter) => {
      this.putCollection(delimiter, parameters || [], param => {
        if (param.parameterMode == 'IN') {
          this.putRaw('@' + param.parameterName);
        } else {
          this.putRaw('@' + param.parameterName + 'Output');
        }
      });
    };

    const putSetParamters = parameters => {
      for (const param of parameters || []) {
        if (param.parameterMode == 'IN') {
          this.put('SET @%s = :%s', param.parameterName, param.parameterName);
          this.endCommand();
        }
      }
      this.put('&n');
    };

    if (func.objectTypeField == 'procedures') {
      putSetParamters(func.parameters);
      this.put('^call %f(&>&n', func);
      putParameters(parameters, ',&n');
      this.put('&<&n)');
      this.endCommand();
    }

    if (func.objectTypeField == 'functions') {
      putSetParamters(parameters);
      this.put('^select %f(&>&n', func);
      putParameters(parameters, ',&n');
      this.put('&<&n)');
      this.endCommand();
    }
  }

  putValue(value, dataType) {
    const dataLower = dataType?.toLowerCase();
    if (dataLower?.includes('date')) {
      if (typeof value == 'string') {
        this.putRaw("'");
        this.putRaw(this.escapeString(value.replace(/(?:Z|[+-]\d{2}:?\d{2})$/, '')));
        this.putRaw("'");
        return;
      }
    }
    super.putValue(value, dataType);
  }
}

module.exports = Dumper;
