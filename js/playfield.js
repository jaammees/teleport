var g_startLevel = 0;
var g_playfield = null;
var g_playfieldScale = 1;
var g_raycaster = null;

var g_leftButtonDownCount = 0;
var g_rightButtonDownCount = 0;

var g_rightController = false;
var g_leftController = false;


var STATE_LEVEL_PREVIEW         = 0;
var STATE_PLAYING               = 1;
var STATE_IN_TELEPORT           = 2;
var STATE_LEVEL_FINISHED        = 3;
var STATE_TELEPORT_NEXT         = 4;
var STATE_GAME_OVER             = 5;

AFRAME.registerComponent('controller-connected', {
  init: function () {
    var el = this.el;
    el.addEventListener('controllerconnected', function (evt) {
      if(evt.detail.component.data.hand == 'right') {
        g_rightController = true;
      }
      if(evt.detail.component.data.hand == 'left') {
        g_leftController = true;
      }

    });
    el.addEventListener('controllerdisconnected', function (evt) {
      if(evt.detail.component.data.hand == 'right') {
        g_rightController = false;
      }
      if(evt.detail.component.data.hand == 'left') {
        g_leftController = false;
      }

    });

  } 
});

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
  var laserRightLine = null;
  var leftInfo = null;
  var laserLeft = null;
  var laserLeftLine = null;
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

  var padCollisionObjects = [];
  var highlightedPads = [];

  function getPadCollisionObjects() {
    padCollisionObjects = [];
    for(var i = 0; i < pads.length; i++) {
      if(pads[i].getIsSolid()) {
        var padObject = pads[i].getPadObject3D();
        if(padObject) {
          padCollisionObjects.push(padObject);
        }
        var boxObject = pads[i].getBoxObject3D();
        if(boxObject) {
          padCollisionObjects.push(boxObject);
        }
      }
    }
  }

  var lineFrom = new THREE.Vector3();
  var lineTo = new THREE.Vector3();
  function updateRaycaster(raycaster, line) {

    lineFrom.copy(raycaster.ray.origin);
    lineTo.copy(raycaster.ray.origin);
    lineTo.addScaledVector(raycaster.ray.direction, 40);

    raycaster.near = 0;
    raycaster.far = 40;

    var intersections = raycaster.intersectObjects(padCollisionObjects, true);
    if(intersections.length > 0) {
      var o = intersections[0].object;
      lineTo.copy(intersections[0].point);
      if(typeof o.userData.padIndex != 'undefined') {
        var pad = pads[o.userData.padIndex];        
        highlightedPads.push(pad.getPadIndex());
        pad.highlight();
      }
    }

    if(line) {
      var positions = line.geometry.attributes.position.array;
      var index = 0;
      positions[index++] = lineFrom.x;
      positions[index++] = lineFrom.y;
      positions[index++] = lineFrom.z;

      positions[index++] = lineTo.x;
      positions[index++] = lineTo.y;
      positions[index++] = lineTo.z;

      line.geometry.attributes.position.needsUpdate = true; 
      line.geometry.computeBoundingBox();
      line.geometry.computeBoundingSphere();

    }
  }


  function updateRaycasters() {
    if(!g_vrMode) {
      return;
    }

    getPadCollisionObjects();
    highlightedPads = [];
    

    if(g_leftController) {
      if(laserLeft && typeof laserLeft.components.raycaster != 'undefined' && typeof laserLeft.components.raycaster.raycaster != 'undefined') {
        updateRaycaster(laserLeft.components.raycaster.raycaster, laserLeftLine);

        for(var i = 0; i < laserLeft.object3D.children.length; i++) {
          if(laserLeft.object3D.children[i].type == "Line") {
            laserLeft.object3D.children[i].visible = false;
          }
        }
      }
      laserLeftLine.visible = true;
      document.getElementById('left-info').object3D.visible = true;
    } else {
      laserLeftLine.visible = false;
      document.getElementById('left-info').object3D.visible = false;
    }

    if(g_rightController) {
      if(laserRight && typeof laserRight.components.raycaster != 'undefined'&& typeof laserRight.components.raycaster.raycaster != 'undefined') {
        updateRaycaster(laserRight.components.raycaster.raycaster, laserRightLine);
        for(var i = 0; i < laserRight.object3D.children.length; i++) {
          if(laserRight.object3D.children[i].type == "Line") {
            laserRight.object3D.children[i].visible = false;
          }
        }

      }
      laserRightLine.visible = true;
      document.getElementById('right-info').object3D.visible = true;

    } else {
      laserRightLine.visible = false;

      document.getElementById('right-info').object3D.visible = false;
    }

    // unhighlight any pads which are highlighted but not intersected
    for(var i = 0; i < pads.length; i++) {
      if(pads[i].getPadHighlighted()) {
        if(highlightedPads.indexOf(pads[i].getPadIndex()) == -1 ) {
          pads[i].unhighlight();
        }
      }
    }
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

    var lineMaterial = new THREE.LineBasicMaterial( { color: 0xffffff } );
    laserLeft = document.getElementById('laser-left');    
    var points = [];
    points.push( new THREE.Vector3( 0, 0, 0 ) );
    points.push( new THREE.Vector3( 0, 10, 0 ) );        
    var geometry = new THREE.BufferGeometry().setFromPoints( points );
    laserLeftLine = new THREE.Line( geometry, lineMaterial );
    threeJSScene.add(laserLeftLine);

    
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
      g_sound.init();


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


    points = [];
    points.push( new THREE.Vector3( 0, 0, 0 ) );
    points.push( new THREE.Vector3( 0, 10, 0 ) );        
    geometry = new THREE.BufferGeometry().setFromPoints( points );
    laserRightLine = new THREE.Line( geometry, lineMaterial );
    threeJSScene.add(laserRightLine);

    laserRight = document.getElementById('laser-right');
    rightInfo = new InfoPanel(document.getElementById('right-info'));
    infoPanels.push(rightInfo);

    laserRight.addEventListener('buttondown', function(e) {
      g_sound.init();

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

      if(laserLeft && g_leftController) {
        laserLeftLine.visible = true;
      }

      if(laserRight && g_rightController) {
        laserRightLine.visible = true;
      }
    } else {
      _this.setControllerInfoVisible(false);
      playerShadow.object3D.visible = true;
      laserLeftLine.visible = false;
      laserRightLine.visible = false;
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


    g_sound.playSound(SOUND_CLICK);

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

      g_sound.playSound(SOUND_DIE);

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
            if(!g_hasSpeech) {
              _this.gotoLevel(currentLevel);
            }
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
    updateRaycasters();
    player.tick(time, timeDelta);
    exit.tick(time, timeDelta);
    _this.updateEnergyBlocks(time, timeDelta);
    _this.updateEnergyDrainBlocks(time, timeDelta);
  }
}