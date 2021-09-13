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
