'use strict';

(function(exports) {

  // 6 px/ms max velocity * 16 ms/frame = 96 px/frame
  // 480 px/screen / 96 px/frame = 5 frames/screen
  // So we only need to do work every 5th frame.  If we could get the max velocity
  // pref we could calculate this.
  const MAX_SKIPPED_FRAMES = 4;

  // How many screens do we display while scrolling
  const DISPLAY_MULTIPLIER = 1;

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

    for (var i in config) {
      this[i] = config[i];
    }
  }

  Recyclist.prototype = {

    /**
     * Indexed by item number, the item elements currently in the DOM.
     * @type {Object}
     */
    domItems: {},

    // Init our lastScrollPos to be slightly off from starting position to
    // force initial render.
    lastScrollPos: -1,

    // Make sure we do work when we first load the list
    skippedFrames: MAX_SKIPPED_FRAMES,

    /**
     * Initializes recyclist, adds listeners, and renders items.
     */
    init: function() {
      // Make sure we can scroll the required distance.
      this.scrollChild.style.height = this.itemHeight * this.numItems + 'px';

      this.addListeners();

      // Synchronously generate all items that are immediately or nearly visible
      this.generate(DISPLAY_MULTIPLIER);
    },

    addListeners: function() {
      this.scrollParent.addEventListener('scroll', this);
      this.scrollParent.addEventListener('resize', this);
    },

    removeListeners: function() {
      this.scrollParent.removeEventListener('scroll', this);
      this.scrollParent.removeEventListener('resize', this);
    },

    /**
     * Generates all items within a multiplier of the display port size.
     * If you only wanted to render what's on screen, you would just pass 1.
     * @param {Integer} multiplier A multiplier of the display port size.
     */
    generate: function(multiplier) {
      // As described above we only need to do work every N frames.
      // TODO: It would be nice to spread work across all these frames instead
      //       of bursting every Nth frame.  Have to weigh complexity costs there.
      if (this.skippedFrames < MAX_SKIPPED_FRAMES) {
        this.skippedFrames += 1;
        requestAnimationFrame(this.generate.bind(this, multiplier));
      }
      this.skippedFrames = 0;

      var itemHeight = this.itemHeight;
      var scrollPos = this.getScrollPos();
      var scrollPortHeight = this.getScrollHeight();

      // If we stopped scrolling then go back to passive mode and wait for a new
      // scroll to start.
      if (scrollPos === this.lastScrollPos) {
        this.skippedFrames = MAX_SKIPPED_FRAMES;
        this.addListeners();
        return;
      }

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

      var toAppend = [];
      for (i = startIndex; i < endIndex; ++i) {
        if (this.domItems[i]) {
          continue;
        }
        var item;
        if (recyclableItems.length > 0) {
          var recycleIndex;
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
        } else {
          item = this.template.cloneNode(true);
        }
        this.populate(item, i);
        item.style.top = i * itemHeight + 'px';
        this.domItems[i] = item;
        toAppend.push(item);
      }

      if (toAppend.length === 1) {
        this.scrollChild.appendChild(toAppend[0]);
      } else if (toAppend.length) {
        var frag = document.createDocumentFragment();
        while (toAppend.length) {
          frag.appendChild(toAppend.shift());
        }
        this.scrollChild.appendChild(frag);
      }

      this.lastScrollPos = scrollPos;

      // Continue checking every animation frame until we see that we have
      // stopped scrolling.
      requestAnimationFrame(this.generate.bind(this, multiplier));
    },

    /**
     * Generates items for the viewport and sets lastScrollPos
     */
    fix: function() {
      requestAnimationFrame(this.generate.bind(this, DISPLAY_MULTIPLIER));
      // Disable events as we will monitor scroll position manually every frame
      this.removeListeners();
    },

    handleEvent: function() {
      this.fix();
    }

  };

  exports.Recyclist = Recyclist;

}(window));
