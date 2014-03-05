function populate(element, index) {

  if (isHeader(index)) {
    element.firstChild.textContent = 'This is a header: ' + index;
    return;
  }

  var image = element.firstChild;
  var name = image.nextSibling;
  var number = name.nextSibling;

  var hue = (index*1000)%360;
  image.style.backgroundColor = "hsl(" + hue + ",100%,90%)";
  name.firstChild.data = "Made Up Name #" + index;
  number.firstChild.data = "0800 11" + index;
}

function isHeader(index) {
  if (index % 6 === 0) {
    return true;
  }
  return false;
}

var scroll = new Recyclist({
  template: document.getElementById('template'),
  headerTemplate: document.getElementById('header'),
  isHeader: isHeader,
  numItems: 100,
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

var pending = 10;

function add() {

  scroll.addItems(100);

  if ((pending--)) {
    setTimeout(add, 200)
  }
}

setTimeout(add)
