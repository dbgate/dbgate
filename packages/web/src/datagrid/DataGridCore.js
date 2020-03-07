import React from 'react';
import useFetch from '../utility/useFetch';
import styled from 'styled-components';
import theme from '../theme';
import { HorizontalScrollBar, VerticalScrollBar } from './ScrollBars';
import useDimensions from '../utility/useDimensions';
import { SeriesSizes } from './SeriesSizes';
import axios from '../utility/axios';
import ColumnLabel from './ColumnLabel';

const GridContainer = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
`;

const Table = styled.table`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 20px;
  right: 20px;
  overflow: scroll;
  border-collapse: collapse;
`;
const TableHead = styled.thead`
  // display: block;
  // width: 300px;
`;
const TableBody = styled.tbody`
  // display: block;
  // overflow: auto;
  // height: 100px;
`;
const TableHeaderRow = styled.tr`
  // height: 35px;
`;
const TableBodyRow = styled.tr`
  // height: 35px;
  background-color: #ffffff;
  &:nth-child(6n + 4) {
    background-color: #ebebeb;
  }
  &:nth-child(6n + 7) {
    background-color: #ebf5ff;
  }
`;
const TableHeaderCell = styled.td`
  // font-weight: bold;
  border: 1px solid #c0c0c0;
  // border-collapse: collapse;
  text-align: left;
  padding: 2px;
  background-color: #f6f7f9;
  overflow: hidden;
`;
const TableBodyCell = styled.td`
  font-weight: normal;
  border: 1px solid #c0c0c0;
  // border-collapse: collapse;
  padding: 2px;
  white-space: nowrap;
  overflow: hidden;
`;

/** @param props {import('./types').DataGridProps} */
export default function DataGridCore(props) {
  const { conid, database, display } = props;
  const columns = display.columns;

  // console.log(`GRID, conid=${conid}, database=${database}, sql=${sql}`);
  const [loadProps, setLoadProps] = React.useState({
    isLoading: false,
    loadedRows: [],
    isLoadedAll: false,
    loadedTime: new Date().getTime(),
  });
  const { isLoading, loadedRows, isLoadedAll, loadedTime } = loadProps;

  const loadedTimeRef = React.useRef(0);

  const loadNextData = async () => {
    if (isLoading) return;
    setLoadProps({
      ...loadProps,
      isLoading: true,
    });
    const loadStart = new Date().getTime();
    loadedTimeRef.current = loadStart;

    const sql = display.getPageQuery(loadedRows.length, 100);

    let response = await axios.request({
      url: 'database-connections/query-data',
      method: 'post',
      params: {
        conid,
        database,
      },
      data: { sql },
    });
    if (loadedTimeRef.current !== loadStart) {
      // new load was dispatched
      return;
    }
    // if (!_.isArray(nextRows)) {
    //   console.log('Error loading data from server', nextRows);
    //   nextRows = [];
    // }
    const { rows: nextRows } = response.data;
    // console.log('nextRows', nextRows);
    const loadedInfo = {
      loadedRows: [...loadedRows, ...nextRows],
      loadedTime,
      isLoadedAll: nextRows.length === 0,
    };
    setLoadProps({
      ...loadProps,
      isLoading: false,
      ...loadedInfo,
    });
  };

  // const data = useFetch({
  //   url: 'database-connections/query-data',
  //   method: 'post',
  //   params: {
  //     conid,
  //     database,
  //   },
  //   data: { sql },
  // });
  // const { rows, columns } = data || {};
  const [firstVisibleRowScrollIndex, setFirstVisibleRowScrollIndex] = React.useState(0);
  const [firstVisibleColumnScrollIndex, setFirstVisibleColumnScrollIndex] = React.useState(0);

  const [headerRowRef, { height: rowHeight }] = useDimensions();
  const [tableBodyRef] = useDimensions();
  const [containerRef, { height: containerHeight, width: containerWidth }] = useDimensions();

  const columnSizes = React.useMemo(() => countColumnSizes(), [loadedRows, containerWidth, display]);

  // console.log('containerWidth', containerWidth);

  const gridScrollAreaHeight = containerHeight - 2 * rowHeight;
  const gridScrollAreaWidth = containerWidth - columnSizes.frozenSize;

  const visibleRowCountUpperBound = Math.ceil(gridScrollAreaHeight / Math.floor(rowHeight));
  const visibleRowCountLowerBound = Math.floor(gridScrollAreaHeight / Math.ceil(rowHeight));
  //   const visibleRowCountUpperBound = 20;
  //   const visibleRowCountLowerBound = 20;

  React.useEffect(() => {
    if (!isLoadedAll && firstVisibleRowScrollIndex + visibleRowCountUpperBound >= loadedRows.length) {
      loadNextData();
    }
  });

  if (!loadedRows || !columns) return null;
  const rowCountNewIncluded = loadedRows.length;

  const handleRowScroll = value => {
    setFirstVisibleRowScrollIndex(value);
  };

  const handleColumnScroll = value => {
    setFirstVisibleColumnScrollIndex(value);
  };

  function countColumnSizes() {
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');

    //return this.context.measureText(txt).width;
    const columnSizes = new SeriesSizes();
    if (!loadedRows || !columns) return columnSizes;

    // console.log('countColumnSizes', loadedRows.length, containerWidth);

    columnSizes.maxSize = (containerWidth * 2) / 3;
    columnSizes.count = columns.length;

    // columnSizes.setExtraordinaryIndexes(this.getHiddenColumnIndexes(), this.getFrozenColumnIndexes());
    // console.log('display.hiddenColumnIndexes', display.hiddenColumnIndexes)

    columnSizes.setExtraordinaryIndexes(display.hiddenColumnIndexes, []);

    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      //this.columnSizes.PutSizeOverride(col, this.columns[col].Name.length * 8);
      const column = columns[colIndex];

      // if (column.columnClientObject != null && column.columnClientObject.notNull) context.font = "bold 14px Helvetica";
      // else context.font = "14px Helvetica";
      context.font = 'bold 14px Helvetica';

      let text = column.headerText;
      let headerWidth = context.measureText(text).width + 32;

      // if (column.columnClientObject != null && column.columnClientObject.icon != null) headerWidth += 16;
      // if (this.getFilterOnColumn(column.uniquePath)) headerWidth += 16;
      // if (this.getSortOrder(column.uniquePath)) headerWidth += 16;

      columnSizes.putSizeOverride(colIndex, headerWidth);
    }

    // let headerWidth = this.rowHeaderWidthDefault;
    // if (this.rowCount) headerWidth = context.measureText(this.rowCount.toString()).width + 8;
    // this.rowHeaderWidth = this.rowHeaderWidthDefault;
    // if (headerWidth > this.rowHeaderWidth) this.rowHeaderWidth = headerWidth;

    context.font = '14px Helvetica';
    for (let row of loadedRows) {
      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        let uqName = columns[colIndex].uniqueName;
        let text = row[uqName];
        let width = context.measureText(text).width + 8;
        // console.log('colName', colName, text, width);
        columnSizes.putSizeOverride(colIndex, width);
        // let colName = this.columns[colIndex].uniquePath;
        // let text: string = row[colName].gridText;
        // let width = context.measureText(text).width + 8;
        // if (row[colName].dataPrefix) width += context.measureText(row[colName].dataPrefix).width + 3;
        // this.columnSizes.putSizeOverride(colIndex, width);
      }
    }

    // for (let modelIndex = 0; modelIndex < this.columns.length; modelIndex++) {
    //     let width = getHashValue(this.widthHashPrefix + this.columns[modelIndex].uniquePath);
    //     if (width) this.columnSizes.putSizeOverride(modelIndex, _.toNumber(width), true);
    // }

    columnSizes.buildIndex();
    return columnSizes;
  }

  //   console.log('visibleRowCountUpperBound', visibleRowCountUpperBound);
  //   console.log('gridScrollAreaHeight', gridScrollAreaHeight);
  //   console.log('containerHeight', containerHeight);

  const visibleColumnCount = columnSizes.getVisibleScrollCount(firstVisibleColumnScrollIndex, gridScrollAreaWidth);
  // console.log('visibleColumnCount', visibleColumnCount);

  const visibleRealColumnIndexes = [];
  const modelIndexes = {};
  /** @type {(import('@dbgate/datalib').DisplayColumn & {widthPx: string})[]} */
  const realColumns = [];

  // frozen columns
  for (let colIndex = 0; colIndex < columnSizes.frozenCount; colIndex++) {
    visibleRealColumnIndexes.push(colIndex);
  }
  // scroll columns
  for (
    let colIndex = firstVisibleColumnScrollIndex;
    colIndex < firstVisibleColumnScrollIndex + visibleColumnCount;
    colIndex++
  ) {
    visibleRealColumnIndexes.push(colIndex + columnSizes.frozenCount);
  }

  // real columns
  for (let colIndex of visibleRealColumnIndexes) {
    let modelColumnIndex = columnSizes.realToModel(colIndex);
    modelIndexes[colIndex] = modelColumnIndex;

    let col = columns[modelColumnIndex];
    if (!col) continue;
    const widthNumber = columnSizes.getSizeByRealIndex(colIndex);
    realColumns.push({
      ...col,
      widthPx: `${widthNumber}px`,
    });
  }

  // console.log('visibleRealColumnIndexes', visibleRealColumnIndexes);

  return (
    <GridContainer ref={containerRef}>
      <Table>
        <TableHead>
          <TableHeaderRow ref={headerRowRef}>
            {realColumns.map(col => (
              <TableHeaderCell
                key={col.columnName}
                style={{ width: col.widthPx, minWidth: col.widthPx, maxWidth: col.widthPx }}
              >
                <ColumnLabel {...col} />
              </TableHeaderCell>
            ))}
          </TableHeaderRow>
        </TableHead>
        <TableBody ref={tableBodyRef}>
          {loadedRows
            .slice(firstVisibleRowScrollIndex, firstVisibleRowScrollIndex + visibleRowCountUpperBound)
            .map((row, index) => (
              <TableBodyRow key={firstVisibleRowScrollIndex + index}>
                {realColumns.map(col => (
                  <TableBodyCell
                    key={col.columnName}
                    style={{ width: col.widthPx, minWidth: col.widthPx, maxWidth: col.widthPx }}
                  >
                    {row[col.columnName]}
                  </TableBodyCell>
                ))}
              </TableBodyRow>
            ))}
        </TableBody>
      </Table>
      <HorizontalScrollBar
        minimum={0}
        maximum={columns.length - 1}
        viewportRatio={gridScrollAreaWidth / columnSizes.getVisibleScrollSizeSum()}
        onScroll={handleColumnScroll}
      />
      <VerticalScrollBar
        minimum={0}
        maximum={rowCountNewIncluded - visibleRowCountUpperBound + 2}
        onScroll={handleRowScroll}
        viewportRatio={visibleRowCountUpperBound / rowCountNewIncluded}
      />
    </GridContainer>
  );
}
