export function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "es-ES";
  utter.rate = rate;
  utter.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const spanish = voices.find((v) => v.lang.startsWith("es"));
  if (spanish) utter.voice = spanish;
  window.speechSynthesis.speak(utter);
}

export function preloadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
