const express = require('express');
const users = require('../entities/users');
const products = require('../entities/products');
const orders = require('../entities/orders');
const categories = require('../entities/categories');
const reviews = require('../entities/reviews');

const router = express.Router();

const entitySets = {
  Users: users,
  Products: products,
  Orders: orders,
  Categories: categories,
  Reviews: reviews,
};

function parsePrimitive(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  const trimmed = String(rawValue).trim();

  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }

  if (trimmed.toLowerCase() === 'true') {
    return true;
  }

  if (trimmed.toLowerCase() === 'false') {
    return false;
  }

  if (trimmed.toLowerCase() === 'null') {
    return null;
  }

  if (!Number.isNaN(Number(trimmed)) && trimmed !== '') {
    return Number(trimmed);
  }

  return trimmed;
}

function compareValues(left, right, operator) {
  if (operator === 'eq') return left === right;
  if (operator === 'ne') return left !== right;
  if (operator === 'gt') return left > right;
  if (operator === 'ge') return left >= right;
  if (operator === 'lt') return left < right;
  if (operator === 'le') return left <= right;
  return false;
}

function buildFilterPredicate(filterExpression) {
  if (!filterExpression) {
    return () => true;
  }

  const functionMatch = filterExpression.match(/^(contains|startswith|endswith)\((\w+),\s*(.+)\)$/i);
  if (functionMatch) {
    const operator = functionMatch[1].toLowerCase();
    const fieldName = functionMatch[2];
    const lookupValue = String(parsePrimitive(functionMatch[3])).toLowerCase();

    return (item) => {
      const fieldValue = String(item[fieldName] ?? '').toLowerCase();

      if (operator === 'contains') return fieldValue.includes(lookupValue);
      if (operator === 'startswith') return fieldValue.startsWith(lookupValue);
      if (operator === 'endswith') return fieldValue.endsWith(lookupValue);
      return false;
    };
  }

  const binaryMatch = filterExpression.match(/^(\w+)\s+(eq|ne|gt|ge|lt|le)\s+(.+)$/i);
  if (binaryMatch) {
    const fieldName = binaryMatch[1];
    const operator = binaryMatch[2].toLowerCase();
    const lookupValue = parsePrimitive(binaryMatch[3]);

    return (item) => compareValues(item[fieldName], lookupValue, operator);
  }

  return () => true;
}

function applyOrderBy(items, orderByExpression) {
  if (!orderByExpression) {
    return items;
  }

  const fields = orderByExpression
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, direction] = part.split(/\s+/);
      return {
        name,
        descending: String(direction || '').toLowerCase() === 'desc',
      };
    });

  return [...items].sort((a, b) => {
    for (const field of fields) {
      const aValue = a[field.name];
      const bValue = b[field.name];

      if (aValue === bValue) {
        continue;
      }

      if (aValue === undefined || aValue === null) return field.descending ? 1 : -1;
      if (bValue === undefined || bValue === null) return field.descending ? -1 : 1;

      if (aValue > bValue) return field.descending ? -1 : 1;
      if (aValue < bValue) return field.descending ? 1 : -1;
    }

    return 0;
  });
}

function applySelect(items, selectExpression) {
  if (!selectExpression) {
    return items;
  }

  const fields = selectExpression
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (fields.length === 0) {
    return items;
  }

  return items.map((item) => {
    const selected = {};

    fields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(item, field)) {
        selected[field] = item[field];
      }
    });

    if (!Object.prototype.hasOwnProperty.call(selected, 'id') && Object.prototype.hasOwnProperty.call(item, 'id')) {
      selected.id = item.id;
    }

    return selected;
  });
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function inferEdmType(sampleValue) {
  if (typeof sampleValue === 'number') {
    return Number.isInteger(sampleValue) ? 'Edm.Int32' : 'Edm.Decimal';
  }

  if (typeof sampleValue === 'boolean') {
    return 'Edm.Boolean';
  }

  if (typeof sampleValue === 'string') {
    const parsedDate = Date.parse(sampleValue);
    if (!Number.isNaN(parsedDate) && sampleValue.includes('T')) {
      return 'Edm.DateTimeOffset';
    }
    return 'Edm.String';
  }

  return 'Edm.String';
}

function createMetadataXml(baseUrl) {
  const namespace = 'DBGate.TestApi';

  const entityTypes = Object.entries(entitySets)
    .map(([setName, entity]) => {
      const first = entity.getAll()[0] || { id: 0 };
      const fields = Object.keys(first);

      const propertiesXml = fields
        .map((field) => {
          const type = inferEdmType(first[field]);
          const nullable = field === 'id' ? 'false' : 'true';
          return `        <Property Name="${escapeXml(field)}" Type="${type}" Nullable="${nullable}" />`;
        })
        .join('\n');

      return `      <EntityType Name="${setName}">
        <Key>
          <PropertyRef Name="id" />
        </Key>
${propertiesXml}
      </EntityType>`;
    })
    .join('\n');

  const entityContainerXml = Object.keys(entitySets)
    .map((setName) => `        <EntitySet Name="${setName}" EntityType="${namespace}.${setName}" />`)
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="${namespace}" xmlns="http://docs.oasis-open.org/odata/ns/edm">
${entityTypes}
      <EntityContainer Name="Container">
${entityContainerXml}
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}

function getEntitySet(setName) {
  return entitySets[setName];
}

function parseKey(rawKey) {
  const keyWithoutName = String(rawKey).includes('=') ? String(rawKey).split('=')[1] : rawKey;
  return parsePrimitive(keyWithoutName);
}

function formatCollectionResponse(req, setName, items, count) {
  const response = {
    '@odata.context': `${req.baseUrl}/$metadata#${setName}`,
    value: items,
  };

  if (count !== null) {
    response['@odata.count'] = count;
  }

  return response;
}

router.get('/', (req, res) => {
  const serviceDocument = {
    '@odata.context': `${req.baseUrl}/$metadata`,
    value: Object.keys(entitySets).map((name) => ({
      name,
      kind: 'EntitySet',
      url: name,
    })),
  };

  res.json(serviceDocument);
});

router.get('/$metadata', (req, res) => {
  res.type('application/xml');
  res.send(createMetadataXml(req.baseUrl));
});

router.get('/:entitySet', (req, res) => {
  const entity = getEntitySet(req.params.entitySet);
  if (!entity) {
    return res.status(404).json({ error: `Unknown entity set: ${req.params.entitySet}` });
  }

  const filterExpression = req.query.$filter;
  const orderByExpression = req.query.$orderby;
  const selectExpression = req.query.$select;
  const skipValue = parseInt(req.query.$skip || '0', 10);
  const topValue = req.query.$top !== undefined ? parseInt(req.query.$top, 10) : null;
  const includeCount = String(req.query.$count || '').toLowerCase() === 'true';

  let rows = entity.getAll();

  rows = rows.filter(buildFilterPredicate(filterExpression));
  const filteredCount = rows.length;
  rows = applyOrderBy(rows, orderByExpression);

  if (Number.isInteger(skipValue) && skipValue > 0) {
    rows = rows.slice(skipValue);
  }

  if (Number.isInteger(topValue) && topValue >= 0) {
    rows = rows.slice(0, topValue);
  }

  rows = applySelect(rows, selectExpression);

  return res.json(formatCollectionResponse(req, req.params.entitySet, rows, includeCount ? filteredCount : null));
});

router.post('/:entitySet', (req, res) => {
  const entity = getEntitySet(req.params.entitySet);
  if (!entity) {
    return res.status(404).json({ error: `Unknown entity set: ${req.params.entitySet}` });
  }

  const created = entity.create(req.body || {});
  res.status(201).json({
    '@odata.context': `${req.baseUrl}/$metadata#${req.params.entitySet}/$entity`,
    ...created,
  });
});

router.get(/^\/([^/]+)\(([^)]+)\)$/, (req, res) => {
  const setName = req.params[0];
  const rawKey = req.params[1];
  const entity = getEntitySet(setName);

  if (!entity) {
    return res.status(404).json({ error: `Unknown entity set: ${setName}` });
  }

  const row = entity.getById(parseKey(rawKey));
  if (!row) {
    return res.status(404).json({ error: `${setName} entity not found` });
  }

  return res.json({
    '@odata.context': `${req.baseUrl}/$metadata#${setName}/$entity`,
    ...row,
  });
});

router.patch(/^\/([^/]+)\(([^)]+)\)$/, (req, res) => {
  const setName = req.params[0];
  const rawKey = req.params[1];
  const entity = getEntitySet(setName);

  if (!entity) {
    return res.status(404).json({ error: `Unknown entity set: ${setName}` });
  }

  const updated = entity.update(parseKey(rawKey), req.body || {});
  if (!updated) {
    return res.status(404).json({ error: `${setName} entity not found` });
  }

  return res.json({
    '@odata.context': `${req.baseUrl}/$metadata#${setName}/$entity`,
    ...updated,
  });
});

router.put(/^\/([^/]+)\(([^)]+)\)$/, (req, res) => {
  const setName = req.params[0];
  const rawKey = req.params[1];
  const entity = getEntitySet(setName);

  if (!entity) {
    return res.status(404).json({ error: `Unknown entity set: ${setName}` });
  }

  const updated = entity.update(parseKey(rawKey), req.body || {});
  if (!updated) {
    return res.status(404).json({ error: `${setName} entity not found` });
  }

  return res.json({
    '@odata.context': `${req.baseUrl}/$metadata#${setName}/$entity`,
    ...updated,
  });
});

router.delete(/^\/([^/]+)\(([^)]+)\)$/, (req, res) => {
  const setName = req.params[0];
  const rawKey = req.params[1];
  const entity = getEntitySet(setName);

  if (!entity) {
    return res.status(404).json({ error: `Unknown entity set: ${setName}` });
  }

  const deleted = entity.delete(parseKey(rawKey));
  if (!deleted) {
    return res.status(404).json({ error: `${setName} entity not found` });
  }

  return res.status(204).send();
});

module.exports = router;
