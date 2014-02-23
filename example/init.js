function populate(element, index) {
  var image = element.firstChild;
  var name = image.nextSibling;
  var number = name.nextSibling;
 
  var hue = (index*1000)%360;
  image.style.backgroundColor = "hsl(" + hue + ",100%,90%)";
  name.firstChild.data = "Made Up Name #" + index;
  number.firstChild.data = "0800 11" + index;
}

var scroll = new Recyclist({
  template: document.getElementById('template'),
  numItems: 100000,
  populate: populate,
  scrollParent: window,
  scrollChild: document.getElementById('scroll'),
  getScrollHeight: function () {
    return window.innerHeight;
  },
  getScrollPos: function () {
    return window.scrollY;
  }
});

scroll.init();