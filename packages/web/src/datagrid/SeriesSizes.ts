import _ from 'lodash';

export class SeriesSizeItem {
  public scrollIndex: number = -1;
  public modelIndex: number;
  public frozenIndex: number = -1;
  public size: number;
  public position: number;
  public get endPosition(): number {
    return this.position + this.size;
  }
}

export class SeriesSizes {
  private sizeOverridesByModelIndex: { [id: number]: number } = {};
  public count: number = 0;
  public defaultSize: number = 50;
  public maxSize: number = 1000;
  private hiddenAndFrozenModelIndexes: number[] = [];
  private frozenModelIndexes: number[] = [];
  private hiddenModelIndexes: number[] = [];
  private scrollItems: SeriesSizeItem[] = [];
  private positions: number[] = [];
  private scrollIndexes: number[] = [];
  private modelIndexes: number[] = [];
  private frozenItems: SeriesSizeItem[] = [];

  public get scrollCount(): number {
    return this.count - (this.hiddenAndFrozenModelIndexes != null ? this.hiddenAndFrozenModelIndexes.length : 0);
  }
  public get frozenCount(): number {
    return this.frozenModelIndexes != null ? this.frozenModelIndexes.length : 0;
  }
  public get frozenSize(): number {
    return _.sumBy(this.frozenItems, x => x.size);
  }
  public get realCount(): number {
    return this.frozenCount + this.scrollCount;
  }

  // public clear(): void {
  //     this.scrollItems = [];
  //     this.sizeOverridesByModelIndex = {};
  //     this.positions = [];
  //     this.scrollIndexes = [];
  //     this.frozenItems = [];
  //     this.hiddenAndFrozenModelIndexes = null;
  //     this.frozenModelIndexes = null;
  // }
  public putSizeOverride(modelIndex: number, size: number, sizeByUser = false): void {
    if (this.maxSize && size > this.maxSize && !sizeByUser) {
      size = this.maxSize;
    }

    let currentSize = this.sizeOverridesByModelIndex[modelIndex];
    if (sizeByUser || !currentSize || size > currentSize) {
      this.sizeOverridesByModelIndex[modelIndex] = size;
    }
    // if (!_.has(this.sizeOverridesByModelIndex, modelIndex))
    //     this.sizeOverridesByModelIndex[modelIndex] = size;
    // if (size > this.sizeOverridesByModelIndex[modelIndex])
    //     this.sizeOverridesByModelIndex[modelIndex] = size;
  }
  public buildIndex(): void {
    this.scrollItems = [];
    this.scrollIndexes = _.filter(
      _.map(_.range(this.count), x => this.modelToReal(x) - this.frozenCount),
      // _.map(this.intKeys(_.keys(this.sizeOverridesByModelIndex)), (x) => this.modelToReal(x) - this.frozenCount),
      x => x >= 0
    );
    this.scrollIndexes.sort((a, b) => a - b);
    let lastScrollIndex: number = -1;
    let lastEndPosition: number = 0;
    this.scrollIndexes.forEach(scrollIndex => {
      let modelIndex: number = this.realToModel(scrollIndex + this.frozenCount);
      let size: number = this.sizeOverridesByModelIndex[modelIndex];
      let item = new SeriesSizeItem();
      item.scrollIndex = scrollIndex;
      item.modelIndex = modelIndex;
      item.size = size;
      item.position = lastEndPosition + (scrollIndex - lastScrollIndex - 1) * this.defaultSize;
      this.scrollItems.push(item);
      lastScrollIndex = scrollIndex;
      lastEndPosition = item.endPosition;
    });
    this.positions = _.map(this.scrollItems, x => x.position);
    this.frozenItems = [];
    let lastpos: number = 0;
    for (let i: number = 0; i < this.frozenCount; i++) {
      let modelIndex: number = this.frozenModelIndexes[i];
      let size: number = this.getSizeByModelIndex(modelIndex);
      let item = new SeriesSizeItem();
      item.frozenIndex = i;
      item.modelIndex = modelIndex;
      item.size = size;
      item.position = lastpos;
      this.frozenItems.push(item);
      lastpos += size;
    }

    this.modelIndexes = _.range(0, this.count);
    // console.log('SeriesSize:build:this.modelIndexes-before', this.modelIndexes);
    // console.log('SeriesSize:build:this.hiddenAndFrozenModelIndexes', this.hiddenAndFrozenModelIndexes);
    if (this.hiddenAndFrozenModelIndexes) {
      this.modelIndexes = this.modelIndexes.filter(col => !this.hiddenAndFrozenModelIndexes.includes(col));
    }
    // console.log('SeriesSize:build:this.modelIndexes-result', this.modelIndexes);
  }

  public getScrollIndexOnPosition(position: number): number {
    let itemOrder: number = _.sortedIndex(this.positions, position);
    if (this.positions[itemOrder] == position) return itemOrder;
    if (itemOrder == 0) return Math.floor(position / this.defaultSize);
    if (position <= this.scrollItems[itemOrder - 1].endPosition) return this.scrollItems[itemOrder - 1].scrollIndex;
    return (
      Math.floor((position - this.scrollItems[itemOrder - 1].position) / this.defaultSize) +
      this.scrollItems[itemOrder - 1].scrollIndex
    );
  }
  public getFrozenIndexOnPosition(position: number): number {
    this.frozenItems.forEach(function (item) {
      if (position >= item.position && position <= item.endPosition) return item.frozenIndex;
    });
    return -1;
  }
  // public getSizeSum(startScrollIndex: number, endScrollIndex: number): number {
  //     let order1: number = _.sortedIndexOf(this.scrollIndexes, startScrollIndex);
  //     let order2: number = _.sortedIndexOf(this.scrollIndexes, endScrollIndex);
  //     let count: number = endScrollIndex - startScrollIndex;
  //     if (order1 < 0)
  //         order1 = ~order1;
  //     if (order2 < 0)
  //         order2 = ~order2;
  //     let result: number = 0;
  //     for (let i: number = order1; i <= order2; i++) {
  //         if (i < 0)
  //             continue;
  //         if (i >= this.scrollItems.length)
  //             continue;
  //         let item = this.scrollItems[i];
  //         if (item.scrollIndex < startScrollIndex)
  //             continue;
  //         if (item.scrollIndex >= endScrollIndex)
  //             continue;
  //         result += item.size;
  //         count--;
  //     }
  //     result += count * this.defaultSize;
  //     return result;
  // }
  public getSizeByModelIndex(modelIndex: number): number {
    if (_.has(this.sizeOverridesByModelIndex, modelIndex)) return this.sizeOverridesByModelIndex[modelIndex];
    return this.defaultSize;
  }
  public getSizeByScrollIndex(scrollIndex: number): number {
    return this.getSizeByRealIndex(scrollIndex + this.frozenCount);
  }
  public getSizeByRealIndex(realIndex: number): number {
    let modelIndex: number = this.realToModel(realIndex);
    return this.getSizeByModelIndex(modelIndex);
  }
  public removeSizeOverride(realIndex: number): void {
    let modelIndex: number = this.realToModel(realIndex);
    delete this.sizeOverridesByModelIndex[modelIndex];
  }
  public getScroll(sourceScrollIndex: number, targetScrollIndex: number): number {
    if (sourceScrollIndex < targetScrollIndex) {
      return -_.sum(
        _.map(_.range(sourceScrollIndex, targetScrollIndex - sourceScrollIndex), x => this.getSizeByScrollIndex(x))
      );
    } else {
      return _.sum(
        _.map(_.range(targetScrollIndex, sourceScrollIndex - targetScrollIndex), x => this.getSizeByScrollIndex(x))
      );
    }
  }
  public modelIndexIsInScrollArea(modelIndex: number): boolean {
    let realIndex = this.modelToReal(modelIndex);
    return realIndex >= this.frozenCount;
  }
  public getTotalScrollSizeSum(): number {
    let scrollSizeOverrides = _.map(
      _.filter(this.intKeys(this.sizeOverridesByModelIndex), x => this.modelIndexIsInScrollArea(x)),
      x => this.sizeOverridesByModelIndex[x]
    );
    return _.sum(scrollSizeOverrides) + (this.count - scrollSizeOverrides.length) * this.defaultSize;
  }
  public getVisibleScrollSizeSum(): number {
    let scrollSizeOverrides = _.map(
      _.filter(this.intKeys(this.sizeOverridesByModelIndex), x => !_.includes(this.hiddenAndFrozenModelIndexes, x)),
      x => this.sizeOverridesByModelIndex[x]
    );
    return (
      _.sum(scrollSizeOverrides) +
      (this.count - this.hiddenModelIndexes.length - scrollSizeOverrides.length) * this.defaultSize
    );
  }
  private intKeys(value): number[] {
    return _.keys(value).map(x => _.parseInt(x));
  }
  public getPositionByRealIndex(realIndex: number): number {
    if (realIndex < 0) return 0;
    if (realIndex < this.frozenCount) return this.frozenItems[realIndex].position;
    return this.getPositionByScrollIndex(realIndex - this.frozenCount);
  }
  public getPositionByScrollIndex(scrollIndex: number): number {
    let order: number = _.sortedIndex(this.scrollIndexes, scrollIndex);
    if (this.scrollIndexes[order] == scrollIndex) return this.scrollItems[order].position;
    order--;
    if (order < 0) return scrollIndex * this.defaultSize;
    return (
      this.scrollItems[order].endPosition + (scrollIndex - this.scrollItems[order].scrollIndex - 1) * this.defaultSize
    );
  }
  public getVisibleScrollCount(firstVisibleIndex: number, viewportSize: number): number {
    let res: number = 0;
    let index: number = firstVisibleIndex;
    let count: number = 0;
    while (res < viewportSize && index <= this.scrollCount) {
      res += this.getSizeByScrollIndex(index);
      index++;
      count++;
    }
    return count;
  }
  public getVisibleScrollCountReversed(lastVisibleIndex: number, viewportSize: number): number {
    let res: number = 0;
    let index: number = lastVisibleIndex;
    let count: number = 0;
    while (res < viewportSize && index >= 0) {
      res += this.getSizeByScrollIndex(index);
      index--;
      count++;
    }
    return count;
  }
  public invalidateAfterScroll(
    oldFirstVisible: number,
    newFirstVisible: number,
    invalidate: (_: number) => void,
    viewportSize: number
  ): void {
    if (newFirstVisible > oldFirstVisible) {
      let oldVisibleCount: number = this.getVisibleScrollCount(oldFirstVisible, viewportSize);
      let newVisibleCount: number = this.getVisibleScrollCount(newFirstVisible, viewportSize);
      for (let i: number = oldFirstVisible + oldVisibleCount - 1; i <= newFirstVisible + newVisibleCount; i++) {
        invalidate(i + this.frozenCount);
      }
    } else {
      for (let i: number = newFirstVisible; i <= oldFirstVisible; i++) {
        invalidate(i + this.frozenCount);
      }
    }
  }
  public isWholeInView(firstVisibleIndex: number, index: number, viewportSize: number): boolean {
    let res: number = 0;
    let testedIndex: number = firstVisibleIndex;
    while (res < viewportSize && testedIndex < this.count) {
      res += this.getSizeByScrollIndex(testedIndex);
      if (testedIndex == index) return res <= viewportSize;
      testedIndex++;
    }
    return false;
  }
  public scrollInView(firstVisibleIndex: number, scrollIndex: number, viewportSize: number): number {
    if (this.isWholeInView(firstVisibleIndex, scrollIndex, viewportSize)) {
      return firstVisibleIndex;
    }
    if (scrollIndex < firstVisibleIndex) {
      return scrollIndex;
    }
    let testedIndex = firstVisibleIndex + 1;
    while (testedIndex < this.scrollCount) {
      if (this.isWholeInView(testedIndex, scrollIndex, viewportSize)) {
        return testedIndex;
      }
      testedIndex++;
    }
    return this.scrollCount - 1;

    // let res: number = 0;
    // let testedIndex: number = scrollIndex;
    // while (res < viewportSize && testedIndex >= 0) {
    //   let size: number = this.getSizeByScrollIndex(testedIndex);
    //   if (res + size > viewportSize) return testedIndex + 1;
    //   testedIndex--;
    //   res += size;
    // }
    // if (res >= viewportSize && testedIndex < scrollIndex) return testedIndex + 1;
    // return firstVisibleIndex;
  }
  public resize(realIndex: number, newSize: number): void {
    if (realIndex < 0) return;
    let modelIndex: number = this.realToModel(realIndex);
    if (modelIndex < 0) return;
    this.sizeOverridesByModelIndex[modelIndex] = newSize;
    this.buildIndex();
  }
  public setExtraordinaryIndexes(hidden: number[], frozen: number[]): void {
    //this._hiddenAndFrozenModelIndexes = _.clone(hidden);
    hidden = hidden.filter(x => x >= 0);
    frozen = frozen.filter(x => x >= 0);

    hidden.sort((a, b) => a - b);
    frozen.sort((a, b) => a - b);
    this.frozenModelIndexes = _.filter(frozen, x => !_.includes(hidden, x));
    this.hiddenModelIndexes = _.filter(hidden, x => !_.includes(frozen, x));
    this.hiddenAndFrozenModelIndexes = _.concat(hidden, this.frozenModelIndexes);
    this.frozenModelIndexes.sort((a, b) => a - b);
    if (this.hiddenAndFrozenModelIndexes.length == 0) this.hiddenAndFrozenModelIndexes = null;
    if (this.frozenModelIndexes.length == 0) this.frozenModelIndexes = null;
    this.buildIndex();
  }
  public realToModel(realIndex: number): number {
    return this.modelIndexes[realIndex] ?? -1;
    // console.log('realToModel', realIndex);
    // if (this.hiddenAndFrozenModelIndexes == null && this.frozenModelIndexes == null) return realIndex;
    // if (realIndex < 0) return -1;
    // if (realIndex < this.frozenCount && this.frozenModelIndexes != null) return this.frozenModelIndexes[realIndex];
    // if (this.hiddenAndFrozenModelIndexes == null) return realIndex;
    // realIndex -= this.frozenCount;
    // console.log('this.hiddenAndFrozenModelIndexes', this.hiddenAndFrozenModelIndexes);
    // for (let hidItem of this.hiddenAndFrozenModelIndexes) {
    //   if (realIndex < hidItem) return realIndex;
    //   realIndex++;
    // }
    // console.log('realToModel RESP', realIndex);
    // return realIndex;
  }
  public modelToReal(modelIndex: number): number {
    return this.modelIndexes.indexOf(modelIndex);
    // if (this.hiddenAndFrozenModelIndexes == null && this.frozenModelIndexes == null) return modelIndex;
    // if (modelIndex < 0) return -1;
    // let frozenIndex: number = this.frozenModelIndexes != null ? _.indexOf(this.frozenModelIndexes, modelIndex) : -1;
    // if (frozenIndex >= 0) return frozenIndex;
    // if (this.hiddenAndFrozenModelIndexes == null) return modelIndex;
    // let hiddenIndex: number = _.sortedIndex(this.hiddenAndFrozenModelIndexes, modelIndex);
    // if (this.hiddenAndFrozenModelIndexes[hiddenIndex] == modelIndex) return -1;
    // if (hiddenIndex >= 0) return modelIndex - hiddenIndex + this.frozenCount;
    // return modelIndex;
  }
  public getFrozenPosition(frozenIndex: number): number {
    return this.frozenItems[frozenIndex].position;
  }
  public hasSizeOverride(modelIndex: number): boolean {
    return _.has(this.sizeOverridesByModelIndex, modelIndex);
  }
  public isVisible(testedRealIndex: number, firstVisibleScrollIndex: number, viewportSize: number): boolean {
    if (testedRealIndex < 0) return false;
    if (testedRealIndex >= 0 && testedRealIndex < this.frozenCount) return true;
    let scrollIndex: number = testedRealIndex - this.frozenCount;
    let onPageIndex: number = scrollIndex - firstVisibleScrollIndex;
    return onPageIndex >= 0 && onPageIndex < this.getVisibleScrollCount(firstVisibleScrollIndex, viewportSize);
  }
}
