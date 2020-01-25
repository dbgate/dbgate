import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import useDimensions from '../utility/useDimensions';

const StyledHorizontalScrollBar = styled.div`
  overflow-x: scroll;
  height: 16px;
  position: absolute;
  bottom: 0;
  //left: 100px;
  // right: 20px;
  right: 0;
  left: 0;
`;

const StyledHorizontalScrollContent = styled.div``;

const StyledVerticalScrollBar = styled.div`
  overflow-y: scroll;
  width: 20px;
  position: absolute;
  right: 0px;
  width: 20px;
  bottom: 16px;
  // bottom: 0;
  top: 0;
`;

const StyledVerticalScrollContent = styled.div``;

export function HorizontalScrollBar({
  onScroll = undefined,
  valueToSet = undefined,
  valueToSetDate = undefined,
  minimum,
  maximum,
  viewportRatio = 0.5,
}) {
  const [ref, { width }] = useDimensions();
  const contentSize = Math.round(width / viewportRatio);

  React.useEffect(() => {
    const position01 = (valueToSet - minimum) / (maximum - minimum + 1);
    const position = position01 * (contentSize - width);
    if (ref.current) ref.current.scrollLeft = Math.floor(position);
  }, [valueToSetDate]);

  return (
    <StyledHorizontalScrollBar ref={ref}>
      <StyledHorizontalScrollContent style={{ width: `${contentSize}px` }}>&nbsp;</StyledHorizontalScrollContent>
    </StyledHorizontalScrollBar>
  );
}

export function VerticalScrollBar({
  onScroll,
  valueToSet = undefined,
  valueToSetDate = undefined,
  minimum,
  maximum,
  viewportRatio = 0.5,
}) {
  const [ref, { height }] = useDimensions();
  const contentSize = Math.round(height / viewportRatio);

  React.useEffect(() => {
    const position01 = (valueToSet - minimum) / (maximum - minimum + 1);
    const position = position01 * (contentSize - height);
    if (ref.current) ref.current.scrollTop = Math.floor(position);
  }, [valueToSetDate]);

  const handleScroll = () => {
    const position = ref.current.scrollTop;
    const ratio = position / (contentSize - height);
    if (ratio < 0) return 0;
    let res = ratio * (maximum - minimum + 1) + minimum;
    onScroll(Math.floor(res + 0.3));
  };

  return (
    <StyledVerticalScrollBar ref={ref} onScroll={handleScroll}>
      <StyledVerticalScrollContent style={{ height: `${contentSize}px` }}>&nbsp;</StyledVerticalScrollContent>
    </StyledVerticalScrollBar>
  );
}

// export interface IScrollBarProps {
//     viewportRatio: number;
//     minimum: number;
//     maximum: number;
//     containerStyle: any;
//     onScroll?: any;
// }

// export abstract class ScrollBarBase extends React.Component<IScrollBarProps, {}> {
//     domScrollContainer: Element;
//     domScrollContent: Element;
//     contentSize: number;
//     containerResizedBind: any;

//     constructor(props) {
//         super(props);
//         this.containerResizedBind = this.containerResized.bind(this);
//     }

//     componentDidMount() {
//         $(this.domScrollContainer).scroll(this.onScroll.bind(this));
//         createResizeDetector(this.domScrollContainer, this.containerResized.bind(this));
//         window.addEventListener('resize', this.containerResizedBind);
//         this.updateContentSize();
//     }

//     componentWillUnmount() {
//         deleteResizeDetector(this.domScrollContainer);
//         window.removeEventListener('resize', this.containerResizedBind);
//     }

//     onScroll() {
//         if (this.props.onScroll) {
//             this.props.onScroll(this.value);
//         }
//     }

//     get value(): number {
//         let position = this.getScrollPosition();
//         let ratio = position / (this.contentSize - this.getContainerSize());
//         if (ratio < 0) return 0;
//         let res = ratio * (this.props.maximum - this.props.minimum + 1) + this.props.minimum;
//         return Math.floor(res + 0.3);
//     }

//     set value(value: number) {
//         let position01 = (value - this.props.minimum) / (this.props.maximum - this.props.minimum + 1);
//         let position = position01 * (this.contentSize - this.getContainerSize());
//         this.setScrollPosition(Math.floor(position));
//     }

//     containerResized() {
//         this.setContentSizeField();
//         this.updateContentSize();
//     }

//     setContentSizeField() {
//         let lastContentSize = this.contentSize;
//         this.contentSize = Math.round(this.getContainerSize() / this.props.viewportRatio);
//         if (_.isNaN(this.contentSize)) this.contentSize = 0;
//         if (this.contentSize > 1000000 && detectBrowser() == BrowserType.Firefox) this.contentSize = 1000000;
//         if (lastContentSize != this.contentSize) {
//             this.updateContentSize();
//         }
//     }

//     abstract getContainerSize(): number;
//     abstract updateContentSize();
//     abstract getScrollPosition(): number;
//     abstract setScrollPosition(value: number);
// }

// export class HorizontalScrollBar extends ScrollBarBase {
//     render() {
//         this.setContentSizeField();

//         return <div className='ReactGridHorizontalScrollBar' ref={x => this.domScrollContainer = x} style={this.props.containerStyle}>
//             <div className='ReactGridHorizontalScrollContent' ref={x => this.domScrollContent = x} style={{ width: this.contentSize }}>
//                 &nbsp;
//                 </div>
//         </div>;
//     }

//     getContainerSize(): number {
//         return $(this.domScrollContainer).width();
//     }

//     updateContentSize() {
//         $(this.domScrollContent).width(this.contentSize);
//     }

//     getScrollPosition() {
//         return $(this.domScrollContainer).scrollLeft();
//     }

//     setScrollPosition(value: number) {
//         $(this.domScrollContainer).scrollLeft(value);
//     }
// }

// export class VerticalScrollBar extends ScrollBarBase {
//     render() {
//         this.setContentSizeField();

//         return <div className='ReactGridVerticalScrollBar' ref={x => this.domScrollContainer = x} style={this.props.containerStyle}>
//             <div className='ReactGridVerticalScrollContent' ref={x => this.domScrollContent = x} style={{ height: this.contentSize }}>
//                 &nbsp;
//                 </div>
//         </div>;
//     }

//     getContainerSize(): number {
//         return $(this.domScrollContainer).height();
//     }

//     updateContentSize() {
//         $(this.domScrollContent).height(this.contentSize);
//     }

//     getScrollPosition() {
//         return $(this.domScrollContainer).scrollTop();
//     }

//     setScrollPosition(value: number) {
//         $(this.domScrollContainer).scrollTop(value);
//     }
// }
