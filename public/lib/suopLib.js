const suopRightClick = {
  currentTarget: document,
  //relies on ripple & material icons library
  initialize: function () {
    $(document).on('click', function (e) {
      suopRightClick.close();
    });
    $('body').append(html `
      <style> 
        #suop-right-click-menu {
          display: flex;
          position: absolute;
          z-index: 999;
          flex-flow: column;
          background-color: white;
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
          border-radius: 5px;
          padding: 10px;
          transition: transform 0.1s;
          transform-origin: top left;
        }

        #suop-right-click-menu > a {
          user-drag: none; 
          user-select: none;
          -moz-user-select: none;
          -webkit-user-drag: none;
          -webkit-user-select: none;
          -ms-user-select: none;
          display: flex;
          flex-flow: row nowrap;
          align-items: center;
          padding: 10px;
          text-decoration: none;
          color: #1b1b1b;
          overflow: hidden;
        }

        .suop-transform-collapsed {
          transform: scale(0);
        }

        #suop-right-click-menu > a > i {
          padding-right: 10px;
        }

        #suop-right-click-menu > a > i:empty {
          padding-right: 0;
        }
      </style>
      <div id="suop-right-click-menu" class="transform-collapsed">
      </div>
  `);
  },
  rightClick: function (e) {
    //makes menu visible & positions
    e.preventDefault();
    $('#suop-right-click-menu')
      .css('top', `${e.pageY}px`)
      .css('left', `${e.pageX}px`)
      .removeClass('transform-collapsed');
    suopRightClick.currentTarget = e.currentTarget;
    //closes menu when user clicks outside of it.
    $('#suop-right-click-menu').on('click', function (e) {
      e.stopPropagation();
    });
  },

  close: function () {
    $('#suop-right-click-menu').addClass('transform-collapsed');
    $('#suop-right-click-menu').off('click');
  },

  addMenuItem: function ({
    title,
    icon,
    clickEvent
  } = {
    title: '',
    icon: '',
    clickEvent: function () {
      console.log('This menu item has nothing set');
    }
  }) {
    //adds a new menu item, sets the click event, passes the element parameter into the click event
    $('#suop-right-click-menu').append(`
      <a class="ripple" href="javascript:;" id="suopMenu${title}">
        <i class="material-icons">${icon}</i>${title}</a>`)
      .children().last().click(() =>
        clickEvent());
  }

};

const suopPopup = {
  pop: function (content, callback = function () {}) {
    if ($('#suop-popup').length === 0) {
      $('body').append(`
      <div style="position:fixed;height:100vh;width:100vw;background-color:rgba(0,0,0,0.5);z-index:500;transition: all 0.2s;display:flex;justify-content: center;align-items: center;opacity:0;" id="suop-popup">
        <span id="inner-suop-popup" style ="box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);background-color:white;padding: 20px;border-radius:10px;"></span>
      </div>
    `);
      replaceContent();
      setTimeout(function () {
        $('#suop-popup').css('opacity', '1');
      }, 1);


      $('#suop-popup').click(function () {
        suopPopup.close();
      });
      $('#inner-suop-popup').click(function (e) {
        e.stopPropagation();

      });
    } else {
      replaceContent();
      $('#suop-popup').css('display', 'flex');
      setTimeout(function () {
        $('#suop-popup').css('opacity', '1');
      }, 1);
    }
    $('#suop-popup').promise().done(function () {
      callback();

    });

    function replaceContent() {
      $('#inner-suop-popup').html(content);
    }
  },
  close: function () {
    $('#suop-popup').css('opacity', '0');
    setTimeout(function () {
      $('#suop-popup').css('display', 'none');
    }, 200);
  }

};

function createUUID() {
  //probably not secure, just for uniqueness within a session.
  var s = [];
  var hexDigits = "0123456789abcdef";
  for (var i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
  }
  s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[8] = s[13] = s[18] = s[23] = "-";
  return s.join("");
}

function getFileExtension(value) {
  return value.slice((Math.max(0, value.lastIndexOf(".")) || Infinity) + 1);
}

var preloadImage = function (src) {
  var image = new Promise(function (resolve, reject) {
    var imageLoader = new Image();
    imageLoader.onload = function () {
      resolve(imageLoader);
    };
    imageLoader.src = src;

  });
  return image;
};

function titleCase(str) {
  let strLowerCase = str.toLowerCase();
  let wordArr = strLowerCase.split(" ").map(function (currentValue) {
    if (currentValue[0]) {
      return currentValue[0].toUpperCase() + currentValue.substring(1);
    }
  });

  return wordArr.join(" ");
}

//a template literal tag that does nothing. Just for readability.
function html(t) {
  for (var o = [t[0]], i = 1, l = arguments.length; i < l; i++)
    o.push(arguments[i], t[i]);
  return o.join('');
}

//executes a function after the specified number of ms, but if it is called again before the timer is up, it resets the timer.
//if run without arguments, it gives a list of ongoing timers.
var deferNoDuplicates = function () {
  var timeouts = {};
  return function ({
    callback,
    timerLength,
    id
  } = {}) {
    if (callback) {

      if (!id) {
        id = 'default';
      }
      if (timeouts[id]) {
        clearTimeout(timeouts[id]);
      }
      timeouts[id] = setTimeout(() => {
        callback();
        timeouts[id] = null;
      }, timerLength);
    } else {
      return timeouts;
    }

  };
}();