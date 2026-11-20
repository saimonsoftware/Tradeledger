// Animated launch screen. Plays:
//  - in the browser: once, right after logging in / signing up, as the app opens
//    (the server sets the `tl-intro` cookie; see lib/auth/intro.ts);
//  - in the installed app (iPhone home screen, or desktop apps from Chrome/Edge/Safari
//    "Add to Dock"): every time it's launched.
//
// How it works, without any flash of the page underneath:
//  1. LAUNCH_SCRIPT runs in <head> before the page is painted (full page loads) and
//     adds `tl-launch` to <html> when the intro should play. After a login done by a
//     Server Action the app opens WITHOUT a page load, so <PostLoginIntro> (app
//     layout) does the same check just before the dashboard is first painted.
//  2. The splash markup below is always in the HTML but hidden; `.tl-launch` shows it
//     and plays the CSS animation (globals.css), which fades it away by itself.
//  3. The class is removed afterwards; the cookie is cleared, and sessionStorage
//     makes the installed-app intro once per launch.
// Pure CSS animation, so it plays even before React has loaded.

/**
 * Inline <head> script. Static text only (no user content), which is why
 * dangerouslySetInnerHTML is acceptable here; the CSP allows inline scripts.
 */
export const LAUNCH_SCRIPT = `try{var d=document.documentElement,a=location.pathname.indexOf("/app")===0,c=a&&document.cookie.split("; ").indexOf("tl-intro=1")>-1,s=["standalone","minimal-ui","window-controls-overlay"].some(function(m){return window.matchMedia("(display-mode: "+m+")").matches})||navigator.standalone===true;if(c)document.cookie="tl-intro=; Max-Age=0; Path=/";if(c||(s&&!sessionStorage.getItem("tl-launched"))){sessionStorage.setItem("tl-launched","1");d.classList.add("tl-launch");setTimeout(function(){d.classList.remove("tl-launch")},2600)}}catch(e){}`;

/** Decorative only (hidden from screen readers); it never blocks the app for long. */
export function LaunchSplash() {
  return (
    <div className="launch-splash" aria-hidden="true">
      <div className="launch-stack">
        <svg viewBox="0 0 32 32" fill="none" className="launch-tile">
          <rect
            x="0.5"
            y="0.5"
            width="31"
            height="31"
            rx="7.5"
            fill="#000"
            stroke="#fff"
            strokeOpacity="0.2"
          />
          <g stroke="#fff" strokeLinecap="round" strokeWidth="1.5" fill="#fff">
            <g className="launch-candle">
              <path d="M9 17v6" />
              <rect x="7.5" y="18.5" width="3" height="3.5" rx="0.75" strokeWidth="0" />
            </g>
            <g className="launch-candle">
              <path d="M16 11v12" />
              <rect x="14.5" y="13" width="3" height="6.5" rx="0.75" strokeWidth="0" />
            </g>
            <g className="launch-candle">
              <path d="M23 7v11" />
              <rect x="21.5" y="8.5" width="3" height="6.5" rx="0.75" strokeWidth="0" />
            </g>
          </g>
        </svg>
        <p className="launch-name">TradeLedger</p>
      </div>
    </div>
  );
}
