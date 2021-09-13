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
