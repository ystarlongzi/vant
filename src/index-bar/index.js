import { createNamespace } from '../utils';
import { TouchMixin } from '../mixins/touch';
import { ParentMixin } from '../mixins/relation';
import { BindEventMixin } from '../mixins/bind-event';
import { GREEN } from '../utils/constant';
import {
  getScrollTop,
  getRootScrollTop,
  setRootScrollTop,
  getScrollEventTarget
} from '../utils/dom/scroll';

const [createComponent, bem] = createNamespace('index-bar');

export default createComponent({
  mixins: [
    TouchMixin,
    ParentMixin('vanIndexBar'),
    BindEventMixin(function (bind) {
      if (!this.scroller) {
        this.scroller = getScrollEventTarget(this.$el);
      }

      bind(this.scroller, 'scroll', this.onScroll);
    })
  ],

  props: {
    sticky: {
      type: Boolean,
      default: true
    },
    zIndex: {
      type: Number,
      default: 1
    },
    highlightColor: {
      type: String,
      default: GREEN
    },
    stickyOffsetTop: {
      type: Number,
      default: 0
    },
    indexList: {
      type: Array,
      default() {
        const indexList = [];
        const charCodeOfA = 'A'.charCodeAt(0);

        for (let i = 0; i < 26; i++) {
          indexList.push(String.fromCharCode(charCodeOfA + i));
        }

        return indexList;
      }
    }
  },

  data() {
    return {
      activeAnchorIndex: null
    };
  },

  computed: {
    highlightStyle() {
      const { highlightColor } = this;
      if (highlightColor) {
        /* istanbul ignore else */
        return {
          color: highlightColor
        };
      }
    }
  },

  watch: {
    indexList() {
      this.$nextTick(this.onScroll);
    }
  },

  methods: {
    onScroll() {
      const { scroller, childrenRect } = this;
      const scrollTop = getScrollTop(scroller);
      const scrollerRect = this.getScrollerRect();

      const active = this.getActiveAnchorIndex(scrollTop, childrenRect);
      this.activeAnchorIndex = this.indexList[active];

      if (this.sticky) {
        let activeItemTop = 0;
        let isReachEdge = false;

        if (active !== -1) {
          activeItemTop = childrenRect[active].top - scrollTop;
          isReachEdge = activeItemTop <= 0;
        }

        this.children.forEach((item, index) => {
          if (index === active) {
            item.active = true;
            item.position = isReachEdge ? 'fixed' : 'relative';
            item.left = isReachEdge ? scrollerRect.left : 0;
            item.top = isReachEdge
              ? this.stickyOffsetTop + scrollerRect.top
              : 0;
          } else if (index === active - 1) {
            item.active = !isReachEdge;
            item.position = 'relative';
            item.left = 0;
            item.top = item.parentHeight - item.height;
          } else {
            item.active = false;
            item.position = undefined;
          }
        });
      }
    },

    initChildrenRect() {
      if (!this.childrenRect) {
        const scrollTop = getScrollTop(this.scroller);
        const scrollerRect = this.getScrollerRect();

        this.childrenRect = this.children.map(item => ({
          height: item.height,
          // `<index-anchor />`与滚动容器间的距离。参考：https://github.com/youzan/vant/issues/3443
          top: scrollTop + (item.rect.top - scrollerRect.top)
        }));
      }

      return this.childrenRect;
    },

    getScrollerRect() {
      const { scroller } = this;
      let scrollerRect = {
        top: 0,
        left: 0,
      };

      if (scroller.getBoundingClientRect) {
        scrollerRect = scroller.getBoundingClientRect();
      }

      return scrollerRect;
    },

    getActiveAnchorIndex(scrollTop, rects) {
      for (let i = this.children.length - 1; i >= 0; i--) {
        const prevHeight = i > 0 ? rects[i - 1].height : 0;

        if (scrollTop + prevHeight + this.stickyOffsetTop >= rects[i].top) {
          return i;
        }
      }
      return -1;
    },

    onClick(event) {
      this.scrollToElement(event.target);
    },

    onTouchMove(event) {
      this.touchMove(event);

      if (this.direction === 'vertical') {
        /* istanbul ignore else */
        if (event.cancelable) {
          event.preventDefault();
        }

        const { clientX, clientY } = event.touches[0];
        const target = document.elementFromPoint(clientX, clientY);
        if (target) {
          const { index } = target.dataset;

          /* istanbul ignore else */
          if (this.touchActiveIndex !== index) {
            this.touchActiveIndex = index;
            this.scrollToElement(target);
          }
        }
      }
    },

    scrollToElement(element) {
      const { index } = element.dataset;
      if (!index) {
        return;
      }

      const match = this.children.filter(item => String(item.index) === index);
      if (match[0]) {
        match[0].scrollIntoView();

        if (this.stickyOffsetTop) {
          setRootScrollTop(getRootScrollTop() - this.stickyOffsetTop);
        }

        this.$emit('select', match[0].index);
      }
    },

    onTouchEnd() {
      this.active = null;
    }
  },

  mounted() {
    this.initChildrenRect();
  },

  render() {
    const Indexes = this.indexList.map(index => {
      const active = index === this.activeAnchorIndex;

      return (
        <span
          class={bem('index', { active })}
          style={active ? this.highlightStyle : null}
          data-index={index}
        >
          {index}
        </span>
      );
    });

    return (
      <div class={bem()}>
        <div
          class={bem('sidebar')}
          style={{ zIndex: this.zIndex + 1 }}
          onClick={this.onClick}
          onTouchstart={this.touchStart}
          onTouchmove={this.onTouchMove}
          onTouchend={this.onTouchEnd}
          onTouchcancel={this.onTouchEnd}
        >
          {Indexes}
        </div>
        {this.slots('default')}
      </div>
    );
  }
});
