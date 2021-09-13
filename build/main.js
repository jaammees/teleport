
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

var g_startLevel = 0;
var g_playfield = null;
var g_playfieldScale = 1;
var g_raycaster = null;

var g_leftButtonDownCount = 0;
var g_rightButtonDownCount = 0;



var STATE_LEVEL_PREVIEW         = 0;
var STATE_PLAYING               = 1;
var STATE_IN_TELEPORT           = 2;
var STATE_LEVEL_FINISHED        = 3;
var STATE_TELEPORT_NEXT         = 4;
var STATE_GAME_OVER             = 5;

var Playfield = function() {
  var currentLevel = 0;
  var currentPadIndex = false;

  // set to false if player has gone off pad
  var onPad = true;
  var offPadTime = false;
  var offPadWarningGiven = false;
  var warningNumber = false;

  var buttonRestartWarningGiven = false;
  var buttonRestartTime = false;

  var _this = this;
  var vrMode = -1;
  var player = null;
  var gameState = STATE_LEVEL_PREVIEW;
  var playfieldMin = new THREE.Vector3();
  var playfieldMax = new THREE.Vector3();
  var xMid = 0;
  var zMid = 0;
  var lastUpdateTime = 0;
  var finishedTime = 0;
  var camera = null;
  var cameraOffset = null;
  var cameraOffsetX = false;
  var cameraOffsetZ = false;

  var laserRight = null;
  var leftInfo = null;
  var laserLeft = null;
  var rightInfo = null;

  var pads = [];
  var collisionObjects = [];

  var playerEntity = null;
  var playerShadow = null;
  var playerCollisionBox = null;
  var playerPosition = new THREE.Vector3();
  var playerStart = new THREE.Vector3();
  var exitEntity = null;
  var exitText = null;
  var exit = null;

  var levelText = null;
  var startButton = null;

  var playfield = null;
  var levelInfo = null;
  var playfieldHolder = null;


  var infoPanels = [];
  var leftButtonDownTime = false;
  var rightButtonDownTime = false;

  var threeJSScene = g_scene.object3D;

  var energyBlocks = [];
  var energyFrom = new THREE.Vector3();
  var energyTo = new THREE.Vector3();
  var energyTransferring = false;
  var energyVector = new THREE.Vector3();
  var vectorZero = new THREE.Vector3(0, 0, 0);
  var lastEnergyTransfer = 0;

  _this.setEnergyFromTo = function(from, to) {
    energyFrom.set(from.x, from.y + 0.3, from.z);
    energyTo.set(to.x, to.y, to.z);
  }

  _this.setEnergyTransferring = function(transferring) {
    energyTransferring = transferring;
  }

  _this.updateEnergyBlocks = function(time, timeDelta) {

    for(var i = 0; i < energyBlocks.length; i++) {
      if(energyBlocks[i].mesh.visible) {
        var mesh = energyBlocks[i].mesh;
        

        energyVector.set(energyTo.x - mesh.position.x, energyTo.y - mesh.position.y, energyTo.z - mesh.position.z);
        var distance = vectorZero.distanceTo(energyVector);
        energyVector.normalize();

        var travel = timeDelta * 0.008;
        if(travel > distance) {
          travel = distance;
        }

        if(travel < 0.001) {
          mesh.visible = false;
        } else {
          mesh.position.set(mesh.position.x + travel * energyVector.x, 
            mesh.position.y + travel * energyVector.y,
            mesh.position.z + travel * energyVector.z)
        }
      }
    }

    if(energyTransferring) {
      if(time - lastEnergyTransfer > 50) {
        for(var i = 0; i < energyBlocks.length; i++) {
          if(energyBlocks[i].mesh.visible == false) {
            energyBlocks[i].mesh.visible = true;
            g_sound.playSound(SOUND_ENERGY);
            
            energyBlocks[i].mesh.position.set(
              energyFrom.x + Math.random() * 0.4 - 0.2, 
              energyFrom.y  + Math.random() * 0.4 - 0.2, 
              energyFrom.z  + Math.random() * 0.4 - 0.2);
            break;
          }
        }
        lastEnergyTransfer = time;
      }
    }
  }


  var energyDrainBlocks = [];
  var energyDrainFrom = new THREE.Vector3();
  var energyDrainTo = new THREE.Vector3();
  var energyDrainTransferring = false;
  var energyDrainVector = new THREE.Vector3();
  var lastEnergyDrainTransfer = 0;


  _this.setEnergyDrainFromTo = function(from, to) {
    energyDrainFrom.set(from.x, from.y, from.z);
    energyDrainTo.set(to.x, to.y + 1.5, to.z);
  }

  _this.setEnergyDrainTransferring = function(transferring) {
    energyDrainTransferring = transferring;
  }

  _this.updateEnergyDrainBlocks = function(time, timeDelta) {

    for(var i = 0; i < energyDrainBlocks.length; i++) {
      if(energyDrainBlocks[i].mesh.visible) {
        var mesh = energyDrainBlocks[i].mesh;
        

        energyDrainVector.set(energyDrainTo.x - mesh.position.x, energyDrainTo.y - mesh.position.y, energyDrainTo.z - mesh.position.z);
        var distance = vectorZero.distanceTo(energyDrainVector);
        energyDrainVector.normalize();

        var travel = timeDelta * 0.008;
        if(travel > distance) {
          travel = distance;
        }

        if(travel < 0.001) {
          mesh.visible = false;
        } else {
          mesh.position.set(mesh.position.x + travel * energyDrainVector.x, 
            mesh.position.y + travel * energyDrainVector.y,
            mesh.position.z + travel * energyDrainVector.z)
        }
      }
    }

    if(energyDrainTransferring) {
      if(time - lastEnergyDrainTransfer > 40) {
        for(var i = 0; i < energyDrainBlocks.length; i++) {
          if(energyDrainBlocks[i].mesh.visible == false) {
            energyDrainBlocks[i].mesh.visible = true;
            g_sound.playSound(SOUND_ENERGY2);
            energyDrainBlocks[i].mesh.position.set(
              energyDrainFrom.x + Math.random() * 0.4 - 0.2, 
              energyDrainFrom.y  + Math.random() * 0.4 - 0.2, 
              energyDrainFrom.z  + Math.random() * 0.4 - 0.2);
            break;
          }
        }
        lastEnergyDrainTransfer = time;
      }
    }
  }

  

  function createPlayerEntity() {
    playerEntity = document.createElement('a-entity');
    playerEntity.setAttribute('class', 'non-removable');


    var geometry = new THREE.ConeGeometry( 0.4, 1.8, 3 );
    var playerMaterial = new THREE.MeshStandardMaterial( {color: 0xffff00, transparent: true } );
    playerMaterial.flatShading = true;
    var playerMesh = new THREE.Mesh( geometry, playerMaterial );
    playerMesh.position.set(0, 0.9, 0);
    playerEntity.setObject3D('mesh', playerMesh);

    var headGeometry = new THREE.IcosahedronGeometry( 0.4, 1 );
    var playerHead = new THREE.Mesh( headGeometry, playerMaterial );
    playerHead.position.set(0, 0.7, 0);

    playerMesh.add(playerHead);


    var triangle = document.createElement('a-triangle');
    triangle.setAttribute('color', '#eee');
    triangle.setAttribute('rotation', '0 270 90');
    triangle.setAttribute('side', 'double');
    triangle.setAttribute('scale', '0.2 0.26 0.2');
    triangle.setAttribute('position', '0 1.65 -0.7');
    
    playerEntity.append(triangle);

    
    var text = document.createElement('a-text');
    text.setAttribute('value', 'Start Position');
    text.setAttribute('scale', '3 3 3');
    text.setAttribute('side', 'double');
    text.setAttribute('color', '#bbb');
    text.setAttribute('position', '0 3 2');
    text.setAttribute('rotation', '0 90 0');
    playerEntity.append(text);


    playerCollisionBox = document.getElementById('player-collision-box');
    

    playfield.append(playerEntity);
  }

  function createExitEntity() {

    exitEntity = document.createElement('a-entity');
    exitEntity.setAttribute('class', 'non-removable');

    exit = new Exit(exitEntity);

    exitText = document.createElement('a-text');
    exitText.setAttribute('value', 'Exit');
    exitText.setAttribute('scale', '3 3 3');
    exitText.setAttribute('side', 'double');
    exitText.setAttribute('color', '#bbb');
    exitText.setAttribute('position', '0 3 0.6');
    exitText.setAttribute('rotation', '0 90 0');
    exitEntity.append(exitText);

    playfield.append(exitEntity);
  }

  _this.showEnergy = function() {
    var energy = player.getEnergy();
    for(var i = 0; i < ENERGY_MAX; i++) {
      var div = document.getElementById('energy_' + i);
      if(i < energy) {
        div.style.backgroundColor = '#0f0';
      } else {
        div.style.backgroundColor = '#111';
      }
    }
    for(var i = 0; i < infoPanels.length; i++) {
      infoPanels[i].setEnergy(energy);
    }
  }

  function animateTeleportNext(time, timeDelta) {
    if(time - finishedTime > 2) {
      nextLevel();
    }
  }

  function nextLevel() {
    currentLevel++;
    if(currentLevel >= g_levels.length) {
      currentLevel = 0;
      speak('Congratulations, you have finished all of the levels');
    }
    
    _this.gotoLevel(currentLevel);
  }


  _this.buildCollisionObjectList = function() {
    collisionObjects = [];

    for(var i = 0; i < pads.length; i++) {
      if(pads[i].getIsSolid()) {
        var o = pads[i].getObject();

        collisionObjects.push(o);//.children[0]);
      }
    }

    if(gameState == STATE_PLAYING) {
      playerCollisionBox.object3D.isPlayer = true;
      if(playerCollisionBox.object3D.children.length > 0) {
        playerCollisionBox.object3D.children[0].isPlayer = true;
        collisionObjects.push(playerCollisionBox.object3D.children[0]);
      }

      collisionObjects.push(playerCollisionBox.object3D);
    }
  }

  _this.getCollisionObjects = function() {
    return collisionObjects;
  }


  _this.init = function() {  
    player = new Player(this);
    playerShadow = document.getElementById('player-shadow');
    playfield = document.getElementById('playfield');
    playfieldHolder = document.getElementById('playfield-holder');
    levelText = document.getElementById('level-text');
    camera = document.getElementById('camera');
    cameraOffset = document.getElementById('camera-offset');
    levelInfo = document.getElementById('level-info');

    g_raycaster = new THREE.Raycaster();
    g_raycaster.near = 0;
    g_raycaster.far = 10000;

    laserLeft = document.getElementById('laser-left');
    leftInfo = new InfoPanel(document.getElementById('left-info'));
    infoPanels.push(leftInfo);

    
    var energyMaterial = new THREE.MeshStandardMaterial( {color: 0x6666ff, transparent: true, opacity: 1, emissive: 0x4444aa } );
    var energyMaterial2 = new THREE.MeshStandardMaterial( {color: 0xffffff, transparent: true, opacity: 1, emissive: 0xffffff } );

    energyMaterial.flatShading = true;
    var energyGeometry = new THREE.BoxGeometry( 0.05, 0.05, 0.05 );

    for(var i = 0; i < 30; i++) {
      var mesh = false;

      if(Math.random() > 0.7) {
        mesh = new THREE.Mesh(energyGeometry, energyMaterial);
        var scale = 0.5 + Math.random() * 0.5;
        mesh.scale.set(scale, scale, scale);
      } else {
        mesh = new THREE.Mesh(energyGeometry, energyMaterial2);
        var scale = Math.random() * 0.3;
        mesh.scale.set(scale, scale, scale);
      }
      //mesh.visible = false;
      energyBlocks.push({
        mesh: mesh
      });
      threeJSScene.add(mesh);
    }

    for(var i = 0; i < 30; i++) {
      var mesh = false;
      if(Math.random() > 0.7) {
        mesh = new THREE.Mesh(energyGeometry, energyMaterial);
        var scale = 0.5 + Math.random() * 0.5;
        mesh.scale.set(scale, scale, scale);
      } else {
        mesh = new THREE.Mesh(energyGeometry, energyMaterial2);
        var scale = Math.random() * 0.4;
        mesh.scale.set(scale, scale, scale);
      }

      energyDrainBlocks.push({
        mesh: mesh
      });
      threeJSScene.add(mesh);
    }


    laserLeft.addEventListener('buttondown', function(e) {

      leftButtonDownTime = lastUpdateTime;
      leftInfo.setButtonDown(true);

      if(g_leftButtonDownCount == 0) {
        g_leftButtonDownCount++;
        _this.buttonDown(e);
      }

      if(gameState === STATE_LEVEL_PREVIEW) {
        _this.startLevel();
      }

    });



    laserLeft.addEventListener('buttonup', function(e) {

      if(g_leftButtonDownCount > 0) {
        g_leftButtonDownCount--;
      }
      leftInfo.setButtonDown(false);

      leftButtonDownTime = false;
      if(rightButtonDownTime === false) {
        buttonRestartWarningGiven = false;
      }

      _this.buttonUp(e);
    });


    laserRight = document.getElementById('laser-right');
    rightInfo = new InfoPanel(document.getElementById('right-info'));
    infoPanels.push(rightInfo);

    laserRight.addEventListener('buttondown', function(e) {
      rightButtonDownTime = lastUpdateTime;
      rightInfo.setButtonDown(true);

      if(gameState === STATE_LEVEL_PREVIEW) {
        _this.startLevel();
      }


      if(g_rightButtonDownCount == 0) {
        g_rightButtonDownCount++;

        _this.buttonDown(e);
      }
    });
    laserRight.addEventListener('buttonup', function(e) {
      if(g_rightButtonDownCount > 0) {
        g_rightButtonDownCount--;
      }
      rightInfo.setButtonDown(false);

      rightButtonDownTime = false;
      if(leftButtonDownTime === false) {
        buttonRestartWarningGiven = false;
      }

      _this.buttonUp(e);

    });

    startButton = new StartButton(this);

    _this.gotoLevel(g_startLevel);
  }

  _this.buttonDown = function(e) {
    for(var i = 0; i < pads.length; i++) {
      pads[i].buttonDown(e);
    }
  }

  _this.buttonUp = function(e) {
    for(var i = 0; i < pads.length; i++) {
      pads[i].buttonUp(e);
    }
  }


  _this.clearLevel = function() {
    for(var i = 0; i < pads.length; i++) {
      pads[i].cleanup();
    }
    pads = [];

    while(playfield.children.length > 0) {
      var removeIndex = false;
      for(var i = 0; i < playfield.children.length; i++) {
        if(playfield.children[i].getAttribute('class') !== 'non-removable') {
          removeIndex = i;
          break;
        }
      }
      if(removeIndex === false) {
        break;
      } else {
        playfield.removeChild(playfield.children[removeIndex]);
      }
    }
  }

  _this.setControllerInfoVisible = function(visible) {

    
    document.getElementById('left-info').object3D.visible = visible;
    document.getElementById('right-info').object3D.visible = visible;
  }

  var clearInstructions = function() {
    document.getElementById('instructions').innerHTML = '';
  }

  var setInstructions = function() {
    var instructionText = '';
    for(var i = 0; i < 4; i++) {
      var t = '';
      if(i < g_levels[currentLevel].text.length) {
        t = g_levels[currentLevel].text[i];
      }
      instructionText += ' ' + t;
      leftInfo.setText(i, t);
      rightInfo.setText(i, t);

    }
    document.getElementById('instructions').innerHTML = instructionText;
    speak(instructionText);

  }

  _this.modeChange = function() {
    if(g_vrMode) {
      _this.setControllerInfoVisible(true);
      playerShadow.object3D.visible = false;
    } else {
      _this.setControllerInfoVisible(false);
      playerShadow.object3D.visible = true;
    }

    if(gameState == STATE_LEVEL_PREVIEW) {
      setPlayfieldPreviewPosition();
    }

  }


  _this.restartLevel = function() {
    _this.gotoLevel(currentLevel);
  }

  function setPlayfieldPreviewPosition() {
    //resetCamera();

    if(g_vrMode) {
      
    //  cameraOffsetX = -camera.object3D.position.x;
    //  cameraOffsetZ = -camera.object3D.position.z;
  
      playfield.setAttribute('position', new THREE.Vector3(-xMid * g_playfieldScale, 1, zMid * g_playfieldScale));
      levelInfo.setAttribute('position', '0 1 -0');
      startButton.setYPosition(1.8);
    } else {
      playfield.setAttribute('position', new THREE.Vector3(-xMid * g_playfieldScale, 1.4, zMid * g_playfieldScale));
      levelInfo.setAttribute('position', '0 0.1 0');
      startButton.setYPosition(0.86);
    }
  }

  _this.gotoLevel = function(level) {
    
    clearInstructions();  
    if(leftInfo != null) {
      leftInfo.setRestartText('');
    }

    if(rightInfo != null) {
      rightInfo.setRestartText('');
    }

    // clear the old level
    _this.clearLevel();


    currentLevel = level;
    gameState = STATE_LEVEL_PREVIEW;


    for(var i = 0; i < 4; i++) {
      if(leftInfo != null) {
        leftInfo.setText(i, '');
      }

      if(rightInfo != null) {
        rightInfo.setText(i, '');
      }
    }

    var text = level + 1;
    levelText.setAttribute('value', 'Level ' + text);
    //speak('Level ' + text);


    _this.build();


    zMid = (playfieldMax.z + playfieldMin.z) / 2;
    xMid = (playfieldMax.x + playfieldMin.x) / 2;

    // move the playfield so it's centre is at 0, 0, 0
    g_playfieldScale = 0.08;

    setPlayfieldPreviewPosition();
    playfield.setAttribute('scale', new THREE.Vector3(g_playfieldScale, g_playfieldScale, g_playfieldScale));
    playfield.setAttribute('rotation', '0 180 0');
    

    // move the player so they are facing the playfield from the side
    player.setPosition(-1.2, 0, 0, 0, -90, 0);
    resetCamera();

    if(!g_vrMode || g_vrMode === -1) {
      camera.setAttribute('look-controls', false);
      camera.setAttribute('wasd-controls', false);
  
      camera.object3D.rotation.set(0,0,0);
      camera.setAttribute('rotation', '0 0 0');

      camera.setAttribute('look-controls', true);
      camera.setAttribute('wasd-controls', true);

      camera.components["look-controls"].pitchObject.rotation.x = 0;
      camera.components["look-controls"].yawObject.rotation.y = 0;      
    }


    startButton.show();
    playerEntity.object3D.visible = true;
    levelText.object3D.visible = true;
    exitText.object3D.visible = true;

  }

  _this.getGameState = function() {
    return gameState;
  }

  function resetCamera() {
    cameraOffsetX = -camera.object3D.position.x;
    cameraOffsetZ = -camera.object3D.position.z;

    cameraOffset.object3D.position.setX(cameraOffsetX);
    cameraOffset.object3D.position.setZ(cameraOffsetZ);
    /*
    camera.setAttribute('look-controls', false);
    camera.setAttribute('wasd-controls', false);
    camera.object3D.position.setX(0);
    camera.object3D.position.setZ(0);
    camera.setAttribute('look-controls', true);
    camera.setAttribute('wasd-controls', true);
    */


  }


  function unhighlightAllPads() {
    for(var i = 0; i < pads.length; i++) {
      pads[i].unhighlight();
    }
  }

  _this.startLevel = function() {

    if(gameState == STATE_PLAYING) {
      return;
    }

    for(var i = 0; i < pads.length; i++) {
      pads[i].setClickable(true);
    }
    
    var startRotation = 0;

    unhighlightAllPads();
    
    player.startTeleport(playerStart.x, playerStart.y, playerStart.z, 0, 0, 0, function(teleportState, padType) {
      playerEntity.object3D.visible = false;
      exitText.object3D.visible = false;

      //camera.setAttribute('position', '0')

      //camera.object3D.position.setX(0);

      //camera.object3D.position.setZ(0);
      resetCamera();
      player.setPosition(playerStart.x, playerStart.y, playerStart.z, 0, startRotation, 0);

      if(teleportState == 'arrived') {
        unhighlightAllPads();
        playfield.setAttribute('position', new THREE.Vector3(0, 0, 0));
        playfield.setAttribute('rotation', '0 0 0');
        g_playfieldScale = 1;
        playfield.setAttribute('scale', '1 1 1');
        levelText.object3D.visible = false;
        startButton.hide();

        setInstructions();
        //if(g_levels[currentLevel].text != '') {
          
        //}
      }
    });
    gameState = STATE_PLAYING;
    onPad = true;
  }

  _this.build = function() {
    
    playfieldMin.x = 10000;
    playfieldMin.y = 10000;
    playfieldMin.z = 10000;

    playfieldMax.x = -10000;
    playfieldMax.y = -10000;
    playfieldMax.z = -10000;

    var levelData = g_levels[currentLevel].data;
    var startRotation = g_levels[currentLevel].startRotation;

    rotationSpeed = 70;

    if(typeof g_levels[currentLevel].robotSpeed != 'undefined') {
      rotationSpeed = g_levels[currentLevel].robotSpeed;
    }


    for(var i = 0; i < levelData.length; i++) {
      var type = levelData[i][0];
      var padIndex = pads.length;

      var pad = new Pad(_this, playfield, padIndex, type);    
      playfield.append(pad.getEntity());
      playfieldMin.x = Math.min(playfieldMin.x, levelData[i][1]);
      playfieldMin.y = Math.min(playfieldMin.y, levelData[i][2]);
      playfieldMin.z = Math.min(playfieldMin.z, levelData[i][3]);

      playfieldMax.x = Math.max(playfieldMax.x, levelData[i][1]);
      playfieldMax.y = Math.max(playfieldMax.y, levelData[i][2]);
      playfieldMax.z = Math.max(playfieldMax.z, levelData[i][3]);

      pad.setPosition(levelData[i][1],levelData[i][2],levelData[i][3]);
      pad.setRotation(levelData[i][4],levelData[i][5],levelData[i][6]);
      pad.setClickable(false);

      pads.push(pad);

      player.setEnergy(g_levels[currentLevel].energy);
      if(type == START_PAD) {
        if(playerEntity == null) {
          createPlayerEntity();
        }
        playerEntity.setAttribute('position', new THREE.Vector3(levelData[i][1], levelData[i][2], levelData[i][3]));

        playerEntity.setAttribute('rotation', new THREE.Vector3(0, startRotation, 0));
        playerStart.set(levelData[i][1], levelData[i][2], levelData[i][3]);
        currentPadIndex = padIndex;
      }

      if(type == 2) {
        if(exitEntity == null) {
          createExitEntity();
        }
        exitEntity.setAttribute('position', new THREE.Vector3(levelData[i][1], levelData[i][2], levelData[i][3]));
      }
    }
    collisionObjects = [];
//    _this.buildCollisionObjectList();
  }

  _this.getCurrentPadIndex = function() {
    return currentPadIndex;
  }

  _this.getOnPad = function() {
    return onPad;
  }
 
  _this.noEnergy = function() {

    if(leftInfo != null) {
      leftInfo.setText(0, 'No Energy');
      leftInfo.setText(1, 'Hold button for 1 second');
      leftInfo.setText(2, 'to restart level');
      leftInfo.setText(3, '');
    }

    if(rightInfo != null) {
      rightInfo.setText(0, 'No Energy');
      rightInfo.setText(1, 'Hold button for 1 second');
      rightInfo.setText(2, 'to restart level');
      rightInfo.setText(3, '');
    }

  }

  _this.hasEnergy = function() {
    for(var i = 0; i < 4; i++) {
      var t = '';
      if(i < g_levels[currentLevel].text.length) {
        t = g_levels[currentLevel].text[i];
      }
      if(leftInfo != null) {      
        leftInfo.setText(i, t);
      }

      if(rightInfo != null) {
        rightInfo.setText(i, t);
      }
    }
  }
  

  _this.teleportPlayer = function(x, y, z, rx, rz, padIndex, padType, callback) {


    if(player.getEnergy() == 0) {
      if(g_vrMode) {
        speak("No energy to teleport, hold the button for one second to restart");
      } else {
        speak("No energy to teleport");
      }

      return;
    }

    if(padType == 2) {
      g_sound.playSound(SOUND_DONE);

    } else {
      g_sound.playSound(SOUND_TELEPORT);
    }

    gameState = STATE_IN_TELEPORT;
    player.startTeleport(x, y, z, rx, rz, padType, function(teleportState, padType) {
      currentPadIndex = padIndex;
      resetCamera();

      for(var i = 0; i < pads.length; i++) {
        pads[i].playerTeleported(padIndex, padType);
      }

      if(typeof callback != 'undefined') {
        callback();
      }

      if(teleportState == 'finished') {
        gameState = STATE_PLAYING;

        if(padType == 2) {
          gameState = STATE_LEVEL_FINISHED;
          finishedTime = lastUpdateTime;
          speak('Level Complete. Well done');
        }
      }
    });
    player.decreaseEnergy(padType !== EXIT_PAD);

  }

  // get player position in world coordinates
  _this.getPlayerPosition = function() {
    
    playerCollisionBox.object3D.getWorldPosition(playerPosition);
    return playerPosition;
  }

  _this.getPlayer = function() {
    return player;
  }

  _this.increasePlayerEnergy = function() {
    player.increaseEnergy();

    g_sound.playSound(SOUND_ADD_ENERGY);
  }

  _this.decreasePlayerEnergy = function() {
    player.decreaseEnergy();
  }

  _this.gameOver = function() {

    if(gameState !== STATE_GAME_OVER) {
      g_sound.playSound(SOUND_GAME_OVER);

      speak('Energy Drained. Game Over');
      _this.setEnergyTransferring(false);
      _this.setEnergyDrainTransferring(false);
      gameState = STATE_GAME_OVER;
      finishedTime = lastUpdateTime;
    }
  }

  _this.tick = function(time, timeDelta) {

    if(gameState == STATE_LEVEL_PREVIEW) {
      
    }

    if(gameState == STATE_LEVEL_FINISHED) {
      if(time - finishedTime > 3200) {
        gameState = STATE_TELEPORT_NEXT;
        finishedTime = time;
      }
    }

    if(gameState == STATE_GAME_OVER) {
      if(time - finishedTime > 3600) {
        _this.gotoLevel(currentLevel);
      }
    }

    if(gameState == STATE_TELEPORT_NEXT) {
      animateTeleportNext(time, timeDelta);
    }


    _this.buildCollisionObjectList();
    for(var i = 0; i < pads.length; i++) {
      pads[i].tick(time, timeDelta);
    }

    var cameraPosition = camera.object3D.position;

    playerShadow.object3D.position.setX(cameraPosition.x + cameraOffsetX);
    playerShadow.object3D.position.setZ(cameraPosition.z + cameraOffsetZ);

    playerCollisionBox.object3D.position.setX(cameraPosition.x + cameraOffsetX);
    playerCollisionBox.object3D.position.setZ(cameraPosition.z + cameraOffsetZ);
    playerCollisionBox.object3D.position.setY(cameraPosition.y - 0.24);

    if(gameState == STATE_PLAYING) {


      var distanceFromPad = Math.sqrt( 
        (cameraPosition.x + cameraOffsetX) * (cameraPosition.x + cameraOffsetX) 
        + (cameraPosition.z + cameraOffsetZ) * (cameraPosition.z + cameraOffsetZ)
      );


      if(leftButtonDownTime !== false || rightButtonDownTime !== false) {
        var inAbsorb = false;       
        for(var i = 0; i < pads.length; i++) {
          if(pads[i].getInAbsorb()) {
            inAbsorb = true;
            break;
          }
        }

        if(inAbsorb) {
          if(leftButtonDownTime !== false) {
            leftButtonDownTime = time;
          }

          if(rightButtonDownTime !== false) {
            rightButtonDownTime = time;
          }
        }
      }


      if( (leftButtonDownTime !== false && time - leftButtonDownTime > 1200) || (rightButtonDownTime !== false && time - rightButtonDownTime > 2000) ) {
        

        if(!inAbsorb) {
          if(!buttonRestartWarningGiven) {
            speak("Button held for one second, the level will restart in three");
            if(leftInfo != null) {
              leftInfo.setRestartText('Restarting Level...');
            }

            if(rightInfo != null) {
              rightInfo.setRestartText('Restarting Level...');
            }
            buttonRestartWarningGiven = true;
            buttonRestartTime = time;
            warningNumber = 3;
          }

          if(warningNumber == 3 && time - buttonRestartTime > 4600) {
            speak("two");
            warningNumber--;
          }

          if(warningNumber == 2 && time - buttonRestartTime > 5400) {
            speak("one");
            warningNumber--;
          }

          if(warningNumber == 1 && time - buttonRestartTime > 6200) {
            speak('level restart');
            _this.gotoLevel(currentLevel);
          }
        }

      
      } else {
        if(buttonRestartWarningGiven) {

          if(leftInfo != null) {
            leftInfo.setRestartText('');
          }

          if(rightInfo != null) {
            rightInfo.setRestartText('');
          }
        }
        buttonRestartWarningGiven = false;
      }
      
      if(distanceFromPad > 1.5) {
        if(onPad) {
          onPad = false;
          offPadTime = time;
          offPadWarningGiven = false;
          warningNumber = 3;
        }

        if(time - offPadTime > 400 && !offPadWarningGiven) {
          speak("You are not on your pad, the level will restart in three");
          offPadWarningGiven = true;
          warningNumber = 3;
          offPadTime = time + 3000;
        }

        if(offPadWarningGiven) {
          if(warningNumber == 3 && time - offPadTime > 1000) {
            speak("two");
            warningNumber--;
            offPadTime = time;
          }

          if(warningNumber == 2 && time - offPadTime > 1000) {
            speak("one");
            warningNumber--;
            offPadTime = time;
          }

          if(warningNumber == 1 && time - offPadTime > 1600) {
            speak('level restart');
            _this.gotoLevel(currentLevel);
          }
        }

      } else {
        if(onPad === false) {
          speak("You are back on your pad");
        }
        onPad = true;
        offPadWarningGiven = false;
      }
    }

    lastUpdateTime = time;
    player.tick(time, timeDelta);
    exit.tick(time, timeDelta);
    _this.updateEnergyBlocks(time, timeDelta);
    _this.updateEnergyDrainBlocks(time, timeDelta);
  }
}

var Player = function(playfield) {
  var _this = this;
  var player = document.getElementById('player');

  var teleportHolder = document.getElementById('camera');


  var teleportEntities = [];

  var teleportTo = new THREE.Vector3();
  var teleportToRotation = new THREE.Vector3();
  var teleportCallback = false;
  var teleportStep = false;
  var teleportDirection = false;
  var lastUpdate = 0;
  var teleportPadType = false;


  var rotY = 0;
  

  var energy = 8;

  
  var setupTeleportOld = function() {

    var i;
    var segments = 10;
    for(i = 0; i < segments; i++) {
      var angle = i * 360 / segments;
      var radius = 0.07;
      
      var x = -Math.sin(angle * 2 * Math.PI / 360 ) * radius;
      var z = -Math.cos(angle * 2 * Math.PI / 360) * radius;

      var box = document.createElement('a-box');
      box.setAttribute('scale', '0.05 0.04 0.001');
      box.setAttribute('color', '#ffffff');

      if(i == 0) {
        box.setAttribute('color', '#ffffff');
      } else if(i == 1) {
        box.setAttribute('color', '#ff0000');

      } else if (i == 2) {
        box.setAttribute('color', '#00ff00');
      } else if (i == 3) {
        box.setAttribute('color', '#00ffff');
      } else {
        box.setAttribute('color', '#ff00ff');

      }
      box.setAttribute('position', new THREE.Vector3(x, 1.6, z));
      box.setAttribute('rotation', new THREE.Vector3(0, angle, 0));
      box.object3D.visible = false;
      player.append(box);
    }
  }


  var setupTeleport = function() {
    
    var segments = 40;//18;//50;

    var radius = 1;

    var circumference = 2 * Math.PI * radius;
    var segmentSize = circumference / segments + 0.1;

    var angle = 0;
    var vertAngle = 0;
    var vertX = 0;
    var vertY = 0;

    var sliceRadius;
    var sliceCircumference;
    var sliceSegments;

    var count = 0;

    for(var j = 0; j < segments; j++) {
      vertAngle = j * Math.PI * 2 / segments;
      vertX = radius * Math.cos(vertAngle);
      vertY = radius * Math.sin(vertAngle);

      sliceRadius = vertX;//Math.sqrt(vertX * vertX + vertY * vertY);
      sliceCircumference = 2 * Math.PI * sliceRadius;
      sliceSegments = Math.round(sliceCircumference / segmentSize + 0.5);


      var row = [];

      for(var i = 0; i <= sliceSegments; i++) {
        angle = i * Math.PI * 2 / sliceSegments;
        var x = sliceRadius * Math.cos(angle);
        var z = sliceRadius * Math.sin(angle);

        var box = document.createElement('a-plane');
        var scaleX = segmentSize - 0.04 + 0.15;
        var scaleY = segmentSize - 0.1 + 0.16;
        var scaleZ = 0.007;

        box.setAttribute('scale', new THREE.Vector3(scaleX, scaleY, scaleZ));
        box.setAttribute('color', '#333333');
        box.setAttribute('material', 'side: double;shader: flat;');
        box.setAttribute('position', new THREE.Vector3(x, vertY + 1, z));
        box.setAttribute('rotation', new THREE.Vector3(-(j * 360 / segments), 180 / 2 - (i * 360 / sliceSegments), 0));
        box.yPosition = vertY;
        box.object3D.visible = false;

        teleportHolder.append(box);
        row.push(box);
        count++;        
      }

      if(row.length > 0) {
        teleportEntities.push(row);
      }

    }

    teleportEntities.sort(function(a,b) { 
      var v = a[0].yPosition - b[0].yPosition;

      return v;
    })

  }

  _this.getPosition = function() {
    return player.getAttribute('position');
  }

  _this.getEnergy = function() {
    return energy;
  }

  _this.increaseEnergy = function() {
    if(energy < ENERGY_MAX) {
      if(energy == 0) {
        playfield.hasEnergy();
      }
      energy++;
      playfield.showEnergy();
    }
  }

  _this.decreaseEnergy = function(warning) {
    if(energy > 0) {
      energy--;
      playfield.showEnergy();

      if(energy == 0) {
        if(typeof warning === 'undefined' || warning === true) {
          speak('Warning, zero energy');
        }
        
        playfield.noEnergy();
      }
    } else {
      playfield.gameOver();
    }
  }

  _this.setEnergy = function(e) {
    energy = e;
    playfield.showEnergy();
  }
  
  _this.startTeleport = function(x, y, z, rx, rz, padType, callback) {
    if(energy <= 0) {
      return;
    }
    teleportTo.set(x, y, z);
    teleportToRotation.set(rx, rotY, rz);
    teleportStep = 0;
    teleportDirection = 1;
    teleportPadType = padType;

    teleportCallback = callback;

//    energy--;
//    playfield.showEnergy();
  }

  _this.updateTeleport = function() {
    if(teleportDirection === 1) {
      for(var i = 0; i < teleportEntities[teleportStep].length; i++) {
        teleportEntities[teleportStep][i].object3D.visible = true;
        teleportEntities[teleportStep][i].setAttribute('color', '#ffffff');
      }

      if(teleportStep > 0) {
        for(var i = 0; i < teleportEntities[teleportStep - 1].length; i++) {
          teleportEntities[teleportStep - 1][i].setAttribute('color', '#cccccc');
        }
      }

      if(teleportStep > 1) {
        for(var i = 0; i < teleportEntities[teleportStep - 1].length; i++) {
          teleportEntities[teleportStep - 1][i].setAttribute('color', '#aaaaaa');
        }
      }


      teleportStep++;

      if(teleportStep >= teleportEntities.length) {
        teleportStep = 0;
        teleportDirection = -1;
        _this.moveToTeleport();
      }
    } else if(teleportDirection === -1) {
      for(var i = 0; i < teleportEntities[teleportStep].length; i++) {
        teleportEntities[teleportStep][i].object3D.visible = false;
        teleportEntities[teleportStep][i].setAttribute('color', '#ffffff');
      }
      teleportStep++;

      if(teleportStep >= teleportEntities.length) {
        teleportDirection = false;
        if(typeof teleportCallback != 'undefined') {
          teleportCallback('finished', teleportPadType);
        }
    
      }

    }

    

  }

  _this.setPosition = function(x, y, z, rx, ry, rz) {
    rotY = ry;
    player.setAttribute('position', new THREE.Vector3(x, y, z));
    player.setAttribute('rotation', new THREE.Vector3(rx, ry, rz));
  }

  _this.moveToTeleport = function() {

    var yOffset = 0;
    var zOffset = 0;
    var xOffset = 0;
    switch(teleportToRotation.z) {
      case 90:
        xOffset = -1;
        break;
      case 180:
        yOffset = -1;
        break;
      case 270:
        xOffset = 1;
        break;
    }

    switch(teleportToRotation.x) {
      case 90:
        zOffset = 1;
        break;
      case 180:
        yOffset = -1;
        break;
      case 270:
        zOffset = -1;
        break;      
    }

    if(teleportToRotation.x == 0 && teleportToRotation.z == 0) {
      yOffset = 1;
    }

    yOffset = 0;
    zOffset = 0;
    xOffset = 0;

    player.setAttribute('position', new THREE.Vector3(teleportTo.x + xOffset, teleportTo.y + yOffset, teleportTo.z + zOffset));
    player.setAttribute('rotation', new THREE.Vector3(teleportToRotation.x, rotY, teleportToRotation.z));

    if(typeof teleportCallback != 'undefined') {
      teleportCallback('arrived', teleportPadType);
    }
  }

  _this.tick = function(time, timeDelta) {

    if(time - lastUpdate > 30) {
      if(teleportDirection !== false) {
        _this.updateTeleport();
      }
      lastUpdate = time;
    }
    
  }

  setupTeleport();
}


var Exit = function(parent) {
  var _this = this;

  var lastUpdate = 0;

  var cylinder = document.createElement('a-cylinder');
  cylinder.setAttribute('color', '#0044ff');
  cylinder.setAttribute('opacity', '0.6');
  cylinder.setAttribute('scale', '0.44 0.02 0.44');
  cylinder.setAttribute('position', '0 0.02 0');
  parent.append(cylinder);

  var particles = [];

  
  var energyGeometry = new THREE.BoxGeometry( 0.1, 30, 0.1 );

  for(var i = 0; i < 30; i++) {
    var energyMaterial = new THREE.MeshStandardMaterial( {color: 0x1111ff, transparent: true, opacity: 0.8, emissive: 0x4444ff } );
    var energyMaterial2 = new THREE.MeshStandardMaterial( {color: 0xffffff, transparent: true, opacity: 0.8, emissive: 0xffffff } );
    energyMaterial.flatShading = true;
    var mesh = false;

    if(Math.random() > 0.7) {
      mesh = new THREE.Mesh(energyGeometry, energyMaterial);
      var scale = 0.5 + Math.random() * 0.5;
      mesh.scale.set(scale, scale, scale);
    } else {
      mesh = new THREE.Mesh(energyGeometry, energyMaterial2);
      var scale = Math.random() * 0.3;
      mesh.scale.set(scale, scale, scale);
    }
    //mesh.visible = false;
    particles.push({
      mesh: mesh
    });
    cylinder.object3D.add(mesh);
  }



  _this.tick = function(time, timeDelta) {

    
    for(var i = 0; i < particles.length; i++) {
      if(particles[i].mesh.visible) {
        distance = particles[i].mesh.position.y + timeDelta * 0.06;

        particles[i].mesh.material.opacity = (120 - distance) / 120;
        if(distance > 120) {
          particles[i].mesh.visible = false;
        }
        particles[i].mesh.position.setY(distance);
      }
    }

    if(time - lastUpdate > 50) {
      for(var i = 0; i < particles.length; i++) {
        if(particles[i].mesh.visible == false) {
          
          particles[i].mesh.visible = true;
          particles[i].mesh.material.opacity = 0.6;
          particles[i].mesh.position.set(
            Math.random() * 1.5 - 0.7, 
            12, 
            Math.random() * 1.5 - 0.7);
          break;
        }
      }
      lastUpdate = time;
    }
  }



}


var rotationSpeed = 70;

var Pad = function(playfield, playfieldEntity, index, type) {
  var _this = this;
  var entity = false;
  var pad = false;
  var padWorld = false;
  var box = false;
  var padMaterial = false;
  var normal = new THREE.Vector3(0, 1, 0);
  var padType = type;
  var isSolid = true;
  var padIndex = index;
  var lastUpdate = false;

  var robotEntity = false;
  var robotMaterial = false;
  var robotBeamOrigin = false;
  var robotBeams = [];
  var robotMesh = false;
  var robotRotation = 0;
  var robotBeamMaterial = null;
  var playerDrainTime = false;

  var energyTo = false;
  var energyToPoint = new THREE.Vector3();

  var robotFacing = new THREE.Vector3(0, 0, -1);


  var padHighlighted = false;


  var threeJSScene = g_scene.object3D;

  var hasRobot = false;
  var robotAbsorbTime = false;
  var mouseDownAbsorb = false;

  var posX = 0;
  var posY = 0;
  var posZ = 0;
  var rotX = 0;
  var rotY = 0;
  var rotZ = 0;
  
  var foundPlayer = false;
  var trackPlayer = false;

  _this.setClickable = function(clickable) {
    if(!pad) {
      return;
    }

    if(clickable) {
      pad.setAttribute('class', 'clickable');
    } else {
      pad.setAttribute('class', '');
    }
  }

  var createEntity = function() {
    if(entity === false) {
      entity = document.createElement('a-entity');
    }

    if(padType !== BLOCKING_PAD) {

      pad = document.createElement('a-box');
      switch(padType) {
        case GREEN_PAD:
          pad.setAttribute('color', '#00aa00');
          break;
        case RED_PAD:
          pad.setAttribute('color', '#aa0000');
          break;
        default:
          pad.setAttribute('color', '#aaaaaa');
      }

      pad.setAttribute( 'transparent', true);
      pad.setAttribute('opacity', '1');

      pad.setAttribute('scale', '1.06 0.02 1.06');
      pad.setAttribute('position', new THREE.Vector3(0, -0.01, 0));
      pad.addEventListener('mouseenter', mouseEnter );
      pad.addEventListener('mouseleave', mouseLeave );

      pad.addEventListener('mousedown', function(e) {
        return;

        var origin = false;
        // mouse down on a pad, find where the click came from
        if(e.detail) {
          if(e.detail.cursorEl) {
            origin = e.detail.cursorEl;          
          }          
        }

        if(g_scene == origin) {
          origin = null;

        } 
        
        if(origin) {
          var originPosition = origin.getAttribute('position');
          console.log('position = ');
          console.log(originPosition);
        } else {
          console.log("NO ORIGIN");
        }
        mouseDownAbsorb = false;
        if(hasRobot) {
          startRobotAbsorb();
          mouseDownAbsorb = true;
        } else {
        }
      } );
      pad.addEventListener('mouseup', function(e) {

        /*
        if(robotAbsorbTime !== false) {
          cancelRobotAbsorb();
        }
        */
      } );

      pad.addEventListener('click', mouseClick );
    
      isSolid = true;
      entity.append(pad);
    }

    box = document.createElement('a-box');

    switch(padType) {
      case GREEN_PAD:
        box.setAttribute('color', '#00ee00');
        break;
      case RED_PAD:
        box.setAttribute('color', '#ee0000');
        break;
      default:
        box.setAttribute('color', '#eeeeee');
      }

    box.setAttribute( 'transparent', true);
    box.setAttribute('opacity', '1');

    
    box.setAttribute('scale', '1.6 0.2 1.6');
    box.setAttribute('position', new THREE.Vector3(0, -0.12, 0));

//    if(padType === BLOCKING_PAD) {
    box.setAttribute('class', 'clickable');
//    }

    entity.append(box);

    if(padType === PAD_WITH_ROBOT) {
      robotEntity = document.createElement('a-entity');
      var geometry = new THREE.ConeGeometry( 0.4, 1.8, 4 );
      robotMaterial = new THREE.MeshStandardMaterial( {color: 0x383848, transparent: true } );
      robotMaterial.flatShading = true;
      robotMesh = new THREE.Mesh( geometry, robotMaterial );
      robotMesh.position.set(0, 0.9, 0);
      robotEntity.setObject3D('mesh', robotMesh);

      //ConeGeometry(radius : Float, height : Float, radialSegments : Integer,
      var headGeometry = new THREE.ConeGeometry( 0.3, 0.6, 3 );
      var robotHead = new THREE.Mesh( headGeometry, robotMaterial );
      //robotHead.rotateY( Math.PI );
      robotHead.rotateX( -Math.PI / 1.6 );
      //robotHead.rotateZ( Math.PI );
      robotHead.position.set(0, 0.8, -0.2);


      robotMesh.add(robotHead);
      robotBeamMaterial = new THREE.LineBasicMaterial( { color: 0xff0000, transparent: true } );
    
      entity.append(robotEntity);
      
      for(var i = 0; i < 12; i++) {
        var points = [];
        points.push( new THREE.Vector3( 0, 0, 0 ) );
        points.push( new THREE.Vector3( 0, 10, 0 ) );        
        var geometry = new THREE.BufferGeometry().setFromPoints( points );
        var line = new THREE.Line( geometry, robotBeamMaterial );
        robotBeams.push({
          mesh: line,
          geometry: geometry
        });
        threeJSScene.add(line);
      }
      hasRobot = true;
    }
    //padMaterial = pad.components;    

    return entity;
  }


  _this.getObject = function() {
    return entity.object3D;
    //return box.object3D;
  }


  var drawRobotVision = function() {

    if(!hasRobot || robotEntity == null) {
      return;
    }

    var scale = g_playfieldScale;

    var origin = new THREE.Vector3();
    robotEntity.setAttribute('rotation', '0 ' + robotRotation + ' 0');

    robotMesh.getWorldPosition(origin);
    origin.setY(origin.y + 1 * scale);

    var direction = new THREE.Vector3();

    var collisionObjects = playfield.getCollisionObjects();
    var rayLength = 6 * scale;
    
    var rotation = (robotRotation + 90) * Math.PI / 180;
    if(playfield.getGameState() == STATE_LEVEL_PREVIEW) {
      rotation = (robotRotation - 90) * Math.PI / 180;
    }
    foundPlayer = false;
    for(var i = 0; i < robotBeams.length; i++) {
      var angle =  ( -i * 5) * Math.PI / 180;

      var positions = robotBeams[i].geometry.attributes.position.array;
      var index = 0;
      positions[index++] = origin.x;
      positions[index++] = origin.y;
      positions[index++] = origin.z;

      
      var x = origin.x + rayLength * Math.cos(angle);
      var y = origin.y + rayLength * Math.sin(angle);
      var z = origin.z;

      var r = x - origin.x;
      x = origin.x + r * Math.cos(-rotation);
      z = origin.z + r * Math.sin(-rotation);


      direction.setX(x - origin.x);
      direction.setY(y - origin.y);
      direction.setZ(z - origin.z);
      direction.normalize();

      g_raycaster.set(origin, direction);
      g_raycaster.near = 0;
      g_raycaster.far = rayLength;
  
      var intersections = g_raycaster.intersectObjects(collisionObjects, true);


      if(intersections.length > 0) {


        x = intersections[0].point.x;
        y = intersections[0].point.y;
        z = intersections[0].point.z;

        if( typeof intersections[0].object.isPlayer != 'undefined') {
          foundPlayer = true;

          if(!trackPlayer) {
            trackPlayer = true;

            playfield.setEnergyDrainTransferring(true);
            playfield.decreasePlayerEnergy();
            g_sound.playSound(SOUND_ENERGY);

            playerDrainTime = lastUpdate;
          }
        } 
      }

      positions[index++] = x;
      positions[index++] = y;
      positions[index++] = z;

      robotBeams[i].geometry.attributes.position.needsUpdate = true; 
      robotBeams[i].geometry.computeBoundingBox();
      robotBeams[i].geometry.computeBoundingSphere();
    }

  }

  _this.getInAbsorb = function() {
    return robotAbsorbTime !== false;
  }
  
  var startRobotAbsorb = function() {
    robotAbsorbTime = lastUpdate;
    playfield.setEnergyTransferring(true);
  }

  var cancelRobotAbsorb = function() {
    robotAbsorbTime = false;
    playfield.setEnergyTransferring(false);
    if(robotMaterial) {
      robotMaterial.opacity = 1;
      robotBeamMaterial.opacity = 1;
    }
  }

  var removeRobot = function() {
    if(!hasRobot) {
      return;
    }
    hasRobot = false;
    robotAbsorbTime = false;
    playfield.setEnergyTransferring(false);
    entity.removeChild(robotEntity);
    robotEntity = null;
    playfield.increasePlayerEnergy();

    if(trackPlayer) {
      trackPlayer = false;
      playfield.setEnergyDrainTransferring(false);
    }
    

    // remove robot beams
    for(var i = 0; i < robotBeams.length; i++) {
      threeJSScene.remove(robotBeams[i].mesh);
      robotBeams[i].geometry.dispose();      
    }

    robotBeams = [];

  }

  _this.cleanup = function() {
    removeRobot();
  }

  var canTeleportTo = function() {

    // cant teleport to current pad..
    if(padIndex === playfield.getCurrentPadIndex()) {
      return false;
    }

    // cant teleport if not on pad
    if(!playfield.getOnPad()) {
      return false;
    }

    var playerPosition = playfield.getPlayer().getPosition();
    var direction = new THREE.Vector3(playerPosition.x - posX, playerPosition.y - posY, playerPosition.z - posZ);

        
    return direction.dot(normal) >= 0;
  }

  var highlight = function() {
    if(playfield.getGameState() == STATE_PLAYING && canTeleportTo()) {
      g_sound.playSound(SOUND_CLICK);

      switch(padType) {
        case GREEN_PAD:
          pad.setAttribute('color', '#8f8');
          break;
        case RED_PAD:
          pad.setAttribute('color', '#f88');
          break;
        default:
          pad.setAttribute('color', '#ffd');
      }
    }
  }

  _this.unhighlight = function() {
    padHighlighted = false;
    if(pad) {
      switch(padType) {
        case GREEN_PAD:
          pad.setAttribute('color', '#0a0');
          break;
        case RED_PAD:
          pad.setAttribute('color', '#a00');
          break;
        default:
          pad.setAttribute('color', '#aaa');
      }
    }

  }


  var mouseEnter = function(event) {
    padHighlighted = true;
    highlight();
  }

  var mouseLeave = function(event) {
    padHighlighted = false;
    _this.unhighlight();
  }

  var mouseClick = function(event) {

    /*
    if(!mouseDownAbsorb) {

      if(playfield.getGameState() == STATE_PLAYING && canTeleportTo() && !hasRobot) {
        playfield.teleportPlayer(posX, posY, posZ, rotX, rotZ, padIndex, padType, function() {
          unhighlight();
        });
      }
    }
    */
  }

  _this.buttonDown = function(e) {
//    console.log('pad index ' + padIndex + ' highlight: ' + padHighlighted);
    if(padHighlighted) {

      if(playfield.getGameState() == STATE_PLAYING) {
        var origin = false;
        // mouse down on a pad, find where the click came from
        if(e.detail) {
          if(e.detail.cursorEl) {
            origin = e.detail.cursorEl;          
          }          
        }

        if(g_scene == origin) {
          origin = null;

        } 
        
        if(origin) {
          energyTo = origin;
        } else {
        }
        mouseDownAbsorb = false;
        if(hasRobot) {
          startRobotAbsorb();
          mouseDownAbsorb = true;
        } else {
        }
      }


      if(playfield.getGameState() == STATE_PLAYING && canTeleportTo() && !hasRobot) {
        
        playfield.teleportPlayer(posX, posY, posZ, rotX, rotZ, padIndex, padType, function() {
          _this.unhighlight();
        });
      }
    }
  }

  _this.buttonUp = function(e) {
    if(robotAbsorbTime !== false) {
      cancelRobotAbsorb();
    }
  }

  _this.playerTeleported = function(playerPadIndex, playerPadType) {
    if(padType == BLOCKING_PAD) {
      return;
    }
    if(padType === playerPadType && padIndex !== playerPadIndex && padType !== NORMAL_PAD && padType != PAD_WITH_ROBOT) {

      pad.setAttribute('wireframe', true);
      box.setAttribute('wireframe', true);
      box.setAttribute('opacity', 0.4);
      box.setAttribute('class', '');
      pad.setAttribute('class', '');
      isSolid = false;
    } else {
      if(pad) {
        pad.setAttribute('wireframe', false);
        pad.setAttribute('class', 'clickable');
      }
      box.setAttribute('wireframe', false);
      box.setAttribute('opacity', 1);
      box.setAttribute('class', 'clickable');
      isSolid = true;
    }
    trackPlayer = false;
    playfield.setEnergyDrainTransferring(false);
    _this.unhighlight();
  }

  _this.getIsSolid = function() {
    return isSolid;
  }

  _this.getIndex = function() {
    return padIndex;
  }

  _this.getEntity = function() {
    return entity;
  }

  _this.setPosition = function(x, y, z) {
    posX = x;
    posY = y;
    posZ = z;
    entity.setAttribute('position', new THREE.Vector3(x, y, z));
  }

  _this.setRotation = function(rx, ry, rz) {
    rotX = rx;
    rotY = ry;
    rotZ = rz;
    entity.setAttribute('rotation', new THREE.Vector3(rx, ry, rz));

    var normalX = 0;
    var normalY = 0;
    var normalZ = 0;
    switch(rz) {
      case 90:
        normalX = -1;
        break;
      case 180:
        normalY = -1;
        break;
      case 270:
        normalX = 1;
        break;
    }

    switch(rx) {
      case 90:
        normalZ = 1;
        break;
      case 180:
        normalY = -1;
        break;
      case 270:
        normalZ = -1;
        break;      
    }

    normal.set(normalX, normalY, normalZ);
  }

  _this.getPosition = function() {
    return entity.getAttribute('position');
  }

  _this.tick = function(time, timeDelta) {
    if(hasRobot) {
      if(robotAbsorbTime !== false) {
        var delta = time - robotAbsorbTime;

        if(padWorld === false) {
          padWorld = new THREE.Vector3(0, 0, 0);
          pad.object3D.getWorldPosition(padWorld);
        }

        energyToPoint.set(0, 0, 0);
        if(energyTo) {
          energyTo.object3D.getWorldPosition(energyToPoint);
        } else {
          var playerPosition = playfield.getPlayerPosition();
          energyToPoint.set(playerPosition.x, playerPosition.y - 0.05, playerPosition.z);
        }

        playfield.setEnergyFromTo(padWorld, energyToPoint);
        if(delta > 2000) {
          removeRobot();
        } else {
          robotMaterial.opacity = (1800 - delta) / 1800;
          robotBeamMaterial.opacity = (1800 - delta) / 1800;
        }
      }


      if(trackPlayer) {
        // aim robot at player
        var playerPosition = playfield.getPlayerPosition();
        var playerLocal = robotMesh.worldToLocal(playerPosition);
        playerLocal.setY(0);

        var angle = robotFacing.angleTo(playerLocal);
        angle = angle * 180 / Math.PI;

        if(playerLocal.x < 0) {
          robotRotation += angle;
        } else {
          robotRotation -= angle;
        }


        if(padWorld === false) {
          padWorld = new THREE.Vector3(0, 0, 0);
          pad.object3D.getWorldPosition(padWorld);
        }

        energyToPoint.set(0, 0, 0);
        var playerPosition = playfield.getPlayerPosition();
        energyToPoint.set(playerPosition.x, playerPosition.y - 0.05, playerPosition.z);

        playfield.setEnergyDrainFromTo(energyToPoint, padWorld);



        if(time - playerDrainTime > 2000) {
          playfield.decreasePlayerEnergy();
          g_sound.playSound(SOUND_REMOVE);
          playerDrainTime = time;
        }
      } else if(!foundPlayer) {
        robotRotation = (robotRotation + timeDelta / rotationSpeed) % 360;
      }


      drawRobotVision();
    }

    lastUpdate = time;
  }

  createEntity();
}


g_sound = null;

// sounds
var SOUND_CLICK = 1;
var SOUND_TELEPORT = 2;
var SOUND_DIE = 3;
var SOUND_FALL = 5;

var SOUND_REMOVE = 8;
var SOUND_PLACE = 9;
var SOUND_LEVEL_END = 10;
var SOUND_ENERGY = 11;
var SOUND_ENERGY2 = 12;
var SOUND_DONE = 13;
var SOUND_GAME_OVER = 14;
var SOUND_ADD_ENERGY = 15;

var Sound = function() {
  var audioContext = null;

  this.init = function() {
    if(audioContext == null) {
      audioContext = new AudioContext();
    }
  }

  // midi number to frequency
  var midiToFreq = function(note) {
    return (Math.pow(2, (note-69) / 12)) * 440.0;
  }

  // play a sound
  this.playSound = function(soundType) {
    
    if(audioContext == null) {
      return;
    }
    
    var time = audioContext.currentTime;
    var noteLength = 1/16;
    var attack = 1/64;
    var soundLength = noteLength;

    // create an envelope using gain
    var gain = audioContext.createGain();

    var audioSource = null;
    var biquadFilter = null;

    audioSource = audioContext.createOscillator();
    audioSource.type = 'square';
    audioSource.connect(gain);

    gain.connect(audioContext.destination);

    switch(soundType) {
      case SOUND_REMOVE:
        noteLength = 1 / 32;
        audioSource.type = 'triangle';
        audioSource.frequency.setValueAtTime(midiToFreq(45), time);    // G3

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 1/16);

        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength * 3);

        soundLength = noteLength * 3;

        break;
      case SOUND_ENERGY:
        noteLength = 1 / 32;
        audioSource.type = 'triangle';
        audioSource.frequency.setValueAtTime(midiToFreq(45), time);    // G3


        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 1/16);

        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength * 3);

        soundLength = noteLength * 3;

        break;

        case SOUND_ENERGY2:
          noteLength = 1 / 32;
          audioSource.type = 'sawtooth';
          audioSource.frequency.setValueAtTime(midiToFreq(33), time);    // G3
  
  
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 1/16);
  
          gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength * 3);
  
          soundLength = noteLength * 3;
  
          break;

          
      case SOUND_PLACE:
      case SOUND_CLICK:
        noteLength = 1 / 32;
        audioSource.type = 'triangle';
        audioSource.frequency.setValueAtTime(midiToFreq(60), time);    // G3


        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 1/128);

        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength * 3);

        soundLength = noteLength * 3;
        
      break;

      case SOUND_FALL: 
        noteLength = 1/4;
        audioSource.type = 'triangle';
        audioSource.frequency.setValueAtTime(midiToFreq(62), time);   // G#3

        
        audioSource.frequency.linearRampToValueAtTime(midiToFreq(55), time + noteLength * 4); // c#3 49

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 1/128);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength * 3);

        soundLength = noteLength * 4;
      break;

      case SOUND_DIE: 
        noteLength = 1/12;
        audioSource.type = 'sawtooth';
        audioSource.frequency.setValueAtTime(midiToFreq(56), time);   // G#3

       
        audioSource.frequency.linearRampToValueAtTime(midiToFreq(49), time + noteLength); // c#3 49

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + noteLength);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength * 2);

        soundLength = noteLength * 2;

      break;

      case SOUND_ADD_ENERGY:
        noteLength = 1/12;
        audioSource.type = 'triangle';
        audioSource.frequency.setValueAtTime(midiToFreq(55), time);    // G3
        audioSource.frequency.setValueAtTime(midiToFreq(62), time + noteLength);  // D4

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 1/64);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength * 2);

        soundLength = noteLength * 2;

        break;
/*
        case SOUND_GREEN:
        noteLength = 1/4;
        audioSource.type = 'triangle';
        audioSource.frequency.setValueAtTime(midiToFreq(43), time);    // G2

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 1/32);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength);

        soundLength = noteLength;

      break;
      case SOUND_RED:
        noteLength = 1/4;
        audioSource.type = 'triangle';
        audioSource.frequency.setValueAtTime(midiToFreq(47), time);    // b2

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 1/32);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength);

        soundLength = noteLength;

      break;
*/

      /*
      case soundYellow:
        noteLength = 1/4;
        audioSource.type = 'triangle';
        audioSource.frequency.setValueAtTime(midiToFreq(50), time);    // d3

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 1/32);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength);

        soundLength = noteLength;

      break;  
      case soundPurple:
        noteLength = 1/4;
        audioSource.type = 'triangle';
        audioSource.frequency.setValueAtTime(midiToFreq(54), time);    // f#3

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 1/32);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength);

        soundLength = noteLength;

      break;
      */
      case SOUND_TELEPORT:
        noteLength = 1/12;
        audioSource.type = 'triangle';
        audioSource.frequency.setValueAtTime(midiToFreq(55), time);    // G4
        audioSource.frequency.setValueAtTime(midiToFreq(62), time + noteLength);  // D4
        audioSource.frequency.setValueAtTime(midiToFreq(67), time + noteLength * 2);    // G4

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 1/64);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength * 6);

        soundLength = noteLength * 6;
      break;

      case SOUND_DONE:
        noteLength = 1/12;
        audioSource.type = 'sawtooth';
        audioSource.frequency.setValueAtTime(midiToFreq(43), time);    // G4
        audioSource.frequency.setValueAtTime(midiToFreq(50), time + noteLength * 4);  // D4
        audioSource.frequency.setValueAtTime(midiToFreq(48), time + noteLength * 8);    // G4
        audioSource.frequency.setValueAtTime(midiToFreq(41), time + noteLength * 12);    // G4
        audioSource.frequency.setValueAtTime(midiToFreq(43), time + noteLength * 16);    // G4

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.18, audioContext.currentTime + 1/32);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength * 26);

        soundLength = noteLength * 26;
      break;

      case SOUND_GAME_OVER:
        noteLength = 1/12;
        audioSource.type = 'sawtooth';
        audioSource.frequency.setValueAtTime(midiToFreq(50), time);    // G4
        audioSource.frequency.setValueAtTime(midiToFreq(41), time + noteLength * 4);  // D4
        audioSource.frequency.setValueAtTime(midiToFreq(43), time + noteLength * 8);    // G4
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 1/64);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength * 14);

        soundLength = noteLength * 14;
      break;

    }

    audioSource.start(audioContext.currentTime);
    audioSource.stop(audioContext.currentTime+soundLength);

  }
}


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

var START_PAD        = 1;
var EXIT_PAD         = 2;
var NORMAL_PAD       = 3;
var PAD_WITH_ROBOT   = 4;
var GREEN_PAD        = 5;
var RED_PAD          = 6;

var BLOCKING_PAD     = 7;

var g_levels = [
  {
    "text": [
      "Level 1.",
      "Select a pad to teleport to.", 
      "Each teleport will use one",
      "unit of energy."

    ],

    "startRotation": 0,
    "energy": 8,
    "data": [
      [START_PAD,  0, 0, 0,  0,0,0 ],
      [NORMAL_PAD, 0, 0.4, -6, 0, 0, 0],

      [NORMAL_PAD, -2, 1.1, -12, 0, 0, 0],
      [NORMAL_PAD, 2, 1.1, -12, 0, 0, 0],


      [EXIT_PAD, 0, 2.0,-18,0,0,0]

    ]

  },

  {
    "text": [
      "Level 2.",
      "If a robot sees you",
      "it will drain your energy.",
      ""
    ],
    "energy": 8,
    "robotSpeed": 60,
    "data": [
      [START_PAD, 0, 0, 0,  0,0,0 ],

      [PAD_WITH_ROBOT, -2.5, 2.9, -7,0,0,0],
      [NORMAL_PAD,      0, 0.5,   -7, 0, 0, 0],

      [NORMAL_PAD, 0, 1.5, -12, 0, 0, 0],
      [PAD_WITH_ROBOT, 2, 2.9, -12, 0, 0, 0],

      [EXIT_PAD, 0, 2.3,-20,0,0,0]
    ],
  },


  {
    "text": [
      "Level 3.",
      "You can absorb a robot's",
      " energy by selecting it's pad.",
      ""
    ],
    "startRotation": 0,
    "energy": 2,
    "data": [
      [START_PAD, 0, 0, 0,  0,0,0 ],

      [NORMAL_PAD, 2.5, -0.5, -8, 0, 0, 0],
      [PAD_WITH_ROBOT, -2.5, -0.5, -8, 0, 0, 0],

//      [NORMAL_PAD, 3, 2,-10,  270,0,0],

      [NORMAL_PAD, 0.5, 4,-19, 0,0,270],


      [EXIT_PAD, 4, 3.5,-17,0,0,0]

    ]
  },


  {
    "text": [
      "Level 4.",
      "When on a green pad,",
      "other green pads will",
      "disappear",
      ""
    ],
    "energy": 4,
    "robotSpeed": 30,
    "data": [
      [START_PAD, 0, 0, 3,  0,0,0 ],
      [GREEN_PAD, 0, 0,-3, 0,0,0 ],

      [GREEN_PAD, 0, 2.4,-10, 0,0,0 ],

      [PAD_WITH_ROBOT, -3.5, 2.5, -10, 0, 0, 0],
      [PAD_WITH_ROBOT, 3.5, 2.5, -10, 0, 0, 0],

      [GREEN_PAD, 2, 3.6,-10, 0,0,90],
      [BLOCKING_PAD, 2.4, 3.6,-9, 90,0,0],

      [GREEN_PAD, -2, 3.6,-10, 0,0,270],
      [BLOCKING_PAD, -2.4, 3.6,-9, 90,0,0],

      [NORMAL_PAD, 0, 7,-8, 0,0,180],
      [BLOCKING_PAD, 0, 6,-6, 90,0,0],

      [BLOCKING_PAD, 0, 3.5,-19, 270,0,0],
      [EXIT_PAD, 0, 3.5,-20,0,0,0],

      [NORMAL_PAD, 5.5, 6.5,-22, 0,0,90],
      [GREEN_PAD, 5.5, 6.5,-21, 270,0,0],

      [NORMAL_PAD, -5.5, 6.5,-22, 0,0,270],
      [GREEN_PAD, -5.5, 6.5,-21, 270,0,0],
    ],
    
  },

  {
    "text": [
      "Level 5.",
      "When on a red pad,",
      "other red pads will",
      "disappear",
      ""
    ],
    "energy": 2,
    "robotSpeed": 40,
    "data": [
      [START_PAD, 0, 0, 3,  0,0,0 ],
      [RED_PAD, 0, 0,  -5, 0,0,0 ],


      [PAD_WITH_ROBOT, 4, 0, -5, 0, 0, 0],
      [RED_PAD, 3.5, 0,  -3.5, 90,0,0 ],
      [BLOCKING_PAD, 3.5, 0.2,  -6, 90,0,0 ],

      [RED_PAD, 3, 2,  -5, 0,0,90 ],

      [PAD_WITH_ROBOT, -4, 0, -5, 0, 0, 0],
      [RED_PAD, -3.5, 0,  -3.5, 90,0,0 ],
      [BLOCKING_PAD, -3.5, 0.2,  -6, 90,0,0 ],
      [RED_PAD, -3, 2,  -5, 0,0, 270],


      [RED_PAD, 0, 5,  -12, 270,0,0 ],

      [GREEN_PAD, 0, 6.5,  -19, 90,0,0 ],


      [NORMAL_PAD, 0, 12.5,  -16.5, 0,0,180 ],
      [GREEN_PAD, 0, 12.4,  -16.5, 0,0,0 ],


      [EXIT_PAD, 0, 6,-21,0,0,0],

    ],
    
  },


  {
    "text": [
      "Level 6.",
      "",
      "",
      "",
      ""
    ],
    "energy": 5,
    "robotSpeed": 40,
    "data": [
      [START_PAD, 0, 2, 3,  0,0,0 ],


      [RED_PAD, 2.5, 0,  -6, 0,0,0 ],

      [BLOCKING_PAD, -0.1, 2, -6, 0, 0, 90],
      [BLOCKING_PAD, -0.1, 0.6, -6, 0, 0, 90],
      [GREEN_PAD, -2.5, 0,  -6, 0,0,0 ],


      [RED_PAD, -5.5, 13.9,  -12, 0,0,0 ],
      [GREEN_PAD, -5.5, 14,  -12, 0,0,180 ],

      

      [RED_PAD, 5.5, 10,  -16, 90,0,0 ],
      [GREEN_PAD, 5.5, 10,  -15.7, 90,0,0 ],
      [BLOCKING_PAD, 3.2, 7.5, -8, 90, 0, 0],


      [BLOCKING_PAD, 0, 9.7, -20, 90, 0, 0],

      [EXIT_PAD, 0, 9,-21,0,0,0],
      [BLOCKING_PAD, -0.9, 9.7, -21, 0, 0, 90],
      [BLOCKING_PAD, 0.7, 9.7, -21, 0, 0, 90],

      //[BLOCKING_PAD, 1.6, 10, -20, 90, 0, 0],
      [BLOCKING_PAD, -2.8, 11.6, -20, 90, 0, 0],      

      [BLOCKING_PAD, -1.4, 5, -14, 90, 0, 0],      

      [RED_PAD, 2, 4.9, -18, 0,0,0 ],
      [BLOCKING_PAD, -0.1, 6.9, -18, 0, 0, 90],
      [BLOCKING_PAD, -0.1, 5.5, -18, 0, 0, 90],
      [GREEN_PAD, -2, 4.9, -18, 0,0,0 ],


      [RED_PAD, 0, 11, -28, 90,0,0 ],

      [GREEN_PAD, 0, 11, -27.9, 270,0,0 ],
    ],
    
  },

  {
    "text": [
      "Level 7.",
      "",
      "",
      "",
      ""
    ],
    "energy": 3,
    "robotSpeed": 30,
    "data": [
      [START_PAD, 0, 3, 4,  0,0,0 ],
      [PAD_WITH_ROBOT, 2, 0, -5, 0, 0, 0],
      [NORMAL_PAD, -2, 0, -5, 0, 0, 0],

      [GREEN_PAD, -4, 6.5, -6.3, 270, 0, 0],

      [RED_PAD, -7, 8, -15, 0, 0, 270],
      [PAD_WITH_ROBOT, -3.5, 7.5, -15, 0, 0, 0],


      [GREEN_PAD, 4, 12, -24, 270, 0, 0],
      [RED_PAD, 4, 12, -24, 90, 0, 0],

      [EXIT_PAD, 0, 9,-21,0,0,0],
    ],    
  },


  {
    "text": [
      "Level 8.",
      "",
      "",
      "",
      ""
    ],
    "energy": 3,
    "robotSpeed": 30,
    "data": [
      [START_PAD, 0, 0, 4,  0,0,0 ],

      [PAD_WITH_ROBOT, 0, 6, -6, 0, 0, 0],
      [RED_PAD, 0, 5.4, -6, 180, 0, 0],

      [NORMAL_PAD, 0, 7.5, -12.2, 90, 0, 0],
      [RED_PAD, 0, 7.5, -12, 270, 0, 0],

      [RED_PAD, 0, 11, -1.5, 270, 0, 0],

      [EXIT_PAD, 0, 7.5,-21,0,0,0],
    ],    
  }





];

// say things
var english_voice = '';
var available_voices = null;

if(typeof window.speechSynthesis != 'undefined') {
  available_voices = window.speechSynthesis.getVoices();
}
var utterance = false;

function speak(text) {
  if(typeof window.speechSynthesis == 'undefined') {
    return;
  }

  if(!available_voices || available_voices.length == 0) {
    available_voices = window.speechSynthesis.getVoices();
  }

  if(english_voice == '') {

    for(var i=0; i<available_voices.length; i++) {
      if(available_voices[i].lang === 'en-GB') {
        english_voice = available_voices[i];
        break;
      }
    }

    if(english_voice === '' && available_voices.length > 0) {
      english_voice = available_voices[0];
    }
  }

  if(utterance) {
    window.speechSynthesis.cancel(utterance);  
  }
  utterance = new SpeechSynthesisUtterance();
  utterance.text = text;
  if(english_voice != '') {
    utterance.voice = english_voice;
  }


  // speak
  window.speechSynthesis.speak(utterance);
}


var InfoPanel = function(parent) {
  var _this = this;
  var energyBars = [];
  var panel = document.createElement('a-entity');

  


  var backing = document.createElement('a-plane');
  backing.setAttribute('scale', '1.2 1.8 1');
  
  
  backing.setAttribute('color', '#222');
  panel.append(backing);

  var energyText = document.createElement('a-text');
  energyText.setAttribute('value', 'Energy');
  energyText.setAttribute('position', '-0.55 0.7 0');
  panel.append(energyText);



  var text = [];
  for(var i = 0; i < 4; i++) {
    text[i] = document.createElement('a-text');
    text[i].setAttribute('value', 'Info line 1 ');
    text[i].setAttribute('position', new THREE.Vector3(-0.54, 0.15 - 0.15 * i, 0)); //'-0.54 0.1 0');
    text[i].setAttribute('scale', '0.4 0.4 0.4');
    text[i].setAttribute('anchor', 'left');
    panel.append(text[i]);
  }


  var restartText = document.createElement('a-text');
  restartText.setAttribute('value', '');
  restartText.setAttribute('position',  new THREE.Vector3(-0.38, -0.76, 0)); 
  restartText.setAttribute('scale', '0.3 0.3 0.3');
  restartText.setAttribute('anchor', 'left');
  panel.append(restartText);

  for(var i = 0; i < 8; i++) {
    var bar = document.createElement('a-plane');
    bar.setAttribute('color', '#0f0');
    bar.setAttribute('scale', '0.1 0.1 0.1');
    bar.setAttribute('position', new THREE.Vector3(-0.46 + i * 0.12, 0.43, 0.02));

    energyBars.push(bar);
    panel.append(bar);
  }

  var buttonDown = document.createElement('a-plane');
  buttonDown.setAttribute('scale', '0.1 0.1 0.1');
  buttonDown.setAttribute('position', new THREE.Vector3(-0.46, -0.76, 0.02));
  buttonDown.setAttribute('color', '#111');
  panel.append(buttonDown);

  parent.append(panel);

  _this.setEnergy = function(energy) {
    if(energy >= energyBars.length) {
      energy = energyBars.length;
    }
    var i = 0;
    for(i = 0; i < energy; i++) {
      energyBars[i].setAttribute('color', '#0f0');
    }
    for(i = energy; i < energyBars.length; i++) {
      energyBars[i].setAttribute('color', '#111');
    }
  }

  _this.setRestartText = function(t) {
    //Restarting Level...
    restartText.setAttribute('value', t);
  }

  _this.setButtonDown= function(down) {

    if(down) {
      buttonDown.setAttribute('color', '#f90');
    } else {
      buttonDown.setAttribute('color', '#111');
    }
  }

  _this.setText = function(line, t) {
    text[line].setAttribute('value', t);
  }
}

