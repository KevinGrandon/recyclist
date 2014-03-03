'use strict';

/**
 * Asynchronously scrolls a list using position: absolute.
 * Recycles old nodes for new content as the list is scrolled.
 * Requires the stylesheet located at: shared/style/recyclist.css.
 * @param {Object} config Configuration object with:
 * - template: A reference to the template node.
 * - numItems: The total number of items in the list.
 * - populate: A method to call which will render the item.
 * - scrollParent: The parent of the container to scroll.
 *   If there are no overflow areas, this is probably the window.
 * - scrollChild: The child list to scroll.
 *   The height set to be numItems * itemHeight.
 * - getScrollHeight: Returns the height of the scroll port.
 * - getScrollPos: Returns the current scroll position.
 */
function Recyclist(config) {
  var template = config.template;
  this.itemHeight = template.clientHeight;

  // The template should not be rendered, so take it out of the document.
  template.parentNode.removeChild(template);

  // Remove its id attribute now so that that attribute doesn't get cloned
  // into all the items.
  template.removeAttribute('id');

  var header = config.headerTemplate;
  if (header) {
    header.parentNode.removeChild(header);
    header.removeAttribute('id');
  }

  for (var i in config) {
    this[i] = config[i];
  }

  this.visibleMultiplier = this.visibleMultiplier || 1;
  this.asyncMultiplier = this.asyncMultiplier || 4;
}

Recyclist.prototype = {

  /**
   * Indexed by item number, the item elements currently in the DOM.
   * @type {Object}
   */
  domItems: {},

  /**
   * The header elements currently in the DOM.
   * @type {Object}
   */
  domHeaders: {},

  lastScrollPos: 0,

  /**
   * Initializes recyclist, adds listeners, and renders items.
   */
  init: function() {
    // Make sure we can scroll the required distance.
    this.scrollChild.style.height = this.itemHeight * this.numItems + 'px';

    this.scrollParent.addEventListener('scroll', this);
    this.scrollParent.addEventListener('resize', this);

    // Synchronously generate all items that are immediately or nearly visible
    this.generate(this.visibleMultiplier);

    this.fix();
  },

  /**
   * Generates all items within a multiplier of the display port size.
   * If you only wanted to render what's on screen, you would just pass 1.
   * @param {Integer} multiplier A multiplier of the display port size.
   */
  generate: function(multiplier) {
    var itemHeight = this.itemHeight;
    var scrollPos = this.getScrollPos();
    var scrollPortHeight = this.getScrollHeight();

    // Determine which items we *need* to have in the DOM. displayPortMargin
    // is somewhat arbitrary. If there is fast async scrolling, increase
    // multiplier to make sure more items can be prerendered. If
    // populate triggers slow async activity (e.g. image loading or
    // database queries to fill in an item), increase multiplier
    // to reduce the likelihood of the user seeing incomplete items.
    var displayPortMargin = multiplier * scrollPortHeight;
    var startIndex = Math.max(0,

      /* Use ~~() for a faster equivalent to Math.floor */
      ~~((scrollPos - displayPortMargin) / itemHeight));

    var endIndex = Math.min(this.numItems,

      /* Use ~~()+1 for a faster equivalent to Math.ceil */
      ~~((scrollPos + scrollPortHeight + displayPortMargin) /
        itemHeight) + 1);

    // indices of items which are eligible for recycling
    var recyclableItems = [];
    for (var i in this.domItems) {
      if (i < startIndex || i >= endIndex) {
        if (this.forget) {
          this.forget(this.domItems[i], i);
        }
        recyclableItems.push(i);
      }
    }
    recyclableItems.sort();

    var recyclableHeaders = [];
    for (var i in this.domHeaders) {
      if (i < startIndex || i >= endIndex) {
        recyclableHeaders.push(i);
      }
    }
    recyclableHeaders.sort();

    for (i = startIndex; i < endIndex; ++i) {
      if (this.domItems[i] || this.domHeaders[i]) {
        continue;
      }

      var recycleIndex;
      var item;
      var isHeader = this.isHeader(i);
      if (!isHeader && recyclableItems.length > 0) {
        // Delete the item furthest from the direction we're scrolling toward
        if (scrollPos >= this.lastScrollPos) {
          recycleIndex = recyclableItems.shift();
        } else {
          recycleIndex = recyclableItems.pop();
        }

        item = this.domItems[recycleIndex];
        delete this.domItems[recycleIndex];

        // NOTE: We must detach and reattach the node even though we are
        //       essentially just repositioning it.  This avoid pathological
        //       layerization behavior where each item gets assigned its own
        //       layer.
        this.scrollChild.removeChild(item);

      } else if (isHeader && recyclableHeaders.length > 0) {
        // Delete the item furthest from the direction we're scrolling toward
        if (scrollPos >= this.lastScrollPos) {
          recycleIndex = recyclableHeaders.shift();
        } else {
          recycleIndex = recyclableHeaders.pop();
        }

        item = this.domHeaders[recycleIndex];
        delete this.domHeaders[recycleIndex];

        // NOTE: We must detach and reattach the node even though we are
        //       essentially just repositioning it.  This avoid pathological
        //       layerization behavior where each item gets assigned its own
        //       layer.
        this.scrollChild.removeChild(item);
      } else {
        if (isHeader) {
          item = this.headerTemplate.cloneNode(true);
        } else {
          item = this.template.cloneNode(true);
        }
      }
      this.populate(item, i);
      item.style.top = i * itemHeight + 'px';
      if (isHeader) {
        this.domHeaders[i] = item;
      } else {
        this.domItems[i] = item;
      }
      this.scrollChild.appendChild(item);
    }
  },

  /**
   * Generates items for the viewport and sets lastScrollPos
   */
  fix: function() {
    this.generate(this.asyncMultiplier);
    this.lastScrollPos = this.getScrollPos();
  },

  handleEvent: function() {
    this.fix();
  },

  /**
   * Returns true if an item at a given index is a header.
   */
  isHeader: function() {
    return false;
  },

};
