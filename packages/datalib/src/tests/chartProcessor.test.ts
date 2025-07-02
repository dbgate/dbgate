import exp from 'constants';
import { ChartProcessor } from '../chartProcessor';
import { getChartDebugPrint } from '../chartTools';

const DS1 = [
  {
    timestamp: '2023-10-01T12:00:00Z',
    value: 42.5,
    category: 'B',
    related_id: 12,
  },
  {
    timestamp: '2023-10-02T10:05:00Z',
    value: 12,
    category: 'A',
    related_id: 13,
  },
  {
    timestamp: '2023-10-03T07:10:00Z',
    value: 57,
    category: 'A',
    related_id: 5,
  },
  {
    timestamp: '2024-08-03T07:10:00Z',
    value: 33,
    category: 'B',
    related_id: 22,
  },
];

const DS2 = [
  {
    ts1: '2023-10-01T12:00:00Z',
    ts2: '2024-10-01T12:00:00Z',
    dummy1: 1,
    dummy2: 1,
    dummy3: 1,
    dummy4: 1,
    dummy5: 1,
    dummy6: 1,
    dummy7: 1,
    dummy8: 1,
    dummy9: 1,
    dummy10: 1,
    price1: '11',
    price2: '22',
  },
  {
    ts1: '2023-10-02T10:05:00Z',
    ts2: '2024-10-02T10:05:00Z',
    price1: '12',
    price2: '23',
  },
  {
    ts1: '2023-10-03T07:10:00Z',
    ts2: '2024-10-03T07:10:00Z',
    price1: '13',
    price2: '24',
  },
  {
    ts1: '2023-11-04T12:00:00Z',
    ts2: '2024-11-04T12:00:00Z',
    price1: 1,
    price2: 2,
  },
];

const DS3 = [
  {
    timestamp: '2023-10-01T12:00:00Z',
    value: 42.5,
    bitval: true,
  },
  {
    timestamp: '2023-10-02T10:05:00Z',
    value: 12,
    bitval: false,
  },
  {
    timestamp: '2023-10-03T07:10:00Z',
    value: 57,
    bitval: null,
  },
];

const DS4 = [
  {
    object_id: 710293590,
    ObjectName: 'Journal',
    Total_Reserved_kb: '68696',
    RowsCount: '405452',
  },
  {
    object_id: 182291709,
    ObjectName: 'Employee',
    Total_Reserved_kb: '732008',
    RowsCount: '1980067',
  },
  {
    object_id: 23432525,
    ObjectName: 'User',
    Total_Reserved_kb: '325352',
    RowsCount: '2233',
  },
  {
    object_id: 4985159,
    ObjectName: 'Project',
    Total_Reserved_kb: '293523',
    RowsCount: '1122',
  },
];

describe('Chart processor', () => {
  test('Simple by day test, autodetected', () => {
    const processor = new ChartProcessor();
    processor.addRows(...DS1.slice(0, 3));
    processor.finalize();
    expect(processor.charts.length).toEqual(3);
    const chart = processor.charts.find(x => !x.definition.groupingField && x.definition.xdef.field === 'timestamp');
    expect(chart.definition.xdef.transformFunction).toEqual('date:day');
    expect(chart.definition.ydefs).toEqual([
      expect.objectContaining({
        field: 'value',
      }),
    ]);
    expect(chart.bucketKeysOrdered).toEqual(['2023-10-01', '2023-10-02', '2023-10-03']);
  });
  test('By month grouped, autedetected', () => {
    const processor = new ChartProcessor();
    processor.addRows(...DS1.slice(0, 4));
    processor.finalize();
    expect(processor.charts.length).toEqual(3);
    const chart = processor.charts.find(x => !x.definition.groupingField && x.definition.xdef.field === 'timestamp');
    expect(chart.definition.xdef.transformFunction).toEqual('date:month');
    expect(chart.bucketKeysOrdered).toEqual([
      '2023-10',
      '2023-11',
      '2023-12',
      '2024-01',
      '2024-02',
      '2024-03',
      '2024-04',
      '2024-05',
      '2024-06',
      '2024-07',
      '2024-08',
    ]);
  });
  test('Detect columns', () => {
    const processor = new ChartProcessor();
    processor.autoDetectCharts = false;
    processor.addRows(...DS1);
    processor.finalize();
    expect(processor.charts.length).toEqual(0);
    expect(processor.availableColumns).toEqual([
      expect.objectContaining({
        field: 'timestamp',
      }),
      expect.objectContaining({
        field: 'value',
      }),
      expect.objectContaining({
        field: 'category',
      }),
      expect.objectContaining({
        field: 'related_id',
      }),
    ]);
  });
  test('Explicit definition', () => {
    const processor = new ChartProcessor([
      {
        chartType: 'pie',
        xdef: {
          field: 'category',
          transformFunction: 'identity',
          sortOrder: 'natural',
        },
        ydefs: [
          {
            field: 'related_id',
            aggregateFunction: 'sum',
          },
        ],
      },
    ]);
    processor.addRows(...DS1);
    processor.finalize();
    expect(processor.charts.length).toEqual(1);
    const chart = processor.charts[0];
    expect(chart.definition.xdef.transformFunction).toEqual('identity');
    expect(chart.bucketKeysOrdered).toEqual(['B', 'A']);
    expect(chart.buckets).toEqual({
      B: { related_id: 34 },
      A: { related_id: 18 },
    });
  });

  test('Two data sets with different date columns', () => {
    const processor = new ChartProcessor();
    processor.addRows(...DS2);
    processor.finalize();
    expect(processor.charts.length).toEqual(2);
    expect(processor.charts[0].definition).toEqual(
      expect.objectContaining({
        xdef: expect.objectContaining({
          field: 'ts1',
          transformFunction: 'date:day',
        }),
        ydefs: [
          expect.objectContaining({
            field: 'price1',
            aggregateFunction: 'sum',
          }),
          expect.objectContaining({
            field: 'price2',
            aggregateFunction: 'sum',
          }),
        ],
      })
    );
    expect(processor.charts[1].definition).toEqual(
      expect.objectContaining({
        xdef: expect.objectContaining({
          field: 'ts2',
          transformFunction: 'date:day',
        }),
        ydefs: [
          expect.objectContaining({
            field: 'price1',
            aggregateFunction: 'sum',
          }),
          expect.objectContaining({
            field: 'price2',
            aggregateFunction: 'sum',
          }),
        ],
      })
    );
  });

  test('Exclude boolean fields in autodetected', () => {
    const processor = new ChartProcessor();
    processor.addRows(...DS3);
    processor.finalize();
    expect(processor.charts.length).toEqual(1);
    const chart = processor.charts[0];
    expect(chart.definition.xdef.transformFunction).toEqual('date:day');
    expect(chart.definition.ydefs).toEqual([
      expect.objectContaining({
        field: 'value',
      }),
    ]);
  });

  test('Added field manual from GUI', () => {
    const processor = new ChartProcessor([
      {
        chartType: 'bar',
        xdef: {
          field: 'object_id',
          transformFunction: 'identity',
        },
        ydefs: [
          {
            field: 'object_id',
            aggregateFunction: 'sum',
          },
        ],
      },
    ]);
    processor.addRows(...DS4);
    processor.finalize();
    expect(processor.charts.length).toEqual(1);
    const chart = processor.charts[0];
    expect(chart.definition.xdef.transformFunction).toEqual('identity');
    expect(chart.definition.ydefs).toEqual([
      expect.objectContaining({
        field: 'object_id',
        aggregateFunction: 'sum',
      }),
    ]);
  });

  const PieMainTestData = [
    ['natural', ['Journal', 'Employee', 'User', 'Project']],
    ['ascKeys', ['Employee', 'Journal', 'Project', 'User']],
    ['descKeys', ['User', 'Project', 'Journal', 'Employee']],
    ['ascValues', ['Project', 'User', 'Journal', 'Employee']],
    ['descValues', ['Employee', 'Journal', 'User', 'Project']],
  ];

  test.each(PieMainTestData)('Pie chart - used space for DB objects (%s)', (sortOrder, expectedOrder) => {
    const processor = new ChartProcessor([
      {
        chartType: 'bar',
        xdef: {
          field: 'ObjectName',
          transformFunction: 'identity',
          sortOrder: sortOrder as any,
        },
        ydefs: [
          {
            field: 'RowsCount',
            aggregateFunction: 'sum',
          },
        ],
      },
    ]);
    processor.addRows(...DS4);
    processor.finalize();
    expect(processor.charts.length).toEqual(1);
    const chart = processor.charts[0];
    expect(chart.bucketKeysOrdered).toEqual(expectedOrder);
    expect(chart.buckets).toEqual({
      Employee: { RowsCount: 1980067 },
      Journal: { RowsCount: 405452 },
      Project: { RowsCount: 1122 },
      User: { RowsCount: 2233 },
    });
  });

  const PieOtherTestData = [
    [
      'ratio',
      0.1,
      5,
      ['Employee', 'Journal', 'Other'],
      {
        Employee: { RowsCount: 1980067 },
        Journal: { RowsCount: 405452 },
        Other: { RowsCount: 3355 },
      },
    ],
    [
      'count',
      0,
      1,
      ['Employee', 'Other'],
      {
        Employee: { RowsCount: 1980067 },
        Other: { RowsCount: 408807 },
      },
    ],
  ];

  test.each(PieOtherTestData)(
    'Pie limit test - %s',
    (_description, pieRatioLimit, pieCountLimit, expectedOrder, expectedBuckets) => {
      const processor = new ChartProcessor([
        {
          chartType: 'pie',
          pieRatioLimit: pieRatioLimit as number,
          pieCountLimit: pieCountLimit as number,
          xdef: {
            field: 'ObjectName',
            transformFunction: 'identity',
          },
          ydefs: [
            {
              field: 'RowsCount',
              aggregateFunction: 'sum',
            },
          ],
        },
      ]);
      processor.addRows(...DS4);
      processor.finalize();
      expect(processor.charts.length).toEqual(1);
      const chart = processor.charts[0];
      expect(chart.bucketKeysOrdered).toEqual(expectedOrder);
      expect(chart.buckets).toEqual(expectedBuckets);
    }
  );

  test('Incorrect chart definition', () => {
    const processor = new ChartProcessor([
      {
        chartType: 'bar',
        xdef: {
          field: 'category',
          transformFunction: 'date:day',
        },
        ydefs: [],
      },
    ]);
    processor.addRows(...DS1.slice(0, 3));
    processor.finalize();

    expect(processor.charts.length).toEqual(1);
    const chart = processor.charts[0];
    expect(chart.definition.xdef.transformFunction).toEqual('date:day');

    // console.log(getChartDebugPrint(processor.charts[0]));

    // expect(chart.definition.xdef.transformFunction).toEqual('date:day');
    // expect(chart.definition.ydefs).toEqual([
    //   expect.objectContaining({
    //     field: 'value',
    //   }),
    // ]);
    // expect(chart.bucketKeysOrdered).toEqual(['2023-10-01', '2023-10-02', '2023-10-03']);
  });
});
