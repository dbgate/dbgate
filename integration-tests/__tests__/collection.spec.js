const requireEngineDriver = require('dbgate-api/src/utility/requireEngineDriver');
const crypto = require('crypto');
const stream = require('stream');
const { mongoDbEngine, dynamoDbEngine } = require('../engines');
const tableWriter = require('dbgate-api/src/shell/tableWriter');
const tableReader = require('dbgate-api/src/shell/tableReader');
const copyStream = require('dbgate-api/src/shell/copyStream');

function randomCollectionName() {
    return 'test_' + crypto.randomBytes(6).toString('hex');
}

const documentEngines = [
    { label: 'MongoDB', engine: mongoDbEngine },
    { label: 'DynamoDB', engine: dynamoDbEngine },
];

async function connectEngine(engine) {
    const driver = requireEngineDriver(engine.connection);
    const conn = await driver.connect(engine.connection);
    return { driver, conn };
}

async function createCollection(driver, conn, collectionName, engine) {
    if (engine.connection.engine.startsWith('dynamodb')) {
        await driver.operation(conn, {
            type: 'createCollection',
            collection: {
                name: collectionName,
                partitionKey: '_id',
                partitionKeyType: 'S',
            },
        });
    } else {
        await driver.operation(conn, {
            type: 'createCollection',
            collection: { name: collectionName },
        });
    }
}

async function dropCollection(driver, conn, collectionName) {
    try {
        await driver.operation(conn, {
            type: 'dropCollection',
            collection: collectionName,
        });
    } catch (e) {
        // Ignore errors when dropping (collection may not exist)
    }
}

async function insertDocument(driver, conn, collectionName, doc) {
    return driver.updateCollection(conn, {
        inserts: [{ pureName: collectionName, document: {}, fields: doc }],
        updates: [],
        deletes: [],
    });
}

async function readAll(driver, conn, collectionName) {
    return driver.readCollection(conn, { pureName: collectionName, limit: 1000 });
}

async function updateDocument(driver, conn, collectionName, condition, fields) {
    return driver.updateCollection(conn, {
        inserts: [],
        updates: [{ pureName: collectionName, condition, fields }],
        deletes: [],
    });
}

async function deleteDocument(driver, conn, collectionName, condition) {
    return driver.updateCollection(conn, {
        inserts: [],
        updates: [],
        deletes: [{ pureName: collectionName, condition }],
    });
}

describe('Collection CRUD', () => {
    describe.each(documentEngines.map(e => [e.label, e.engine]))('%s', (label, engine) => {
        let driver;
        let conn;
        let collectionName;

        beforeAll(async () => {
            const result = await connectEngine(engine);
            driver = result.driver;
            conn = result.conn;
        });

        afterAll(async () => {
            if (conn) {
                await driver.close(conn);
            }
        });

        beforeEach(async () => {
            collectionName = randomCollectionName();
            await createCollection(driver, conn, collectionName, engine);
        });

        afterEach(async () => {
            await dropCollection(driver, conn, collectionName);
        });

        // ---- INSERT ----

        test('insert a single document', async () => {
            const res = await insertDocument(driver, conn, collectionName, {
                _id: 'doc1',
                name: 'Alice',
                age: 30,
            });
            expect(res.inserted.length).toBe(1);

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(1);
            expect(all.rows[0].name).toBe('Alice');
            expect(all.rows[0].age).toBe(30);
        });

        test('insert multiple documents', async () => {
            await insertDocument(driver, conn, collectionName, { _id: 'a1', name: 'Alice' });
            await insertDocument(driver, conn, collectionName, { _id: 'a2', name: 'Bob' });
            await insertDocument(driver, conn, collectionName, { _id: 'a3', name: 'Charlie' });

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(3);
            const names = all.rows.map(r => r.name).sort();
            expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
        });

        test('insert document with nested object', async () => {
            await insertDocument(driver, conn, collectionName, {
                _id: 'nested1',
                name: 'Alice',
                address: { city: 'Prague', zip: '11000' },
            });

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(1);
            expect(all.rows[0].address.city).toBe('Prague');
            expect(all.rows[0].address.zip).toBe('11000');
        });

        // ---- READ ----

        test('read from empty collection returns no rows', async () => {
            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(0);
        });

        test('read with limit', async () => {
            await insertDocument(driver, conn, collectionName, { _id: 'l1', name: 'A' });
            await insertDocument(driver, conn, collectionName, { _id: 'l2', name: 'B' });
            await insertDocument(driver, conn, collectionName, { _id: 'l3', name: 'C' });

            const limited = await driver.readCollection(conn, {
                pureName: collectionName,
                limit: 2,
            });
            expect(limited.rows.length).toBe(2);
        });

        test('count documents', async () => {
            await insertDocument(driver, conn, collectionName, { _id: 'c1', name: 'A' });
            await insertDocument(driver, conn, collectionName, { _id: 'c2', name: 'B' });

            const result = await driver.readCollection(conn, {
                pureName: collectionName,
                countDocuments: true,
            });
            expect(result.count).toBe(2);
        });

        test('count documents on empty collection returns zero', async () => {
            const result = await driver.readCollection(conn, {
                pureName: collectionName,
                countDocuments: true,
            });
            expect(result.count).toBe(0);
        });

        // ---- UPDATE ----

        test('update an existing document', async () => {
            await insertDocument(driver, conn, collectionName, { _id: 'u1', name: 'Alice', age: 25 });

            const res = await updateDocument(driver, conn, collectionName, { _id: 'u1' }, { name: 'Alice Updated' });
            expect(res.errorMessage).toBeUndefined();

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(1);
            expect(all.rows[0].name).toBe('Alice Updated');
        });

        test('update does not create new document', async () => {
            await insertDocument(driver, conn, collectionName, { _id: 'u2', name: 'Bob' });

            await updateDocument(driver, conn, collectionName, { _id: 'nonexistent' }, { name: 'Ghost' });

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(1);
            expect(all.rows[0].name).toBe('Bob');
        });

        test('update only specified fields', async () => {
            await insertDocument(driver, conn, collectionName, { _id: 'u3', name: 'Carol', age: 40, city: 'London' });

            await updateDocument(driver, conn, collectionName, { _id: 'u3' }, { age: 41 });

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(1);
            expect(all.rows[0].name).toBe('Carol');
            expect(all.rows[0].age).toBe(41);
            expect(all.rows[0].city).toBe('London');
        });

        // ---- DELETE ----

        test('delete an existing document', async () => {
            await insertDocument(driver, conn, collectionName, { _id: 'd1', name: 'Alice' });
            await insertDocument(driver, conn, collectionName, { _id: 'd2', name: 'Bob' });

            const res = await deleteDocument(driver, conn, collectionName, { _id: 'd1' });
            expect(res.errorMessage).toBeUndefined();

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(1);
            expect(all.rows[0].name).toBe('Bob');
        });

        test('delete non-existing document does not affect collection', async () => {
            await insertDocument(driver, conn, collectionName, { _id: 'dx1', name: 'Alice' });

            await deleteDocument(driver, conn, collectionName, { _id: 'nonexistent' });

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(1);
            expect(all.rows[0].name).toBe('Alice');
        });

        test('delete all documents leaves empty collection', async () => {
            await insertDocument(driver, conn, collectionName, { _id: 'da1', name: 'A' });
            await insertDocument(driver, conn, collectionName, { _id: 'da2', name: 'B' });

            await deleteDocument(driver, conn, collectionName, { _id: 'da1' });
            await deleteDocument(driver, conn, collectionName, { _id: 'da2' });

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(0);
        });

        // ---- EDGE CASES ----

        test('insert and read document with empty string field', async () => {
            await insertDocument(driver, conn, collectionName, { _id: 'e1', name: '', value: 'test' });

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(1);
            expect(all.rows[0].name).toBe('');
            expect(all.rows[0].value).toBe('test');
        });

        test('insert and read document with numeric values', async () => {
            await insertDocument(driver, conn, collectionName, {
                _id: 'n1',
                intVal: 42,
                floatVal: 3.14,
                zero: 0,
                negative: -10,
            });

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(1);
            expect(all.rows[0].intVal).toBe(42);
            expect(all.rows[0].floatVal).toBeCloseTo(3.14);
            expect(all.rows[0].zero).toBe(0);
            expect(all.rows[0].negative).toBe(-10);
        });

        test('insert and read document with boolean values', async () => {
            await insertDocument(driver, conn, collectionName, {
                _id: 'b1',
                active: true,
                deleted: false,
            });

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(1);
            expect(all.rows[0].active).toBe(true);
            expect(all.rows[0].deleted).toBe(false);
        });

        test('reading non-existing collection returns error or empty', async () => {
            const result = await driver.readCollection(conn, {
                pureName: 'nonexistent_collection_' + crypto.randomBytes(4).toString('hex'),
                limit: 10,
            });
            // Depending on the driver, this may return an error or empty rows
            if (result.errorMessage) {
                expect(typeof result.errorMessage).toBe('string');
            } else {
                expect(result.rows.length).toBe(0);
            }
        });

        test('replace full document via update with document field', async () => {
            await insertDocument(driver, conn, collectionName, { _id: 'r1', name: 'Original', extra: 'data' });

            await driver.updateCollection(conn, {
                inserts: [],
                updates: [
                    {
                        pureName: collectionName,
                        condition: { _id: 'r1' },
                        document: { _id: 'r1', name: 'Replaced' },
                        fields: {},
                    },
                ],
                deletes: [],
            });

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(1);
            expect(all.rows[0].name).toBe('Replaced');
        });

        test('insert then update then delete lifecycle', async () => {
            // Insert
            await insertDocument(driver, conn, collectionName, { _id: 'life1', name: 'Lifecycle', status: 'created' });
            let all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(1);
            expect(all.rows[0].status).toBe('created');

            // Update
            await updateDocument(driver, conn, collectionName, { _id: 'life1' }, { status: 'updated' });
            all = await readAll(driver, conn, collectionName);
            expect(all.rows[0].status).toBe('updated');

            // Delete
            await deleteDocument(driver, conn, collectionName, { _id: 'life1' });
            all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(0);
        });
    });
});

function createDocumentImportStream(documents) {
    const pass = new stream.PassThrough({ objectMode: true });
    pass.write({ __isStreamHeader: true, __isDynamicStructure: true });
    for (const doc of documents) {
        pass.write(doc);
    }
    pass.end();
    return pass;
}

function createExportStream() {
    const writable = new stream.Writable({ objectMode: true });
    writable.resultArray = [];
    writable._write = (chunk, encoding, callback) => {
        writable.resultArray.push(chunk);
        callback();
    };
    return writable;
}

describe('Collection Import/Export', () => {
    describe.each(documentEngines.map(e => [e.label, e.engine]))('%s', (label, engine) => {
        let driver;
        let conn;
        let collectionName;

        beforeAll(async () => {
            const result = await connectEngine(engine);
            driver = result.driver;
            conn = result.conn;
        });

        afterAll(async () => {
            if (conn) {
                await driver.close(conn);
            }
        });

        beforeEach(async () => {
            collectionName = randomCollectionName();
            await createCollection(driver, conn, collectionName, engine);
        });

        afterEach(async () => {
            await dropCollection(driver, conn, collectionName);
        });

        test('import documents via stream', async () => {
            const documents = [
                { _id: 'imp1', name: 'Alice', age: 30 },
                { _id: 'imp2', name: 'Bob', age: 25 },
                { _id: 'imp3', name: 'Charlie', age: 35 },
            ];

            const reader = createDocumentImportStream(documents);
            const writer = await tableWriter({
                systemConnection: conn,
                driver,
                pureName: collectionName,
                createIfNotExists: true,
            });
            await copyStream(reader, writer);

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(3);
            const names = all.rows.map(r => r.name).sort();
            expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
        });

        test('export documents via stream', async () => {
            await insertDocument(driver, conn, collectionName, { _id: 'exp1', name: 'Alice', city: 'Prague' });
            await insertDocument(driver, conn, collectionName, { _id: 'exp2', name: 'Bob', city: 'Vienna' });
            await insertDocument(driver, conn, collectionName, { _id: 'exp3', name: 'Charlie', city: 'Berlin' });

            const reader = await tableReader({
                systemConnection: conn,
                driver,
                pureName: collectionName,
            });
            const writer = createExportStream();
            await copyStream(reader, writer);

            const rows = writer.resultArray.filter(x => !x.__isStreamHeader);
            expect(rows.length).toBe(3);
            const names = rows.map(r => r.name).sort();
            expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
        });

        test('import then export round-trip', async () => {
            const documents = [
                { _id: 'rt1', name: 'Alice', value: 100 },
                { _id: 'rt2', name: 'Bob', value: 200 },
                { _id: 'rt3', name: 'Charlie', value: 300 },
                { _id: 'rt4', name: 'Diana', value: 400 },
            ];

            // Import
            const importReader = createDocumentImportStream(documents);
            const importWriter = await tableWriter({
                systemConnection: conn,
                driver,
                pureName: collectionName,
                createIfNotExists: true,
            });
            await copyStream(importReader, importWriter);

            // Export
            const exportReader = await tableReader({
                systemConnection: conn,
                driver,
                pureName: collectionName,
            });
            const exportWriter = createExportStream();
            await copyStream(exportReader, exportWriter);

            const rows = exportWriter.resultArray.filter(x => !x.__isStreamHeader);
            expect(rows.length).toBe(4);

            const sortedRows = rows.sort((a, b) => a._id.localeCompare(b._id));
            for (const doc of documents) {
                const found = sortedRows.find(r => r._id === doc._id);
                expect(found).toBeDefined();
                expect(found.name).toBe(doc.name);
                expect(found.value).toBe(doc.value);
            }
        });

        test('import documents with nested objects', async () => {
            const documents = [
                { _id: 'nest1', name: 'Alice', address: { city: 'Prague', zip: '11000' } },
                { _id: 'nest2', name: 'Bob', address: { city: 'Vienna', zip: '1010' } },
            ];

            const reader = createDocumentImportStream(documents);
            const writer = await tableWriter({
                systemConnection: conn,
                driver,
                pureName: collectionName,
                createIfNotExists: true,
            });
            await copyStream(reader, writer);

            const all = await readAll(driver, conn, collectionName);
            expect(all.rows.length).toBe(2);

            const alice = all.rows.find(r => r.name === 'Alice');
            expect(alice.address.city).toBe('Prague');
            expect(alice.address.zip).toBe('11000');
        });

        test('import many documents', async () => {
            const documents = [];
            for (let i = 0; i < 150; i++) {
                documents.push({ _id: `many${i}`, name: `Name${i}`, index: i });
            }

            const reader = createDocumentImportStream(documents);
            const writer = await tableWriter({
                systemConnection: conn,
                driver,
                pureName: collectionName,
                createIfNotExists: true,
            });
            await copyStream(reader, writer);

            const result = await driver.readCollection(conn, {
                pureName: collectionName,
                countDocuments: true,
            });
            expect(result.count).toBe(150);
        });

        test('export empty collection returns no data rows', async () => {
            const reader = await tableReader({
                systemConnection: conn,
                driver,
                pureName: collectionName,
            });
            const writer = createExportStream();
            await copyStream(reader, writer);

            const rows = writer.resultArray.filter(x => !x.__isStreamHeader);
            expect(rows.length).toBe(0);
        });
    });
});
