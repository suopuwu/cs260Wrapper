//#region getting the background color in jquery gives a hex code instead of rgb
$.cssHooks.backgroundColor = {
  get: function (elem) {
    if (elem.currentStyle) var bg = elem.currentStyle.backgroundColor;
    else if (window.getComputedStyle)
      var bg = document.defaultView
        .getComputedStyle(elem, null)
        .getPropertyValue('background-color');
    if (bg.search('rgb') == -1) return bg;
    else {
      bg = bg.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

      function hex(x) {
        return ('0' + parseInt(x).toString(16)).slice(-2);
      }
      return '#' + hex(bg[1]) + hex(bg[2]) + hex(bg[3]);
    }
  },
};
//#endregion
$(function () {
  //#region initialization variables
  var charTiles = $('#css > .tile-button');
  var playerTiles = $('#pss > .tile-button');
  var allTiles = [charTiles, playerTiles];
  const modes = {
    character: 0,
    player: 1,
  };
  var mode = modes.character;
  //#endregion
  //#region event listeners
  $('input:radio[name="select-screen"]').change(internalModeSwitch);
  //changes the internal mode between player and character when a new tab is selected.
  //This matters because the search mode only searches in the active tab.
  $('#search-bar').on('input', pruneSearchTerms);
  $('#css > .tile-button').click(navigateToCharacter);
  //dynamically adds event listeners
  $('#pss').on('click', '.tile-button', navigateToPlayer)
    .on('contextmenu', '.tile-button', rightClickMenu);
  $('#search-label-icon').click(clearSearch);
  $('#add-char-fab').click(addPlayer);

  //custom middle click event listener
  $(document).on("mousedown", '.tile-button', function (e1) {
    $(document).one("mouseup", function (e2) {
      //if it is a middle click, and if the middle click keyup is the same as the keydown
      if (e1.which == 2 && e1.target == e2.target) {
        var clickedTile = $(e2.target).closest('.tile-button');
        var tileHolder = $(e2.target).closest('.tile-holder');
        var initPath;
        switch (tileHolder.attr('id')) {
          case 'css':
            initPath = '/characters/';
            break;
          case 'pss':
            initPath = '/players/';
            break;
        }
        console.log(tileHolder);
        var tileId = clickedTile.attr('id');
        console.log($(e2.target).closest('.tile-button').attr('id'));
        window.open(initPath +
          tileId
          .slice(0, tileId.length - '-tile'.length), "_blank");
      }
    });
    return false;
  }).on("keydown", function (event) {
    if ((event.keyCode == 114) || (event.ctrlKey && event.keyCode == 70)) {
      event.preventDefault();
      $('#search-bar').focus();
    }
  });

  //#endregion
  firebase.auth().onAuthStateChanged(function (user) { //adds player buttons
    if (user) {
      //if already logged in
      var playersRef = database.ref('users/' + user.uid + '/players');
      //on value change
      playersRef.on('value', (snapshot) => {
        const players = snapshot.val();
        var playersFromOnline = Object.keys(players);
        for (let key in players) {
          var player = players[key];
          var tileHtml = getTileHtml({
            name: player.name,
            id: key,
            color: player.color,
          });
          if ($('#' + key + '-tile').length > 0) {
            //if the element has already been added, replace the existing one's subelements

            $('#' + key + '-tile > .name-plate').html(player.name);
            $('#' + key + '-tile').css('background-color', player.color);
          } else {
            //otherwise, add a new one.
            $('#pss').append(tileHtml);
            $('#' + key + '-tile')
              .data('imagePath', player.image).fadeIn().removeClass('invisible');
            loadAndChangeImage(player, key);
          }
        }
      });
      $('#pss > .tile-button').click(navigateToPlayer);
      authStateChangedUi(true);
    } else {
      authStateChangedUi(false);
    }
  });
  //this isn't universal, requires html to be setup in a specific way.
  function authStateChangedUi(userExists) {
    switch (userExists) {
      case true:
        $('#main-loader').fadeOut(100, function () {

          $('#main-select-screen').fadeIn();
        });
        break;
      case false:
        $('#main-select-screen').fadeOut(100, function () {
          $('#main-loader').fadeIn();
          $('#loading-text').html(`
                PLEASE<h3>LOGIN</h3>`);
        });
        break;
    }
  }

  function internalModeSwitch() {
    clearSearch();
    switch ($(this).val()) {
      case 'character':
        mode = modes.character;
        break;
      case 'player':
        mode = modes.player;
        break;
    }
  }

  function navigateToCharacter() {
    window.location.href =
      '/characters/' +
      $(this)
      .attr('id')
      .slice(0, $(this).attr('id').length - 5);
  }

  function navigateToPlayer() {
    window.location.href =
      '/players/' +
      $(this)
      .attr('id')
      .slice(0, $(this).attr('id').length - 5);
  }

  function newCharacterTab(e, initPath) {
    console.log($(e.delegateTarget).attr('id'));
    var tileId = $(e.delegateTarget).attr('id');
    e.preventDefault();
    window.open(initPath +
      tileId
      .slice(0, tileId.length - '-tile'.length), "_blank");
    return false;
  }

  function pruneSearchTerms(e) {
    const searchQuery = $('#search-bar').val();

    if (searchQuery.length > 0) {
      $('#search-label-icon').html('close');
    } else {
      $('#search-label-icon').html('search');
    }

    allTiles[mode].each(function (index, tile) {
      if (
        $(tile, '.name').find('.name-plate') //if a tile contains the search term.
        .html()
        .includes(searchQuery)
      ) {
        $(tile).removeClass('collapsed');
      } else {
        $(tile).addClass('collapsed');
      }
    });
  }

  //makes all tiles visible before switching tabs to avoid confusion & deletes search text.
  function clearSearch() {
    allTiles[mode].each(function (index, tile) {
      $(tile).removeClass('collapsed');
    });
    $('#search-bar').val('');
    $('#search-label-icon').html('search');
  }

  function rightClickMenu(e) {
    //makes menu visible & positions
    e.preventDefault();
    $('#right-click-menu')
      .css('top', `${e.pageY}px`)
      .css('left', `${e.pageX}px`)
      .removeClass('transform-collapsed');

    //menu items
    $('#menuDelete').off('click').click({
        hostElement: this,
      },
      removePlayer
    );
    $('#menuRename').off('click').click({
        hostElement: this,
      },
      renamePlayer
    );
    $('#menuRecolor').off('click').click({
        hostElement: this,
      },
      recolorPlayer
    );
    $('#menuReimage').off('click').click({
        hostElement: this,
      },
      reimagePlayer
    );

    //closes menu when user clicks outside of it.
    $('#right-click-menu').on('click', function (e) {
      e.stopPropagation();
    });
    $(document).on('click', function (e) {
      closeRightClickMenu();
    });
  }

  function closeRightClickMenu() {
    $('#right-click-menu').addClass('transform-collapsed');
    $('#right-click-menu').off('click');
    $(document).off('click');
  }

  function addPlayer() {
    var color = getRandomColor();
    var newTileRef = database.ref('users/' + user.uid + '/players').push({
      name: 'New Player',
      color: '#' + color,
      image: `${window.location.origin}/images/characters/${pickRandomCharacter()}.png`
    });
    console.log(color);
  }

  function removePlayer(e) {
    var domId = $(e.data.hostElement).attr('id');
    var id = domId.substring(0, domId.length - 5);
    closeRightClickMenu();
    //creates a popup with rename player content
    suopPopup.pop(html `
      <div>Are you sure you want to delete this player? This cannot be undone.</div>
      <div style="text-align: right;">
        <a href="javascript:;" class="ripple" id="cancelDelete"><i class="material-icons" style="padding:10px;padding-right: 5;cursor: pointer;">close</i></a>
        <a href="javascript:;" class="ripple" id="confirmDelete"><i class="material-icons" style="padding:10px; cursor: pointer;padding-left: 5px;">check</i></a>
      </div>
    `);

    $('#confirmDelete').click(function () {
      if ($(`#upload-percentage${domId}`).length === 0) {
        try {
          storageRef.child($(e.data.hostElement).data('imagePath')).delete().then(function () {
            console.log('image deleted');
          });
        } catch (err) {
          if ($(e.data.hostElement).data('imagePath') !== undefined) {
            //if there was actually an image to delete but an error happened.
            console.log(err);
          }
        }
        database.ref('users/' + user.uid + '/players/' + id).remove();
        $(e.data.hostElement).remove();
        suopPopup.close();
      } else {
        $.mSnackbar.add({
          text: '<i style="color: #ef5350">Error: </i>Please wait for the image to finish uploading before deleting the player. If this is a bug, try refreshing the page.'
        });
      }
    });
    $('#cancelDelete').click(() => suopPopup.close());
  }

  function renamePlayer(e) {
    var domId = $(e.data.hostElement).attr('id');
    var id = domId.substring(0, domId.length - 5);
    closeRightClickMenu();
    //creates a popup with rename player content
    suopPopup.pop(html `
      <div>New Name</div>
      <input type="text" id="renameCharacter" autocomplete="off" value="${$(
        '> .name-plate',
        e.data.hostElement
      ).html()}">
      <div style="text-align: right;">
        <a href="javascript:;" class="ripple" id="cancelRename"><i class="material-icons" style="padding:10px;padding-right: 5;cursor: pointer;">close</i></a>
        <a href="javascript:;" class="ripple" id="confirmRename"><i class="material-icons" style="padding:10px; cursor: pointer;padding-left: 5px;">check</i></a>
      </div>
    `);
    $('#renameCharacter').select();

    //awaits the text entered.
    var text = new Promise(function (resolve, reject) {
      $('#renameCharacter').keydown(function (e) {
        if (e.keyCode === 13) {
          resolve($('#renameCharacter').val());
        }
      });
      $('#confirmRename').click(() => resolve($('#renameCharacter').val()));
      $('#cancelRename').click(() => reject());
    });

    //handles confirmation/cancellation of the rename
    text.then(
      function (value) {
        database.ref('users/' + user.uid + '/players/' + id + '/name')
          .set(value);
      },
      function () {
        console.log('rejected');
      }
    ).finally(function () {
      suopPopup.close();
    });
  }

  function recolorPlayer(e) {
    var domId = $(e.data.hostElement).attr('id');
    var id = domId.substring(0, domId.length - 5);
    closeRightClickMenu();

    //creates a popup with rename player content
    suopPopup.pop(html `
      <div>New Color</div>
      <input id="recolorPlayer" type="color" style="width: 10vmax; height: 40px; background-color: transparent; outline: none; border: none;" value="${$(
        e.data.hostElement
      ).css('background-color')}">
      <div style="text-align: right;">
        <a href="javascript:;" class="ripple" id="cancelRecolor"><i class="material-icons" style="padding:10px;padding-right: 5;cursor: pointer;">close</i></a>
        <a href="javascript:;" class="ripple" id="confirmRecolor"><i class="material-icons" style="padding:10px; cursor: pointer;padding-left: 5px;">check</i></a>
      </div>
    `);

    $('#confirmRecolor').focus();
    //awaits the color entered.
    var color = new Promise(function (resolve, reject) {
      $('#confirmRecolor').click(() => resolve($('#recolorPlayer').val()));
      $('#cancelRecolor').click(() => reject());
    });

    //handles confirmation/cancellation of the rename
    color
      .then(function (value) {
        database.ref('users/' + user.uid + '/players/' + id + '/color')
          .set(value);
      })
      .finally(function () {
        suopPopup.close();
      });
  }

  function reimagePlayer(e) {
    var domId = $(e.data.hostElement).attr('id');
    var id = domId.substring(0, domId.length - 5);
    closeRightClickMenu();
    //creates a popup with rename player content
    suopPopup.pop(html `
      <style>
         .player-reimage-content {
          width: 300px;
          height: 300px;
          height: 300px;
         }

        .player-reimage-content > input {
          display: none;
        }

        .player-reimage-content > #image-tab-holder {
          display: flex;
          justify-content: space-between;
        }

        #image-tab-holder > label {
          padding: 10px;
          border-radius: 2px;
          cursor: pointer;
        }
        #upload-image-radio:checked ~ #character-reimage-container {
          display: none;
        }
        #character-image-radio:checked ~ #image-tab-holder > #character-tab {
          background-color: #00000020;
        }
        
        #character-image-radio:checked ~ #image-upload-container {
          display: none;
        }
        #upload-image-radio:checked ~ #image-tab-holder > #upload-tab {
          background-color: #00000020;
        }

      </style>
      <div class="player-reimage-content">
        <input type="radio" name="reimagePlayer-radio" id="upload-image-radio" value="upload" checked>
        <input type="radio" name="reimagePlayer-radio" id="character-image-radio" value="character">
        <div id="image-tab-holder">
          <label class=" ripple" id="upload-tab" for="upload-image-radio">Upload Image</label>
          <label class=" ripple" id="character-tab" for="character-image-radio">Character Image</label>
        </div>
        <div id="image-upload-container">
        <div>Choose Your Image (1MB limit)</div>
        <label class="file-upload ripple">
          <input id="reimagePlayer" type="file" style="width: 10vmax; height: 40px; background-color: transparent; outline: none; border: none;" accept="image/png, image/jpeg, image/gif, image/jpg, image/webp">
          <span>
            Upload
          </span>
          <img id="image-upload-preview" width="200px">
        </label>
      </div>
      <div id="character-reimage-container">
        <div>Please type the character's name here.</div>
        <input id="character-image-chooser">
      </div>

      </div>

      <div style="text-align: right;">
        <a href="javascript:;" class="ripple" id="cancelReimage"><i class="material-icons" style="padding:10px;padding-right: 5;cursor: pointer;">close</i></a>
        <a href="javascript:;" class="ripple" id="confirmReimage"><i class="material-icons" style="padding:10px; cursor: pointer;padding-left: 5px;">check</i></a>
      </div>
    `);
    //awaits the image chosen.
    $('#reimagePlayer').on('change', () => {
      var file = $('#reimagePlayer')[0].files[0];
      $('#image-upload-preview').attr('src', URL.createObjectURL(file));
    });
    var image = new Promise(function (resolve, reject) {
      $('#confirmReimage').click(() => {
        switch ($("input[name='reimagePlayer-radio']:checked").val()) {
          case 'character':
            const characterList = Object.keys(basicCharData);
            var chosenCharacter = $('#character-image-chooser').val();
            if (characterList.includes(chosenCharacter)) {
              resolve(chosenCharacter);
            } else {
              $.mSnackbar.add({
                text: '<i style="color: #ef5350">Error: </i>Please type a valid character name'
              });
            }
            break;
          case 'upload':
            var file = $('#reimagePlayer')[0].files[0];
            //if a file has been chosen
            if (file) {
              console.log(file);
              if (file.size < 1024 * 1024) {
                resolve($('#reimagePlayer').val());
              } else {
                $.mSnackbar.add({
                  text: `<i style="color: #ef5350">Error: </i>File is too large (${Math.trunc(file.size / (1024 *1024))}MB/1MB)`
                });
              }
            } else {
              $.mSnackbar.add({
                text: '<i style="color: #ef5350">Error: </i>Please choose a file to upload'
              });
            }
            break;
        }
      });
      $('#cancelReimage').click(() => reject());
    });
    //handles confirmation/cancellation of the rename
    image.then(function (fileName) {
        switch ($("input[name='reimagePlayer-radio']:checked").val()) {
          case 'character':
            console.log(fileName);

            break;
          case 'upload':
            var uploadIndicatorId = `upload-percentage${domId}`;
            var file = $('#reimagePlayer')[0].files[0];
            var imageHtml = `
              <span class="character-image" id="${id}-image" style="display: none; background-image: url(${URL.createObjectURL(file)})"></span>
              `; //todo finalize character images.

            //#region updates profile picture in storage
            var uploadIndicator = $.mSnackbar.add({
              text: `Uploading <i id="${uploadIndicatorId}">0</i>%`,
              lifeSpan: Infinity,
              noCloseButton: true
            });
            var imageUpload = storageRef.child(
              `users/${user.uid}/images/${id}-profile-picture.${getFileExtension(fileName)}`
            ).put(file);
            imageUpload.on('state_changed', (snapshot) => {
              console.log((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              $('#' + uploadIndicatorId).html(Math.trunc(progress));
            });
            imageUpload.then((snapshot) => {
              console.log('Uploaded photo!');
              uploadIndicator.html('Upload complete!');
              setTimeout(() => uploadIndicator.close(), 3000);
            });
            //#endregion
            //updates path to picture in database
            database.ref('users/' + user.uid + '/players/' + id + '/image')
              .set(`users/${user.uid}/images/${id}-profile-picture.${getFileExtension(fileName)}`);

            //instantly changes html to match the uploading image
            $('#' + domId + '> .character-image').replaceWith(imageHtml);
            $('#' + domId).data('imagePath', `users/${user.uid}/images/${id}-profile-picture.${getFileExtension(fileName)}`);
            $('#' + domId + '> .character-image').fadeIn();
            break;
        }
      })
      .finally(function () {
        suopPopup.close();
      });
  }

  function getTileHtml({
    name,
    color,
    number,
    image,
    id,
  } = {}) {
    return html `
      <span class="tile-button invisible" id="${id}-tile" style="background-color: ${color}; display: none;">
        ${number ? '<span class="background-number">' + number + '</span>' : ''}
        <span class="character-image" id="${id}-image" style=""></span>
        <span class="name-plate">${name}</span>
        ${number? `<span class="foreground-number"><span class="inner-foreground-number"><span>` + number + `</span></span>`: ''}
        </span>
      </span>
    `;
  }

  function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  function loadAndChangeImage(player, id) {
    if (player.image && !player.image.includes('http')) {
      //if string is a path to a firebase storage file
      storageRef.child(
          player.image
        ).getDownloadURL()
        //translates the firebase storage url into one that actually leads to the file
        .then((url) => {
          //fades in the image.
          preloadImage(url).then((image) => {
            $('#' + id + '-loader').fadeOut(100, function () {
              $(this).remove();
            });
            $('#' + id + '-image').css('background-image',
              `url('${url}')`).css('display', 'none').fadeIn();
          });
        }).catch((error) => {
          console.log(error);
        });
    } else { //if image is a link to an image
      preloadImage(player.image).then((image) => {
        $('#' + id + '-loader').fadeOut(100, function () {
          $(this).remove();
        });
        $('#' + id + '-image').css('background-image',
          `url('${player.image}')`).fadeIn();
      });
    }
  }
});