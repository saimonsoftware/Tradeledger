// No pinch / double-tap zoom in the INSTALLED app (home-screen / desktop app),
// so it feels like a native app. The website in a normal browser keeps zoom
// (people who need larger text rely on it, and blocking it fails WCAG 1.4.4).
// iPhone users who need magnification still have the system Zoom feature.
//
// Runs in <head> before first paint. It marks <html> with `tl-app`; CSS then sets
// `touch-action: pan-x pan-y` (no pinch, no double-tap zoom: Android/Chrome) and the
// listeners below cancel Safari's pinch gestures (iOS ignores touch-action for pinch).
// Static text only (no user content), which is why it's inlined in the layout.
export const NO_ZOOM_SCRIPT = `try{if(["standalone","minimal-ui","window-controls-overlay","fullscreen"].some(function(m){return window.matchMedia("(display-mode: "+m+")").matches})||navigator.standalone===true){document.documentElement.classList.add("tl-app");var n=function(e){e.preventDefault()},o={passive:false};["gesturestart","gesturechange","gestureend"].forEach(function(t){document.addEventListener(t,n,o)});document.addEventListener("touchmove",function(e){if(e.touches.length>1)e.preventDefault()},o)}}catch(e){}`;
