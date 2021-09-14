
var g_scene = null;
var g_vrMode = -1;
var energyDiv = null;
var ENERGY_MAX = 8;
var mouseDownCount = 0;


AFRAME.registerComponent('game', {
  init: function() {
    g_scene = document.querySelector('a-scene');

    
    energyDiv = document.createElement('div');
    energyDiv.setAttribute('id', 'infoPanel');
    energyDiv.setAttribute('style', 'position: absolute; top: 0; left: 0; right: 0; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center;  color: white; font-family: arial, helvetica, sans-serif');
    var html = '';

    html += '<div style="display: flex; margin-bottom: 6px">'
    html += '<div style="margin-right: 6px; display: flex; align-items: center">Energy</div>';
    html += '<div style="display: flex; align-items: center">';
    for(var i = 0; i < 8; i++) {
      html += '<div id="energy_' + i + '" style="width: 16px; height: 16px; background-color: #0f0; margin-right: 4px"></div>'
    }
    html += '</div>';

    html += '<div id="restart-button" style="display: flex; align-items: center; margin-left: 8px; cursor: pointer; height: 20px; color: #eee; background-color: #333; padding: 6px">Restart Level</div>';
    html += '</div>';

    html += '<div style="display: flex" id="instructions"></div>';
    energyDiv.innerHTML = html;

    document.body.appendChild(energyDiv);
    
    document.getElementById('restart-button').addEventListener('click', function(e) {
      g_playfield.restartLevel();
    });


    g_playfield = new Playfield();
    g_playfield.init();

    g_sound = new Sound();

    document.addEventListener('mousedown', function(e) {
      g_sound.init();

      if(!g_vrMode) {
        if(mouseDownCount == 0) {
          mouseDownCount++;
          g_playfield.buttonDown(e);
        }
      }
    });

    document.addEventListener('mouseup', function(e) {
      if(!g_vrMode) {
        if(mouseDownCount > 0) {
          mouseDownCount--;
        }
        g_playfield.buttonUp(e);
      }
    });

  },

  tick: function(time, elapsedTime) {

    if(g_scene.is('vr-mode')) {
      if(g_vrMode === false || g_vrMode === -1) {        
        // enter vr        
        g_vrMode = true;
        energyDiv.style.display = 'none';
        g_playfield.modeChange();

//        g_playfield.setControllerInfoVisible(true);
        
      }
    } else {            
      if(g_vrMode === true || g_vrMode === -1) {
        // enter non vr mode

        g_vrMode = false;
        energyDiv.style.display = 'flex';
        g_playfield.modeChange();
//        g_playfield.setControllerInfoVisible(false);

      }
    }

    if(g_playfield == null) {
      
    }


    while(elapsedTime > 0) {
      var timeDelta = 40;

      if(timeDelta > elapsedTime) {
        timeDelta = elapsedTime;
      }
      elapsedTime -= timeDelta;
      
      g_playfield.tick(time, timeDelta);
    }    
  }
});