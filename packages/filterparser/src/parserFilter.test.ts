import parserFilter, { parseFilter } from './parseFilter';

test('parse string', parseFilter('"123"', 'string'));
