var StartButton = function(playfield) {
  var _this = this;
  var holder = document.getElementById('playfield-holder');
  var levelText = document.getElementById('level-text');

  //<a-box id="start-button" color="#00ff00" position="0 -5 0" class="clickable"></a-box>

  //var startButton = document.getElementById('start-button');
  var startButton = document.getElementById('start-button');

  var clickBox = document.createElement('a-box');
  clickBox.setAttribute('color', '#00f');
  clickBox.setAttribute('scale', '0.05 0.25 1');  
  clickBox.setAttribute('position', '0 0.1 0.5');
  clickBox.setAttribute('class', 'clickable');
  clickBox.setAttribute('visible', false);
  startButton.append(clickBox);

  /*
  var triangle = document.createElement('a-triangle');
  triangle.setAttribute('color', '#191');
  triangle.setAttribute('rotation', '0 90 90');
  triangle.setAttribute('side', 'double');
  triangle.setAttribute('scale', '0.15 0.18 0.15');
  
  startButton.append(triangle);
*/

  /*
  var text = document.createElement('a-text');
  text.setAttribute('value', 'Start');
  text.setAttribute('scale', '1 1 1');
  text.setAttribute('side', 'double');
  text.setAttribute('color', '#fff');
  text.setAttribute('position', '0 0 1');
  text.setAttribute('rotation', '0 -90 0');
  startButton.append(text);
*/
  

  holder.append(startButton);

  clickBox.addEventListener('click', function() {
    g_sound.init();
    g_sound.playSound(SOUND_CLICK);
    playfield.startLevel();
  });

  clickBox.addEventListener('mouseenter', function() {
    //triangle.setAttribute('color', '#3f3');
    levelText.setAttribute('color', '#fff');
    g_sound.playSound(SOUND_CLICK);
  });

  clickBox.addEventListener('mouseleave', function() {
    //triangle.setAttribute('color', '#191');
    levelText.setAttribute('color', '#aaa');
  });

  _this.hide = function() {
    clickBox.setAttribute('class', '');
    startButton.object3D.visible = false;

  }

  _this.show = function() {
    clickBox.setAttribute('class', 'clickable');
    startButton.object3D.visible = true;
  }

  _this.setYPosition = function(y) {

    startButton.object3D.position.setY(y);
  }

}