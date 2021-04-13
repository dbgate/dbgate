const tedious = require('tedious');

const { TYPES } = tedious;

const N_TYPES = {
  BitN: 0x68,
  DateTimeN: 0x6f,
  DecimalN: 0x6a,
  FloatN: 0x6d,
  IntN: 0x26,
  MoneyN: 0x6e,
  NumericN: 0x6c,
};

function getConcreteType(type, length) {
  switch (type.id) {
    case N_TYPES.BitN:
      return TYPES.Bit;
    case N_TYPES.NumericN:
      return TYPES.Numeric;
    case N_TYPES.DecimalN:
      return TYPES.Decimal;
    case N_TYPES.IntN:
      if (length === 8) return TYPES.BigInt;
      if (length === 4) return TYPES.Int;
      if (length === 2) return TYPES.SmallInt;
      return TYPES.TinyInt;
    case N_TYPES.FloatN:
      if (length === 8) return TYPES.Float;
      return TYPES.Real;
    case N_TYPES.MoneyN:
      if (length === 8) return TYPES.Money;
      return TYPES.SmallMoney;
    case N_TYPES.DateTimeN:
      if (length === 8) return TYPES.DateTime;
      return TYPES.SmallDateTime;
  }
  return type;
}

module.exports = getConcreteType;
