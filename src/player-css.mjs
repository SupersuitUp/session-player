// Scoped styles for the player, in the Continental Works palette (continental-works-universe
// canon/craft/the-ascent.json). The accent is the ribbon's sixth stripe, mulberry #A12A5E. It was
// a red-orange, hex DB371F, until 2026-10-12, when Gary changed the stripe and its name ("Update
// color name and update Abu and propagate across all surfaces"), so the custom property is
// --ss-mulberry and the old one is gone. These properties are internal: theming the player
// through them was never documented, so there is no alias. On the dark terminal surfaces mulberry
// text would sit near 2.4:1, so every accent there uses the terminal's own #d97757 instead. Every class is ss- prefixed so the
// player can be dropped into any page (the wiki, a book reader) without colliding.
export const PLAYER_CSS = `
.ss-sim{--ss-ink:#1E1B19;--ss-cream:#F6E7C5;--ss-paper:#FBF5E7;--ss-mulberry:#A12A5E;--ss-petrol:#265E72;--ss-mustard:#E9A23B;--ss-sand:#EED79E;--ss-aqua:#69B1B5;
  position:relative;container:ss-sim ss-player/inline-size;font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:var(--ss-ink);width:100%;max-width:1040px;margin:0 auto;-webkit-text-size-adjust:100%}
.ss-sim *{box-sizing:border-box}
.ss-sim button{font:inherit;color:inherit;cursor:pointer}
.ss-stage{display:grid;grid-template-columns:1fr;gap:16px}
.ss-phone{position:relative;display:flex;flex-direction:column;height:var(--ss-height,min(760px,calc(100svh - 120px)));min-height:480px;background:var(--ss-paper);border:1px solid #e6d7b4;border-radius:28px;overflow:hidden;box-shadow:0 10px 40px rgba(30,27,25,.12)}
.ss-head{display:flex;align-items:center;gap:10px;padding:14px 14px 10px;border-bottom:1px solid #eadcbc;background:#fffaf0}
.ss-back{border:0;background:none;font-size:28px;line-height:1;padding:0 4px}
.ss-avatar{flex:none;width:34px;height:34px;border-radius:50%;background:var(--ss-petrol);color:var(--ss-cream);display:grid;place-items:center;font-weight:700}
.ss-titles{flex:1;min-width:0;display:flex;flex-direction:column}
.ss-titles b{font-family:Fraunces,Georgia,serif;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ss-titles small{color:#7a6d5a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ss-auto{display:flex;align-items:center;gap:4px;font-size:12px;color:#7a6d5a}
.ss-timepill{flex:none;font-weight:600;font-size:12px;line-height:1;padding:4px 8px;border-radius:999px;background:var(--ss-sand);color:var(--ss-ink);font-variant-numeric:tabular-nums}
.ss-counter{display:flex;justify-content:space-between;gap:8px;padding:8px 14px;background:var(--ss-ink);color:var(--ss-cream);font-size:13px;font-variant-numeric:tabular-nums}
.ss-counter b{color:var(--ss-mustard)}
.ss-log-wrap{position:relative;flex:1;min-height:0;display:flex;flex-direction:column}
.ss-log{flex:1;min-height:0;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}
.ss-intro{color:#7a6d5a;text-align:center;margin:auto 12px}
.ss-cmd-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:3px;margin-top:6px}
.ss-cmd{max-width:84%;background:var(--ss-petrol);color:#fff;padding:9px 13px;border-radius:18px 18px 4px 18px;white-space:pre-wrap;overflow-wrap:anywhere}
.ss-redirect{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ss-mulberry)}
.ss-reply{max-width:92%;overflow-wrap:anywhere}
.ss-reply p{margin:2px 0 0;white-space:pre-wrap}
.ss-who{font-size:11px;font-weight:700;color:var(--ss-mulberry);letter-spacing:.04em;text-transform:uppercase}
.ss-more{border:0;background:none;padding:0;color:var(--ss-petrol);font-size:13px;text-decoration:underline}
.ss-step{display:flex;align-items:baseline;gap:8px;font-size:13px;color:#4a4238;animation:ss-in .25s ease-out}
.ss-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--ss-mulberry);transform:translateY(-1px)}
.ss-group .ss-dot{background:#c9b48c}
.ss-group .ss-label{color:#8a7d68}
.ss-label{flex:1;min-width:0;overflow-wrap:anywhere}
.ss-dur{flex:none;font-size:12px;color:#8a7d68;font-variant-numeric:tabular-nums}
.ss-sheet{flex:none;max-height:72%;overflow-y:auto;background:#fffaf0;border-top:1px solid #e3cf9f;border-radius:20px 20px 0 0;padding:12px 14px calc(12px + env(safe-area-inset-bottom));box-shadow:0 -8px 24px rgba(30,27,25,.12);font-size:13px;animation:ss-up .28s ease-out}
.ss-tabs{display:flex;gap:6px;overflow-x:auto;margin-bottom:8px;scrollbar-width:none}
.ss-tab{flex:none;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border:1px solid #e3cf9f;color:#8a7d68;border-radius:999px;padding:2px 9px}
.ss-tab.ss-tab-done{background:#e8f1f3;border-color:#bcd5db;color:var(--ss-petrol)}
.ss-tab.ss-tab-now{background:var(--ss-petrol);border-color:var(--ss-petrol);color:#fff}
.ss-sheet .ss-q{margin:4px 0 10px;font-size:15px;white-space:pre-wrap;overflow-wrap:anywhere}
.ss-sheet .ss-opts{display:flex;flex-direction:column;gap:6px}
.ss-sim .ss-sheet button.ss-opt:disabled{cursor:default}
.ss-asking{font-size:13px;color:var(--ss-petrol);font-weight:600;animation:ss-blink 1.4s infinite}
.ss-asked{border-left:3px solid var(--ss-mustard);background:#fff8e8;border-radius:6px;padding:8px 10px;font-size:13px;animation:ss-in .25s ease-out}
.ss-aq+.ss-aq{margin-top:6px}
.ss-asked .ss-q{margin:0;color:#4a4238;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ss-asked .ss-a{margin:2px 0 0;font-weight:700;overflow-wrap:anywhere}
.ss-mine{margin:1px 0 0;color:#a86a00;font-size:12px}
@keyframes ss-up{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
.ss-board{background:#fff;border:1px solid #e3cf9f;border-radius:14px;padding:10px 12px;font-size:13px;box-shadow:0 2px 10px rgba(30,27,25,.06);animation:ss-in .25s ease-out}
.ss-board .ss-bq+.ss-bq{margin-top:10px;padding-top:10px;border-top:1px dashed #eadcbc}
.ss-bhead{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:var(--ss-sand);border-radius:999px;padding:1px 8px}
.ss-board .ss-q{margin:6px 0 8px;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}
.ss-opts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
.ss-opt{display:flex;gap:8px;align-items:flex-start;border:1px solid #eadcbc;border-radius:10px;padding:6px 8px;color:#6b6052}
.ss-opt b{display:block;font-weight:600;color:var(--ss-ink);overflow-wrap:anywhere}
.ss-opt small{display:block;color:#8a7d68;overflow-wrap:anywhere}
.ss-onum{flex:none;width:20px;height:20px;border-radius:50%;background:#f1e6cc;display:grid;place-items:center;font-size:11px;font-weight:700}
.ss-sim button.ss-opt{width:100%;text-align:left;background:#fff;cursor:pointer;transition:border-color .15s,background .15s}
.ss-sim button.ss-opt:hover,.ss-sim button.ss-opt:focus-visible{border-color:var(--ss-petrol);background:#f3f8f9;outline:none}
.ss-live-board{border-color:var(--ss-petrol);box-shadow:0 0 0 3px rgba(38,94,114,.15)}
.ss-sim .ss-opt.ss-yours,.ss-sim button.ss-opt.ss-yours{border-color:var(--ss-mustard);background:#fff4dc}
.ss-verdict{min-height:1.4em;margin:8px 0 0;font-size:13px;color:#a86a00}
.ss-verdict.ss-same{color:var(--ss-petrol);font-weight:600}
.ss-sim .ss-opt.ss-chosen,.ss-sim button.ss-opt.ss-chosen{border-color:var(--ss-petrol);background:#e8f1f3}
.ss-opt.ss-chosen .ss-onum{background:var(--ss-petrol);color:#fff}
.ss-dismissed .ss-opt{opacity:.55}
.ss-bfoot{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px}
.ss-decision{border-left:3px solid var(--ss-mustard);background:#fff4dc;padding:8px 10px;border-radius:6px;font-size:13px;animation:ss-in .25s ease-out}
.ss-decision p{margin:2px 0}
.ss-tag{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#a86a00}
.ss-a{font-weight:700}
.ss-made{align-self:flex-start;font-size:13px;background:#e3f0f0;border-radius:999px;padding:3px 10px;overflow-wrap:anywhere;animation:ss-in .25s ease-out}
.ss-made span{font-weight:700;color:var(--ss-petrol)}
.ss-typing{display:flex;gap:4px;padding:4px 2px}
.ss-typing i{width:6px;height:6px;border-radius:50%;background:#c9b48c;animation:ss-blink 1s infinite}
.ss-typing i:nth-child(2){animation-delay:.15s}.ss-typing i:nth-child(3){animation-delay:.3s}
.ss-composer{display:flex;gap:8px;align-items:stretch;padding:10px 12px calc(10px + env(safe-area-inset-bottom));border-top:1px solid #eadcbc;background:#fffaf0}
.ss-chip{flex:1;min-width:0;text-align:left;border:1px solid var(--ss-petrol);background:#fff;border-radius:16px;padding:8px 12px;display:flex;flex-direction:column;gap:1px;overflow-wrap:anywhere}
.ss-chip small{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ss-petrol)}
.ss-chip:disabled{opacity:.55;cursor:default}
.ss-field{position:relative;flex:1;min-width:0;display:flex}
.ss-field>.ss-chip{padding-right:46px}
.ss-sim .ss-mic{position:absolute;right:6px;bottom:6px;display:grid;place-items:center;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--ss-mulberry);touch-action:none;-webkit-user-select:none;user-select:none}
.ss-sim .ss-mic:not(:disabled):hover{background:color-mix(in srgb,var(--ss-mulberry) 12%,transparent)}
.ss-mic svg{width:12px;height:18px}
.ss-mic:disabled{opacity:.4}
.ss-sim .ss-send{flex:none;align-self:center;width:40px;height:40px;padding:0;border:0;border-radius:50%;background:var(--ss-petrol);color:#fff;font-size:20px;font-weight:700}
.ss-send:disabled{opacity:.35}
.ss-term .ss-send{background:#5c5751}
.ss-mic.ss-live{animation:ss-pulse 1s infinite}
.ss-end{flex:1;display:flex;flex-direction:column;gap:8px}
.ss-end p{margin:0;font-size:14px}
.ss-sim .ss-tray-handle{position:absolute;z-index:2;right:12px;bottom:10px;border:0;border-radius:999px;background:var(--ss-ink);color:var(--ss-cream);padding:6px 12px;font-size:13px;display:flex;gap:6px;box-shadow:0 4px 14px rgba(0,0,0,.2)}
.ss-tray{position:absolute;left:0;right:0;bottom:0;max-height:85%;overflow-y:auto;background:#fffaf0;border-top:1px solid #eadcbc;border-radius:20px 20px 0 0;padding:16px 14px 56px;box-shadow:0 -8px 30px rgba(0,0,0,.15)}
.ss-panel{display:none}
.ss-artifact-list{display:flex;flex-direction:column;gap:8px}
.ss-artifact{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #eadcbc;border-radius:10px;padding:8px 10px;animation:ss-in .3s ease-out}
.ss-kind{flex:none;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 6px;border-radius:4px;background:var(--ss-sand)}
.ss-kind.ss-link{background:var(--ss-aqua);color:#fff}
.ss-kind.ss-other{background:var(--ss-mulberry);color:#fff}
.ss-atitle{min-width:0;overflow-wrap:anywhere;font-size:14px}
.ss-empty{color:#8a7d68;font-size:14px;margin:0}
.ss-timeline{grid-column:1/-1;padding:4px 2px}
.ss-track{display:flex;align-items:center;gap:1px;height:12px}
.ss-seg{height:100%;border-radius:2px;min-width:2px}
.ss-seg.ss-human{background:var(--ss-petrol)}
.ss-seg.ss-ask{background:var(--ss-mustard)}
.ss-seg.ss-agent{background:#e0b9ca}
.ss-seg{position:relative;overflow:hidden}
.ss-seg .ss-fill{position:absolute;left:0;top:0;bottom:0;transition:width .4s ease-out}
.ss-seg.ss-agent .ss-fill{background:var(--ss-mulberry)}
.ss-seg.ss-ask{background:#f3dfa8}
.ss-seg.ss-ask .ss-fill{background:var(--ss-mustard)}
.ss-seg.ss-now{outline:2px solid var(--ss-ink);outline-offset:1px}
.ss-legend{display:flex;gap:14px;font-size:12px;color:#7a6d5a;margin-top:6px;flex-wrap:wrap}
.ss-legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.ss-legend i.ss-human{background:var(--ss-petrol)}.ss-legend i.ss-ask{background:var(--ss-mustard)}.ss-legend i.ss-agent{background:var(--ss-mulberry)}
.ss-picker{display:flex;flex-direction:column;gap:10px;padding:8px}
.ss-picker h2{font-family:Fraunces,Georgia,serif;margin:0 0 6px}
.ss-persona{display:flex;gap:12px;align-items:center;text-align:left;border:1px solid #eadcbc;background:var(--ss-paper);border-radius:14px;padding:12px}
@container ss-sim (min-width:760px){
  .ss-stage.ss-has-panel{grid-template-columns:minmax(360px,420px) 1fr}
  .ss-has-panel .ss-tray-handle,.ss-has-panel .ss-tray{display:none}
  .ss-panel{display:flex;flex-direction:column;gap:10px;align-self:start;max-height:760px;overflow-y:auto;padding:16px;background:#fffaf0;border:1px solid #eadcbc;border-radius:20px}
  .ss-panel h3{display:flex;justify-content:space-between;margin:0;font-family:Fraunces,Georgia,serif}
  .ss-panel h3 span{font-family:inherit;color:var(--ss-mulberry)}
}
.ss-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;animation:ss-in .3s ease-out}
.ss-strip{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin:0 0 8px}
.ss-cmd-wrap .ss-strip{justify-content:flex-end;margin:0}
.ss-sim .ss-thumb{position:relative;border:0;padding:0;background:#e9dcc0;border-radius:8px;overflow:hidden;aspect-ratio:1;display:block}
.ss-strip .ss-thumb{flex:none;width:72px}
.ss-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.ss-thumb span{position:absolute;left:0;right:0;bottom:0;font-size:10px;line-height:1.2;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.65));padding:10px 5px 4px;text-align:left}
.ss-sim .ss-lightbox{position:absolute;inset:0;z-index:50;border:0;padding:16px;background:rgba(20,18,16,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.ss-lightbox img{max-width:100%;max-height:80%;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.5)}
.ss-lightbox span{color:#f6e7c5;font-size:14px}
.ss-oimg{flex:none;width:52px;height:52px;border-radius:8px;object-fit:cover}
.ss-aimg{width:28px;height:28px;border-radius:5px;object-fit:cover;vertical-align:middle;margin-right:6px}
.ss-close-wrap{position:absolute;inset:0;z-index:40;display:flex;align-items:flex-end;justify-content:center;background:rgba(30,27,25,.45);padding:12px;animation:ss-fade .3s ease-out}
.ss-close{position:relative;overflow:hidden;width:100%;max-width:440px;max-height:100%;overflow-y:auto;background:#fffaf0;border-radius:24px;padding:22px 20px 18px;box-shadow:0 20px 60px rgba(0,0,0,.35);animation:ss-up .4s cubic-bezier(.2,.9,.3,1.2)}
.ss-burst{position:absolute;left:50%;top:26px;width:0;height:0;pointer-events:none}
.ss-burst i{position:absolute;width:7px;height:7px;border-radius:2px;background:var(--ss-mustard);transform:rotate(calc(var(--i) * 25.7deg)) translateY(0);animation:ss-pop 1.1s ease-out forwards;opacity:0}
.ss-burst i:nth-child(3n){background:var(--ss-mulberry)}.ss-burst i:nth-child(3n+1){background:var(--ss-aqua)}
.ss-kicker{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ss-mulberry);text-align:center}
.ss-close h3{font-family:Fraunces,Georgia,serif;font-size:24px;margin:4px 0 14px;text-align:center}
.ss-split{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.ss-split>div{background:#fff;border:1px solid #eadcbc;border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:1px}
.ss-split>div:first-child{background:var(--ss-ink);border-color:var(--ss-ink);color:var(--ss-cream)}
.ss-split b{font-size:22px;font-family:Fraunces,Georgia,serif}
.ss-split>div:first-child b{color:var(--ss-mustard)}
.ss-split small{font-size:12px;opacity:.8}
.ss-freed{margin:0 0 10px;padding:10px 12px;border-radius:12px;background:#e8f1f3;color:var(--ss-petrol);font-weight:600;font-size:14px}
.ss-edge{margin:0 0 10px;padding:10px 12px;border-radius:12px;background:#fff4dc;border:1px solid #f0d89a;font-size:14px}
.ss-edge b{font-size:18px;color:#a86a00}
.ss-layers{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.ss-layers span{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:#fff;border:1px solid #f0d89a;border-radius:999px;padding:1px 8px}
.ss-close-made small{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8a7d68}
.ss-close-made ul{margin:4px 0 10px;padding-left:18px;font-size:14px}
.ss-idle{font-size:12px;color:#8a7d68;margin:0 0 12px}
.ss-close-actions{display:flex;gap:8px}
.ss-close-actions .ss-chip{text-align:center;font-weight:700;align-items:center}
.ss-sim .ss-ghost{border-color:#d9c79f;background:transparent}
@keyframes ss-fade{from{opacity:0}to{opacity:1}}
@keyframes ss-pop{0%{opacity:1;transform:rotate(calc(var(--i) * 25.7deg)) translateY(0)}100%{opacity:0;transform:rotate(calc(var(--i) * 25.7deg)) translateY(-90px)}}
@keyframes ss-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@keyframes ss-blink{0%,100%{opacity:.3}50%{opacity:1}}
@keyframes ss-pulse{0%,100%{box-shadow:0 0 0 0 rgba(161,42,94,.5)}50%{box-shadow:0 0 0 10px rgba(161,42,94,0)}}
/* Device framing (device.mjs). The bar sits outside the device: what is simulated, and the switch. */
.ss-devicebar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 2px 8px;min-height:26px;font-size:12px;color:#7a6d5a}
.ss-simlabel{letter-spacing:.02em}
.ss-simpill{background:var(--ss-ink);color:var(--ss-cream);border-radius:999px;padding:3px 10px;font-weight:600;white-space:nowrap}
.ss-devswitch{display:inline-flex;border:1px solid #e3cf9f;border-radius:999px;padding:2px;background:#fffaf0}
.ss-sim .ss-devopt{border:0;background:none;border-radius:999px;padding:2px 9px;font-size:12px;color:#7a6d5a;line-height:18px}
.ss-sim .ss-devopt[aria-checked="true"]{background:var(--ss-petrol);color:#fff}
.ss-sim .ss-devopt:focus-visible{outline:2px solid var(--ss-petrol);outline-offset:1px}
.ss-frame-iphone,.ss-frame-macbook{justify-items:center}
/* The iPhone: drawn in CSS, sized from the height it is given and never wider than its column. */
.ss-iphone{--ss-dh:var(--ss-height,min(820px,calc(100svh - 110px)));position:relative;height:min(var(--ss-dh),calc(100cqw * 2.09));aspect-ratio:414/868;max-width:100%;container-type:size;padding:2.9%;background:#121212;border-radius:13.5%/6.45%;box-shadow:0 0 0 1.5px #3b3b3d,0 0 0 4px #1b1b1c,0 24px 60px rgba(30,27,25,.28)}
.ss-iphone>.ss-phone{height:100%;min-height:0;border:0;border-radius:11cqw;box-shadow:none}
.ss-btn{position:absolute;width:3px;background:#2b2b2d;border-radius:2px}
.ss-btn-a{left:-5px;top:16%;height:3.6%}.ss-btn-v1{left:-5px;top:23%;height:7%}.ss-btn-v2{left:-5px;top:31.5%;height:7%}.ss-btn-p{right:-5px;top:26%;height:10.5%}
.ss-status{flex:none;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;height:12.5cqw;padding:0 6.5cqw;background:#fffaf0;font-weight:600;font-size:4.1cqw;color:var(--ss-ink)}
.ss-island{width:31cqw;height:9.2cqw;border-radius:999px;background:#000}
.ss-status-icons{justify-self:end;display:flex;gap:1.6cqw;align-items:center}
.ss-status-icons svg{height:3.2cqw;width:auto;fill:currentColor}
.ss-frame-iphone .ss-head{padding-top:4px}
/* The MacBook: lid, screen with a menu bar and a Claude Code window, base. Fluid: the window
   reflows at the width it gets rather than shrinking text. */
.ss-mac{--ss-dh:var(--ss-height,min(820px,calc(100svh - 110px)));width:min(92%,calc((var(--ss-dh) - 16px) * 1.54));margin:0 auto}
.ss-mac-lid{position:relative;aspect-ratio:1.54;padding:1.6% 1.6% 2.4%;background:#0e0e10;border-radius:18px 18px 8px 8px;box-shadow:0 0 0 1.5px #3c3c40,0 24px 60px rgba(30,27,25,.25)}
.ss-mac-screen{position:relative;height:100%;display:flex;flex-direction:column;overflow:hidden;border-radius:6px;background:linear-gradient(140deg,#265E72 0%,#69B1B5 42%,#EED79E 72%,#E9A23B 88%,#A12A5E 100%)}
.ss-mac-notch{position:absolute;z-index:2;left:50%;top:0;width:11%;height:22px;transform:translateX(-50%);background:#0e0e10;border-radius:0 0 7px 7px}
.ss-menubar{flex:none;display:flex;align-items:center;gap:14px;height:24px;padding:0 12px;overflow:hidden;white-space:nowrap;font:12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:#1e1b19;background:rgba(251,245,231,.78);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.ss-menu-mark{width:11px;height:11px;border-radius:50%;background:var(--ss-ink)}
.ss-menu-right{margin-left:auto;display:flex;align-items:center;gap:10px;font-variant-numeric:tabular-nums}
.ss-menu-right svg{fill:currentColor}
.ss-mac-base{position:relative;width:108%;margin-left:-4%;height:16px;background:linear-gradient(#e4e4e8,#b4b4ba 70%,#8e8e95);border-radius:0 0 50% 50%/0 0 14px 14px}
.ss-mac-base::before{content:"";position:absolute;left:50%;top:0;width:15%;height:6px;transform:translateX(-50%);background:#a2a2a8;border-radius:0 0 8px 8px}
.ss-window{container:ss-sim/inline-size;display:flex;flex-direction:column;overflow:hidden;border-radius:10px;background:#1a1918;border:1px solid rgba(0,0,0,.55);box-shadow:0 18px 50px rgba(0,0,0,.4)}
.ss-mac-screen>.ss-window{flex:1;min-height:0;margin:3% 3.5% 3.5%}
.ss-titlebar{flex:none;display:flex;align-items:center;gap:10px;height:28px;padding:0 10px;background:#2b2927;border-bottom:1px solid #111;color:#bdb6ab;font:12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
.ss-traffic{display:flex;gap:7px}
.ss-traffic i{width:11px;height:11px;border-radius:50%;background:#ff5f57}
.ss-traffic i:nth-child(2){background:#febc2e}.ss-traffic i:nth-child(3){background:#28c840}
.ss-wtitle{flex:1;text-align:center;font-weight:600;margin-right:50px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ss-in-window{flex:1;min-height:0;gap:0;grid-template-rows:minmax(0,1fr)}
.ss-in-window>.ss-phone{height:100%;min-height:0;border:0;border-radius:0;box-shadow:none}
@container ss-sim (min-width:760px){
  .ss-in-window.ss-has-panel{grid-template-columns:minmax(0,1fr) minmax(220px,32%)}
  .ss-in-window .ss-panel{max-height:none;height:100%;border-radius:0;border-width:0 0 0 1px;background:#201e1c;border-color:#33302d;color:#e6e1d9}
}
/* Too narrow for a believable laptop (a book column, a sidebar): the MacBook keeps its window
   and its label and drops the lid, menu bar and base, rather than shrinking into a toy. */
@container ss-sim (max-width:559px){
  .ss-mac{width:100%}
  .ss-mac-lid{aspect-ratio:auto;height:var(--ss-dh);padding:0;background:none;box-shadow:none;border-radius:0}
  .ss-mac-screen{background:none;border-radius:0;overflow:visible}
  .ss-menubar,.ss-mac-notch,.ss-mac-base{display:none}
  .ss-mac-screen>.ss-window{margin:0}
}
.ss-window-compact{width:100%}
.ss-window-compact>.ss-phone{height:calc(var(--ss-height,min(760px,calc(100svh - 120px))) - 28px);border:0;border-radius:0;box-shadow:none}
/* Claude Code's terminal, inside either MacBook window. */
.ss-term .ss-phone{background:#1a1918;color:#e6e1d9;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ss-term .ss-head{background:#232120;border-bottom-color:#33302d}
.ss-term .ss-titles b{font-family:inherit;font-size:13px;color:#e6e1d9}
.ss-term .ss-titles small,.ss-term .ss-auto,.ss-term .ss-intro,.ss-term .ss-dur,.ss-term .ss-empty,.ss-term .ss-group .ss-label,.ss-term .ss-opt small{color:#8f887d}
.ss-term .ss-avatar{background:#d97757;color:#1a1918;border-radius:6px}
.ss-term .ss-counter{background:#0f0e0d;color:#cfc8bd}
.ss-term .ss-counter b{color:#d97757}
.ss-term .ss-cmd-wrap{align-items:stretch}
.ss-term .ss-cmd{max-width:none;background:#2a2826;color:#e6e1d9;border-radius:4px;border-left:2px solid #8f887d;padding:6px 10px}
.ss-term .ss-cmd::before{content:"> ";color:#8f887d}
.ss-term .ss-who,.ss-term .ss-more,.ss-term .ss-asking,.ss-term .ss-redirect,.ss-term .ss-panel h3 span{color:#d97757}
.ss-term .ss-reply p{color:#e6e1d9}
.ss-term .ss-step{color:#bdb6ab}
.ss-term .ss-dot{background:#7fb069}
.ss-term .ss-group .ss-dot{background:#5c5751}
.ss-term .ss-asked{background:#2a2622;border-left-color:#d9a441}
.ss-term .ss-asked .ss-q{color:#bdb6ab}
.ss-term .ss-mine,.ss-term .ss-tag,.ss-term .ss-verdict{color:#d9a441}
.ss-term .ss-verdict.ss-same{color:#69b1b5}
.ss-term .ss-bhead{background:#3a3633;color:#e6e1d9}
.ss-term .ss-made{background:#22302c;color:#cfe3dc}
.ss-term .ss-made span{color:#7fc4b0}
.ss-term .ss-typing i{background:#5c5751}
.ss-term .ss-composer{background:#1a1918;border-top-color:#33302d}
.ss-term .ss-chip{background:#1a1918;border-color:#5c5751;border-radius:8px;color:#e6e1d9}
.ss-term .ss-chip small{color:#d97757}
.ss-term .ss-mic{color:#d97757}
.ss-term .ss-sheet{background:#232120;border-top-color:#3a3633;color:#e6e1d9}
.ss-term .ss-tab{border-color:#3a3633;color:#8f887d}
.ss-term .ss-tab.ss-tab-done{background:#24343a;border-color:#3e5a63;color:#9cc7d3}
.ss-term .ss-tab.ss-tab-now{background:#d97757;border-color:#d97757;color:#1a1918}
.ss-sim .ss-term button.ss-opt{background:#1a1918;border-color:#3a3633;color:#bdb6ab}
.ss-term .ss-opt b{color:#e6e1d9}
.ss-term .ss-onum{background:#33302d;color:#e6e1d9}
.ss-sim .ss-term button.ss-opt:hover,.ss-sim .ss-term button.ss-opt:focus-visible{background:#2a2826;border-color:#d97757}
.ss-sim .ss-term button.ss-opt.ss-chosen{background:#24343a;border-color:#69b1b5}
.ss-sim .ss-term button.ss-opt.ss-yours{background:#3a2f1e;border-color:#d9a441}
.ss-sim .ss-term .ss-tray-handle{background:#e6e1d9;color:#1a1918}
.ss-term .ss-tray{background:#232120;border-top-color:#3a3633}
.ss-term .ss-artifact{background:#232120;border-color:#3a3633;color:#e6e1d9}
.ss-term .ss-panel h3{font-family:inherit;font-size:14px}
.ss-start{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(251,245,231,.82);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
.ss-startcard{display:flex;flex-direction:column;align-items:center;gap:8px;max-width:300px;text-align:center}
.ss-starttitle{font-family:Fraunces,Georgia,serif;font-size:20px;line-height:1.25}
.ss-startcard p{margin:0;color:#4a4238;font-size:14px}
.ss-startcard small{color:#7a6d5a;font-size:12px}
.ss-sim .ss-startbtn{margin-top:6px;border:0;border-radius:999px;background:var(--ss-mulberry);color:#fff;font-weight:700;font-size:16px;padding:12px 26px;box-shadow:0 6px 18px rgba(161,42,94,.3)}
.ss-sim .ss-startbtn:focus-visible{outline:3px solid var(--ss-petrol);outline-offset:2px}
.ss-startauto{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:600}
.ss-term .ss-start{background:rgba(26,25,24,.86)}
.ss-term .ss-startcard p{color:#cfc8bd}.ss-term .ss-startcard small{color:#8f887d}.ss-term .ss-starttitle,.ss-term .ss-startauto{color:#e6e1d9}
.ss-term .ss-startbtn{background:#d97757}
.ss-devhint{font-size:inherit;opacity:.85}
/* Toasts float over the top of the demo: no layout shift, gone after a few seconds. */
.ss-toast{position:absolute;z-index:60;left:50%;top:40px;transform:translateX(-50%);width:max-content;max-width:min(92%,420px);pointer-events:none}
.ss-toast span{display:block;background:var(--ss-ink);color:var(--ss-cream);font-size:13px;line-height:1.35;border-radius:12px;padding:8px 12px;box-shadow:0 8px 24px rgba(0,0,0,.25);text-align:center;animation:ss-toast 3.2s ease forwards}
@keyframes ss-toast{0%{opacity:0;transform:translateY(-4px)}8%,85%{opacity:1;transform:none}100%{opacity:0}}
.ss-term .ss-timepill{background:#2a2826;color:#e6e1d9}
/* A whole laptop (moved here from the continentalworks.ai embed page): the Claude Code
   window reads as a screen, not a poster. Its text follows the window's width (10.5 to 12px,
   was 13px) and everything in it is drawn tighter, so more of the session fits. ss-player names
   the player's own root, so these hold only where the player draws the lid (560px and up,
   its own breakpoint), never inside the window's narrower container: the phone, the drawn
   iPhone, the phone-width window and the lidless MacBook keep their sizes. The menu bar
   shows the session's time there, so the header's time pill is hidden. */
@container ss-player (min-width:560px){
.ss-mac .ss-timepill{display:none}
.ss-mac .ss-term .ss-phone,.ss-mac .ss-term .ss-panel{font-size:clamp(10.5px,1.3cqw,12px);line-height:1.45}
.ss-mac .ss-menubar{height:20px;font-size:11px;gap:12px}
.ss-mac .ss-mac-notch{height:18px}
.ss-mac .ss-titlebar{height:22px;font-size:11px}
.ss-mac .ss-traffic{gap:6px}
.ss-mac .ss-traffic i{width:9px;height:9px}
.ss-mac .ss-head{padding:7px 12px 6px;gap:8px}
.ss-mac .ss-avatar{width:22px;height:22px;font-size:11px}
.ss-mac .ss-back{font-size:20px}
.ss-mac .ss-term .ss-titles b{font-size:1em}
.ss-mac .ss-titles small{font-size:.86em}
.ss-mac .ss-auto{font-size:.9em}
.ss-mac .ss-counter{padding:4px 12px;font-size:.92em}
.ss-mac .ss-log{padding:9px 12px;gap:5px}
.ss-mac .ss-term .ss-cmd{padding:4px 9px}
.ss-mac .ss-step,.ss-mac .ss-more,.ss-mac .ss-asking,.ss-mac .ss-asked,.ss-mac .ss-decision,.ss-mac .ss-made,.ss-mac .ss-board,.ss-mac .ss-sheet,.ss-mac .ss-verdict{font-size:.95em}
.ss-mac .ss-dur,.ss-mac .ss-mine{font-size:.88em}
.ss-mac .ss-who,.ss-mac .ss-redirect,.ss-mac .ss-tag,.ss-mac .ss-tab,.ss-mac .ss-bhead,.ss-mac .ss-chip small{font-size:.8em}
.ss-mac .ss-board .ss-q,.ss-mac .ss-sheet .ss-q{font-size:1.05em}
.ss-mac .ss-opt{padding:4px 8px}
.ss-mac .ss-composer{padding:6px 10px;gap:6px}
.ss-mac .ss-chip{padding:5px 10px}
.ss-sim .ss-mac .ss-term .ss-mic{width:28px;height:28px}
.ss-sim .ss-mac .ss-term .ss-send{width:26px;height:26px;font-size:14px}
.ss-mac .ss-end p,.ss-mac .ss-atitle,.ss-mac .ss-empty{font-size:1em}
.ss-mac .ss-panel{padding:10px 12px;gap:8px}
.ss-mac .ss-term .ss-panel h3{font-size:1.05em}
.ss-mac .ss-artifact{padding:5px 8px}
.ss-mac .ss-starttitle{font-size:1.5em}
.ss-mac .ss-startcard p,.ss-mac .ss-startauto{font-size:1.05em}
.ss-mac .ss-startcard small{font-size:.92em}
.ss-sim .ss-mac .ss-term .ss-startbtn{font-size:1.15em;padding:8px 20px}
.ss-sim .ss-mac .ss-term .ss-tray-handle{font-size:.95em;padding:4px 10px;right:10px;bottom:8px}
}
.ss-pointer{position:absolute;left:0;top:0;width:0;height:0;z-index:40;pointer-events:none;opacity:0;transition-property:transform,opacity;transition-timing-function:cubic-bezier(.45,.05,.25,1),ease}
.ss-pointer.ss-on{opacity:1}
.ss-pointer .ss-touch{position:absolute;left:-17px;top:-17px;width:34px;height:34px;border-radius:50%;background:rgba(38,94,114,.18);border:2px solid rgba(38,94,114,.55);opacity:0;transform:scale(.7);transition:opacity .1s,transform .1s}
.ss-pointer.ss-pressed .ss-touch{opacity:1;transform:scale(1)}
.ss-pointer .ss-ripple{position:absolute;left:-17px;top:-17px;width:34px;height:34px;border-radius:50%;border:2px solid rgba(38,94,114,.6);animation:ss-ripple .5s ease-out forwards}
@keyframes ss-ripple{from{opacity:.75;transform:scale(.5)}to{opacity:0;transform:scale(2.3)}}
.ss-finger-art{position:absolute;left:-20px;top:-11px;transform-origin:20px 11px;transform:rotate(-14deg);filter:drop-shadow(0 6px 10px rgba(30,27,25,.28));transition:transform .12s ease-out}
.ss-finger.ss-pressed .ss-finger-art{transform:rotate(-14deg) scale(.93) translateY(2px);filter:drop-shadow(0 2px 4px rgba(30,27,25,.3))}
.ss-cursor-art{position:absolute;left:-1px;top:-1px;transform-origin:1px 1px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45));transition:transform .08s}
.ss-cursor.ss-pressed .ss-cursor-art{transform:scale(.88)}
.ss-cursor .ss-touch{left:-13px;top:-13px;width:26px;height:26px}
.ss-cursor .ss-ripple{left:-13px;top:-13px;width:26px;height:26px}
.ss-term .ss-pointer .ss-touch,.ss-term .ss-pointer .ss-ripple{border-color:rgba(217,119,87,.75);background:rgba(217,119,87,.16)}
.ss-term .ss-pointer .ss-ripple{background:none}
.ss-otherfield{display:flex;flex-direction:column;gap:4px;border:1px solid var(--ss-petrol);border-radius:10px;padding:7px 8px;background:#fff;animation:ss-in .2s ease-out}
.ss-otherfield>small{color:#8a7d68;font-size:11px}
.ss-otherbox{display:flex;align-items:flex-end;gap:8px}
.ss-othertext{flex:1;min-width:0;max-height:7.5em;overflow-y:auto;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--ss-ink);font-size:14px;line-height:1.4;min-height:1.4em}
.ss-caret{display:inline-block;width:2px;height:1.05em;margin-left:1px;vertical-align:-2px;background:var(--ss-petrol);animation:ss-blink 1s steps(1) infinite}
@keyframes ss-blink{50%{opacity:0}}
.ss-othersend{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--ss-petrol);color:#fff;font-weight:700;font-size:16px}
.ss-term .ss-otherfield{background:#1a1918;border-color:#5c5751}
.ss-term .ss-othertext{color:#e6e1d9;font-size:inherit}
.ss-term .ss-caret{background:#d97757}
.ss-term .ss-othersend{background:#5c5751}
@media (prefers-reduced-motion:reduce){.ss-sim *{animation:none!important;transition:none!important}}
`;

// THE MAISON THEME (0.10.0, Gary Sheng 2026-10-19: "case study player needs refinement of beauty"). The
// Continental Works house moved from the Ascent (cream, the ribbon, mulberry) to the Maison (the
// house's night, marble and bronze; continental-works-universe canon/craft/the-maison.json) on
// 2026-10-15, and the player still wore the Ascent on every Maison page that framed it. `theme:
// 'maison'` (the prop, theme="maison" on the tag, ?theme=maison on the embed URL) adds .ss-maison to
// the root and these rules win over the default sheet, which is untouched for every other host.
//
// The seven tokens are the canon's own hexes. Every text pair was measured (test/maison.test.mjs):
// bronze text is bronze mixed 62% into ink, 5.67:1 on marble (bronze itself is 3.09:1, so it is only
// ever a hairline, a fill or a glow there); muted text is ink mixed 70% into marble, 6.01:1. The
// devices' surrounds (the device bar, the switch) sit on the host's night, so they read in mist.
// Claude Code's terminal keeps its own colours, because it is the record of a real session; only
// the player's chrome over it (the Start card) wears the house.
const MAISON_SCREEN_CSS = `
.ss-sim.ss-maison{--ss-ink:#1c1a17;--ss-cream:#f4f1ec;--ss-paper:#f4f1ec;--ss-mulberry:#735b3a;--ss-petrol:#17171a;--ss-mustard:#a8834f;--ss-sand:#e8e0d2;--ss-aqua:#d8d1c4;
  --ss-night:#17171a;--ss-marble:#f4f1ec;--ss-bronze:#a8834f;--ss-mist:#d8d1c4;--ss-travertine:#e8e0d2;--ss-bronze-text:#735b3a;--ss-muted:#5d5b57;--ss-line:color-mix(in srgb,#a8834f 30%,#f4f1ec);
  --ss-display:"DM Serif Display",Georgia,serif;font-family:"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
.ss-maison .ss-titles b,.ss-maison .ss-starttitle,.ss-maison .ss-close h3,.ss-maison .ss-split b,.ss-maison .ss-picker h2,.ss-maison .ss-panel h3{font-family:var(--ss-display);font-weight:400}
.ss-maison .ss-term .ss-titles b,.ss-maison .ss-term .ss-panel h3{font-family:inherit}
/* The surrounds, on the host's night. */
.ss-maison .ss-devicebar{color:var(--ss-mist)}
.ss-maison .ss-simpill{background:transparent;color:var(--ss-mist);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ss-bronze) 55%,transparent);font-weight:500;letter-spacing:.04em}
.ss-maison .ss-devswitch{background:transparent;border-color:color-mix(in srgb,var(--ss-bronze) 55%,transparent)}
.ss-sim.ss-maison .ss-devopt{color:var(--ss-mist)}
.ss-sim.ss-maison .ss-devopt[aria-checked="true"]{background:var(--ss-bronze);color:var(--ss-night)}
.ss-sim.ss-maison .ss-devopt:focus-visible{outline-color:var(--ss-bronze)}
/* The devices: the house's handset and laptop, a lifted night with a bronze hairline. */
.ss-maison .ss-iphone{background:color-mix(in oklab,var(--ss-night) 82%,var(--ss-marble));box-shadow:0 0 0 1px color-mix(in srgb,var(--ss-bronze) 55%,transparent),0 24px 64px rgba(0,0,0,.45)}
.ss-maison .ss-btn{background:color-mix(in oklab,var(--ss-night) 70%,var(--ss-bronze))}
.ss-maison .ss-island{background:#000}
.ss-maison .ss-mac-lid{background:color-mix(in oklab,var(--ss-night) 82%,var(--ss-marble));box-shadow:0 0 0 1px color-mix(in srgb,var(--ss-bronze) 55%,transparent),0 24px 64px rgba(0,0,0,.45)}
.ss-maison .ss-mac-notch{background:color-mix(in oklab,var(--ss-night) 82%,var(--ss-marble))}
.ss-maison .ss-mac-screen{background:radial-gradient(70% 60% at 50% 38%,color-mix(in oklab,var(--ss-bronze) 22%,transparent),transparent 72%),var(--ss-night)}
.ss-maison .ss-menubar{color:var(--ss-mist);background:color-mix(in srgb,var(--ss-night) 72%,transparent)}
.ss-maison .ss-menu-mark{background:var(--ss-bronze)}
.ss-maison .ss-mac-base{background:linear-gradient(var(--ss-travertine),color-mix(in oklab,var(--ss-mist) 70%,var(--ss-night)) 75%,color-mix(in oklab,var(--ss-mist) 45%,var(--ss-night)))}
.ss-maison .ss-mac-base::before{background:color-mix(in oklab,var(--ss-mist) 55%,var(--ss-night))}
@container ss-sim (max-width:559px){.ss-maison .ss-mac-lid{background:none;box-shadow:none}.ss-maison .ss-mac-screen{background:none}}
/* The screen: marble, ink, bronze hairlines. */
.ss-maison .ss-phone{border-color:var(--ss-line);box-shadow:0 10px 40px rgba(0,0,0,.25)}
.ss-maison .ss-head,.ss-maison .ss-status,.ss-maison .ss-composer,.ss-maison .ss-sheet,.ss-maison .ss-tray,.ss-maison .ss-close{background:var(--ss-marble);border-color:var(--ss-line)}
.ss-maison .ss-avatar{background:var(--ss-night);color:var(--ss-marble)}
.ss-maison .ss-titles small,.ss-maison .ss-auto,.ss-maison .ss-intro,.ss-maison .ss-legend,.ss-maison .ss-dur,.ss-maison .ss-group .ss-label,.ss-maison .ss-opt small,.ss-maison .ss-empty,.ss-maison .ss-idle,.ss-maison .ss-close-made small,.ss-maison .ss-startcard small{color:var(--ss-muted)}
.ss-maison .ss-step,.ss-maison .ss-asked .ss-q,.ss-maison .ss-startcard p,.ss-maison .ss-opt{color:var(--ss-ink)}
.ss-maison .ss-timepill{background:var(--ss-travertine)}
.ss-maison .ss-counter{background:var(--ss-night);color:var(--ss-marble)}
.ss-maison .ss-counter b{color:var(--ss-bronze)}
.ss-maison .ss-cmd{background:var(--ss-night);color:var(--ss-marble)}
.ss-maison .ss-more,.ss-maison .ss-asking,.ss-maison .ss-made span,.ss-maison .ss-chip small,.ss-maison .ss-verdict.ss-same{color:var(--ss-bronze-text)}
.ss-maison .ss-group .ss-dot,.ss-maison .ss-typing i{background:color-mix(in srgb,var(--ss-bronze) 55%,var(--ss-marble))}
.ss-maison .ss-tab{border-color:var(--ss-line);color:var(--ss-muted)}
.ss-maison .ss-tab.ss-tab-done{background:var(--ss-travertine);border-color:var(--ss-line);color:var(--ss-ink)}
.ss-maison .ss-tab.ss-tab-now{background:var(--ss-night);border-color:var(--ss-night);color:var(--ss-marble)}
.ss-maison .ss-asked,.ss-maison .ss-decision{border-left-color:var(--ss-bronze);background:var(--ss-travertine)}
.ss-maison .ss-mine,.ss-maison .ss-tag,.ss-maison .ss-verdict,.ss-maison .ss-edge b{color:var(--ss-bronze-text)}
.ss-maison .ss-board,.ss-maison .ss-artifact,.ss-maison .ss-split>div,.ss-maison .ss-persona{background:#fff;border-color:var(--ss-line);box-shadow:none}
.ss-maison .ss-board .ss-bq+.ss-bq{border-top-color:var(--ss-line)}
.ss-maison .ss-opt{border-color:var(--ss-line)}
.ss-maison .ss-onum{background:var(--ss-travertine)}
.ss-sim.ss-maison button.ss-opt:hover,.ss-sim.ss-maison button.ss-opt:focus-visible{border-color:var(--ss-bronze);background:var(--ss-marble)}
.ss-maison .ss-live-board{border-color:var(--ss-bronze);box-shadow:0 0 0 3px color-mix(in srgb,var(--ss-bronze) 22%,transparent)}
.ss-sim.ss-maison .ss-opt.ss-yours,.ss-sim.ss-maison button.ss-opt.ss-yours{border-color:var(--ss-bronze);background:var(--ss-travertine)}
.ss-sim.ss-maison .ss-opt.ss-chosen,.ss-sim.ss-maison button.ss-opt.ss-chosen{border-color:var(--ss-night);background:var(--ss-travertine)}
.ss-maison .ss-opt.ss-chosen .ss-onum{background:var(--ss-night);color:var(--ss-marble)}
.ss-maison .ss-made{background:var(--ss-travertine)}
.ss-maison .ss-chip{border-color:var(--ss-night)}
.ss-sim.ss-maison .ss-mic{color:var(--ss-night)}
.ss-sim.ss-maison .ss-send{background:var(--ss-night);color:var(--ss-marble)}
.ss-maison .ss-mic.ss-live{animation:ss-maison-pulse 1s infinite}
@keyframes ss-maison-pulse{0%,100%{box-shadow:0 0 0 0 rgba(168,131,79,.55)}50%{box-shadow:0 0 0 10px rgba(168,131,79,0)}}
.ss-sim.ss-maison .ss-tray-handle{background:var(--ss-night);color:var(--ss-marble)}
.ss-maison .ss-kind{background:var(--ss-travertine);color:var(--ss-ink)}
.ss-maison .ss-kind.ss-link,.ss-maison .ss-kind.ss-other{background:var(--ss-night);color:var(--ss-marble)}
.ss-maison .ss-seg.ss-human{background:var(--ss-night)}
.ss-maison .ss-seg.ss-agent{background:color-mix(in srgb,var(--ss-bronze) 35%,var(--ss-marble))}
.ss-maison .ss-seg.ss-agent.ss-past,.ss-maison .ss-legend i.ss-agent{background:var(--ss-bronze)}
.ss-maison .ss-legend i.ss-human{background:var(--ss-night)}
@container ss-sim (min-width:760px){.ss-maison .ss-panel{background:var(--ss-marble);border-color:var(--ss-line)}.ss-maison .ss-panel h3 span{color:var(--ss-bronze-text)}}
.ss-sim.ss-maison .ss-thumb{background:var(--ss-travertine)}
.ss-maison .ss-lightbox span{color:var(--ss-marble)}
.ss-maison .ss-close-wrap{background:color-mix(in srgb,var(--ss-night) 55%,transparent)}
.ss-maison .ss-split>div:first-child{background:var(--ss-night);border-color:var(--ss-night);color:var(--ss-marble)}
.ss-maison .ss-split>div:first-child b{color:var(--ss-bronze)}
.ss-maison .ss-freed{background:var(--ss-travertine);color:var(--ss-ink)}
.ss-maison .ss-edge{background:var(--ss-travertine);border-color:var(--ss-line)}
.ss-maison .ss-layers span{border-color:var(--ss-line)}
.ss-sim.ss-maison .ss-ghost{border-color:var(--ss-line)}
.ss-maison .ss-toast span{background:var(--ss-night);color:var(--ss-marble);box-shadow:0 0 0 1px color-mix(in srgb,var(--ss-bronze) 45%,transparent),0 8px 24px rgba(0,0,0,.3)}
`;

// Claude Code's terminal keeps its own colours inside .ss-maison: every top-level .ss-term rule of the
// default sheet, re-emitted under .ss-maison so it outranks the Maison's screen rules (same selector
// plus one class). Derived from PLAYER_CSS, so a new terminal rule is restored without being listed.
const TERMINAL_RULES = PLAYER_CSS.split('\n').filter((l) => /^(\.ss-sim )?\.ss-term[ .]/.test(l) && !/ss-start/.test(l));
const TERMINAL_RESTORE = TERMINAL_RULES.map((l) => l.replace(/(^|,)(\.ss-sim )?\.ss-term/g, (_, sep, sim) => `${sep}${sim ? '.ss-sim' : ''}.ss-maison .ss-term`)).join('\n')
  + '\n@container ss-sim (min-width:760px){.ss-maison .ss-in-window .ss-panel{background:#201e1c;border-color:#33302d;color:#e6e1d9}}';

const MAISON_START_CSS = `
/* The Start card: marble glass over the screen, one night button with marble type. */
.ss-maison .ss-start{background:color-mix(in srgb,var(--ss-marble) 84%,transparent)}
.ss-maison .ss-starttitle{font-size:22px;color:var(--ss-ink)}
.ss-sim.ss-maison .ss-startbtn{background:var(--ss-night);color:var(--ss-marble);font-weight:500;letter-spacing:.14em;text-transform:uppercase;font-size:13px;padding:13px 28px;box-shadow:0 0 0 1px color-mix(in srgb,var(--ss-bronze) 60%,transparent),0 8px 22px rgba(0,0,0,.18)}
.ss-sim.ss-maison .ss-startbtn:focus-visible{outline-color:var(--ss-bronze)}
.ss-maison .ss-startauto{color:var(--ss-ink);font-weight:500}
.ss-maison .ss-startauto input,.ss-maison .ss-auto input{accent-color:var(--ss-night)}
/* Over Claude Code's terminal the card is night glass and the button bronze. */
.ss-maison .ss-term .ss-start{background:color-mix(in srgb,var(--ss-night) 88%,transparent)}
.ss-maison .ss-term .ss-starttitle,.ss-maison .ss-term .ss-startauto{color:var(--ss-marble)}
.ss-maison .ss-term .ss-startcard p{color:var(--ss-mist)}
.ss-maison .ss-term .ss-startcard small{color:color-mix(in srgb,var(--ss-mist) 80%,var(--ss-night))}
.ss-sim.ss-maison .ss-term .ss-startbtn,.ss-sim.ss-maison .ss-mac .ss-term .ss-startbtn{background:var(--ss-bronze);color:var(--ss-night)}
.ss-maison .ss-term .ss-startauto input{accent-color:var(--ss-bronze)}
`;

export const MAISON_CSS = MAISON_SCREEN_CSS + TERMINAL_RESTORE + MAISON_START_CSS;
