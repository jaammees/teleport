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