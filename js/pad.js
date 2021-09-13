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
            g_sound.playSound(SOUND_REMOVE);

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
