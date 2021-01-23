import _ from 'lodash';

export class SeriesSizeItem {
  constructor() {
    this.scrollIndex = -1;
    this.frozenIndex = -1;
    this.modelIndex = 0;
    this.size = 0;
    this.position = 0;
  }

  // modelIndex;
  // size;
  // position;

  get endPosition() {
    return this.position + this.size;
  }
}

export class SeriesSizes {
  constructor() {
    this.scrollItems = [];
    this.sizeOverridesByModelIndex = {};
    this.positions = [];
    this.scrollIndexes = [];
    this.frozenItems = [];
    this.hiddenAndFrozenModelIndexes = null;
    this.frozenModelIndexes = null;

    this.count = 0;
    this.maxSize = 1000;
    this.defaultSize = 50;
  }

  // private sizeOverridesByModelIndex: { [id] } = {};
  // count;
  // defaultSize;
  // maxSize;
  // private hiddenAndFrozenModelIndexes[] = [];
  // private frozenModelIndexes[] = [];
  // private hiddenModelIndexes[] = [];
  // private scrollItems: SeriesSizeItem[] = [];
  // private positions[] = [];
  // private scrollIndexes[] = [];
  // private frozenItems: SeriesSizeItem[] = [];

  get scrollCount() {
    return this.count - (this.hiddenAndFrozenModelIndexes != null ? this.hiddenAndFrozenModelIndexes.length : 0);
  }
  get frozenCount() {
    return this.frozenModelIndexes != null ? this.frozenModelIndexes.length : 0;
  }
  get frozenSize() {
    return _.sumBy(this.frozenItems, x => x.size);
  }
  get realCount() {
    return this.frozenCount + this.scrollCount;
  }

  putSizeOverride(modelIndex, size, sizeByUser = false) {
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
  buildIndex() {
    this.scrollItems = [];
    this.scrollIndexes = _.filter(
      _.map(this.intKeys(this.sizeOverridesByModelIndex), x => this.modelToReal(x) - this.frozenCount),
      x => x >= 0
    );
    this.scrollIndexes.sort();
    let lastScrollIndex = -1;
    let lastEndPosition = 0;
    this.scrollIndexes.forEach(scrollIndex => {
      let modelIndex = this.realToModel(scrollIndex + this.frozenCount);
      let size = this.sizeOverridesByModelIndex[modelIndex];
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
    let lastpos = 0;
    for (let i = 0; i < this.frozenCount; i++) {
      let modelIndex = this.frozenModelIndexes[i];
      let size = this.getSizeByModelIndex(modelIndex);
      let item = new SeriesSizeItem();
      item.frozenIndex = i;
      item.modelIndex = modelIndex;
      item.size = size;
      item.position = lastpos;
      this.frozenItems.push(item);
      lastpos += size;
    }
  }

  getScrollIndexOnPosition(position) {
    let itemOrder = _.sortedIndex(this.positions, position);
    if (this.positions[itemOrder] == position) return itemOrder;
    if (itemOrder == 0) return Math.floor(position / this.defaultSize);
    if (position <= this.scrollItems[itemOrder - 1].endPosition) return this.scrollItems[itemOrder - 1].scrollIndex;
    return (
      Math.floor((position - this.scrollItems[itemOrder - 1].position) / this.defaultSize) +
      this.scrollItems[itemOrder - 1].scrollIndex
    );
  }
  getFrozenIndexOnPosition(position) {
    this.frozenItems.forEach(function (item) {
      if (position >= item.position && position <= item.endPosition) return item.frozenIndex;
    });
    return -1;
  }
  // getSizeSum(startScrollIndex, endScrollIndex) {
  //     let order1 = _.sortedIndexOf(this.scrollIndexes, startScrollIndex);
  //     let order2 = _.sortedIndexOf(this.scrollIndexes, endScrollIndex);
  //     let count = endScrollIndex - startScrollIndex;
  //     if (order1 < 0)
  //         order1 = ~order1;
  //     if (order2 < 0)
  //         order2 = ~order2;
  //     let result = 0;
  //     for (let i = order1; i <= order2; i++) {
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
  getSizeByModelIndex(modelIndex) {
    if (_.has(this.sizeOverridesByModelIndex, modelIndex)) return this.sizeOverridesByModelIndex[modelIndex];
    return this.defaultSize;
  }
  getSizeByScrollIndex(scrollIndex) {
    return this.getSizeByRealIndex(scrollIndex + this.frozenCount);
  }
  getSizeByRealIndex(realIndex) {
    let modelIndex = this.realToModel(realIndex);
    return this.getSizeByModelIndex(modelIndex);
  }
  removeSizeOverride(realIndex) {
    let modelIndex = this.realToModel(realIndex);
    delete this.sizeOverridesByModelIndex[modelIndex];
  }
  getScroll(sourceScrollIndex, targetScrollIndex) {
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
  modelIndexIsInScrollArea(modelIndex) {
    let realIndex = this.modelToReal(modelIndex);
    return realIndex >= this.frozenCount;
  }
  getTotalScrollSizeSum() {
    let scrollSizeOverrides = _.map(
      _.filter(this.intKeys(this.sizeOverridesByModelIndex), x => this.modelIndexIsInScrollArea(x)),
      x => this.sizeOverridesByModelIndex[x]
    );
    return _.sum(scrollSizeOverrides) + (this.count - scrollSizeOverrides.length) * this.defaultSize;
  }
  getVisibleScrollSizeSum() {
    let scrollSizeOverrides = _.map(
      _.filter(this.intKeys(this.sizeOverridesByModelIndex), x => !_.includes(this.hiddenAndFrozenModelIndexes, x)),
      x => this.sizeOverridesByModelIndex[x]
    );
    return (
      _.sum(scrollSizeOverrides) +
      (this.count - this.hiddenModelIndexes.length - scrollSizeOverrides.length) * this.defaultSize
    );
  }
  intKeys(value) {
    return _.keys(value).map(x => _.parseInt(x));
  }
  getPositionByRealIndex(realIndex) {
    if (realIndex < 0) return 0;
    if (realIndex < this.frozenCount) return this.frozenItems[realIndex].position;
    return this.getPositionByScrollIndex(realIndex - this.frozenCount);
  }
  getPositionByScrollIndex(scrollIndex) {
    let order = _.sortedIndex(this.scrollIndexes, scrollIndex);
    if (this.scrollIndexes[order] == scrollIndex) return this.scrollItems[order].position;
    order--;
    if (order < 0) return scrollIndex * this.defaultSize;
    return (
      this.scrollItems[order].endPosition + (scrollIndex - this.scrollItems[order].scrollIndex - 1) * this.defaultSize
    );
  }
  getVisibleScrollCount(firstVisibleIndex, viewportSize) {
    let res = 0;
    let index = firstVisibleIndex;
    let count = 0;
    while (res < viewportSize && index <= this.scrollCount) {
      // console.log('this.getSizeByScrollIndex(index)', this.getSizeByScrollIndex(index));
      res += this.getSizeByScrollIndex(index);
      index++;
      count++;
    }
    // console.log('getVisibleScrollCount', firstVisibleIndex, viewportSize, count);
    return count;
  }
  getVisibleScrollCountReversed(lastVisibleIndex, viewportSize) {
    let res = 0;
    let index = lastVisibleIndex;
    let count = 0;
    while (res < viewportSize && index >= 0) {
      res += this.getSizeByScrollIndex(index);
      index--;
      count++;
    }
    return count;
  }
  invalidateAfterScroll(oldFirstVisible, newFirstVisible, invalidate, viewportSize) {
    if (newFirstVisible > oldFirstVisible) {
      let oldVisibleCount = this.getVisibleScrollCount(oldFirstVisible, viewportSize);
      let newVisibleCount = this.getVisibleScrollCount(newFirstVisible, viewportSize);
      for (let i = oldFirstVisible + oldVisibleCount - 1; i <= newFirstVisible + newVisibleCount; i++) {
        invalidate(i + this.frozenCount);
      }
    } else {
      for (let i = newFirstVisible; i <= oldFirstVisible; i++) {
        invalidate(i + this.frozenCount);
      }
    }
  }
  isWholeInView(firstVisibleIndex, index, viewportSize) {
    let res = 0;
    let testedIndex = firstVisibleIndex;
    while (res < viewportSize && testedIndex < this.count) {
      res += this.getSizeByScrollIndex(testedIndex);
      if (testedIndex == index) return res <= viewportSize;
      testedIndex++;
    }
    return false;
  }
  scrollInView(firstVisibleIndex, scrollIndex, viewportSize) {
    if (this.isWholeInView(firstVisibleIndex, scrollIndex, viewportSize)) {
      return firstVisibleIndex;
    }
    if (scrollIndex < firstVisibleIndex) {
      return scrollIndex;
    }
    let res = 0;
    let testedIndex = scrollIndex;
    while (res < viewportSize && testedIndex >= 0) {
      let size = this.getSizeByScrollIndex(testedIndex);
      if (res + size > viewportSize) return testedIndex + 1;
      testedIndex--;
      res += size;
    }
    if (res >= viewportSize && testedIndex < scrollIndex) return testedIndex + 1;
    return firstVisibleIndex;
  }
  resize(realIndex, newSize) {
    if (realIndex < 0) return;
    let modelIndex = this.realToModel(realIndex);
    if (modelIndex < 0) return;
    this.sizeOverridesByModelIndex[modelIndex] = newSize;
    this.buildIndex();
  }
  setExtraordinaryIndexes(hidden, frozen) {
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
  realToModel(realIndex) {
    if (this.hiddenAndFrozenModelIndexes == null && this.frozenModelIndexes == null) return realIndex;
    if (realIndex < 0) return -1;
    if (realIndex < this.frozenCount && this.frozenModelIndexes != null) return this.frozenModelIndexes[realIndex];
    if (this.hiddenAndFrozenModelIndexes == null) return realIndex;
    realIndex -= this.frozenCount;
    for (let hidItem of this.hiddenAndFrozenModelIndexes) {
      if (realIndex < hidItem) return realIndex;
      realIndex++;
    }
    return realIndex;
  }
  modelToReal(modelIndex) {
    if (this.hiddenAndFrozenModelIndexes == null && this.frozenModelIndexes == null) return modelIndex;
    if (modelIndex < 0) return -1;
    let frozenIndex = this.frozenModelIndexes != null ? _.indexOf(this.frozenModelIndexes, modelIndex) : -1;
    if (frozenIndex >= 0) return frozenIndex;
    if (this.hiddenAndFrozenModelIndexes == null) return modelIndex;
    let hiddenIndex = _.sortedIndex(this.hiddenAndFrozenModelIndexes, modelIndex);
    if (this.hiddenAndFrozenModelIndexes[hiddenIndex] == modelIndex) return -1;
    if (hiddenIndex >= 0) return modelIndex - hiddenIndex + this.frozenCount;
    return modelIndex;
  }
  getFrozenPosition(frozenIndex) {
    return this.frozenItems[frozenIndex].position;
  }
  hasSizeOverride(modelIndex) {
    return _.has(this.sizeOverridesByModelIndex, modelIndex);
  }
  isVisible(testedRealIndex, firstVisibleScrollIndex, viewportSize) {
    if (testedRealIndex < 0) return false;
    if (testedRealIndex >= 0 && testedRealIndex < this.frozenCount) return true;
    let scrollIndex = testedRealIndex - this.frozenCount;
    let onPageIndex = scrollIndex - firstVisibleScrollIndex;
    return onPageIndex >= 0 && onPageIndex < this.getVisibleScrollCount(firstVisibleScrollIndex, viewportSize);
  }
}
