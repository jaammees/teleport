// say things
var english_voice = '';
var available_voices = window.speechSynthesis.getVoices();
var utterance = false;

function speak(text) {
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
