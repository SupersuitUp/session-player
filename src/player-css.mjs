// Scoped styles for the player, in the getfreedom palette. Every class is ss- prefixed so the
// player can be dropped into any page (the wiki, a book reader) without colliding.
export const PLAYER_CSS = `
.ss-sim{--ss-ink:#1E1B19;--ss-cream:#F6E7C5;--ss-paper:#FBF5E7;--ss-tomato:#DB371F;--ss-petrol:#265E72;--ss-mustard:#E9A23B;--ss-sand:#EED79E;--ss-aqua:#69B1B5;
  container-type:inline-size;font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:var(--ss-ink);width:100%;max-width:1040px;margin:0 auto;-webkit-text-size-adjust:100%}
.ss-sim *{box-sizing:border-box}
.ss-sim button{font:inherit;color:inherit;cursor:pointer}
.ss-stage{display:grid;grid-template-columns:1fr;gap:16px}
.ss-phone{position:relative;display:flex;flex-direction:column;height:min(760px,calc(100svh - 120px));min-height:520px;background:var(--ss-paper);border:1px solid #e6d7b4;border-radius:28px;overflow:hidden;box-shadow:0 10px 40px rgba(30,27,25,.12)}
.ss-head{display:flex;align-items:center;gap:10px;padding:14px 14px 10px;border-bottom:1px solid #eadcbc;background:#fffaf0}
.ss-back{border:0;background:none;font-size:28px;line-height:1;padding:0 4px}
.ss-avatar{flex:none;width:34px;height:34px;border-radius:50%;background:var(--ss-petrol);color:var(--ss-cream);display:grid;place-items:center;font-weight:700}
.ss-titles{flex:1;min-width:0;display:flex;flex-direction:column}
.ss-titles b{font-family:Fraunces,Georgia,serif;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ss-titles small{color:#7a6d5a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ss-auto{display:flex;align-items:center;gap:4px;font-size:12px;color:#7a6d5a}
.ss-counter{display:flex;justify-content:space-between;gap:8px;padding:8px 14px;background:var(--ss-ink);color:var(--ss-cream);font-size:13px;font-variant-numeric:tabular-nums}
.ss-counter b{color:var(--ss-mustard)}
.ss-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}
.ss-intro{color:#7a6d5a;text-align:center;margin:auto 12px}
.ss-cmd-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:3px;margin-top:6px}
.ss-cmd{max-width:84%;background:var(--ss-petrol);color:#fff;padding:9px 13px;border-radius:18px 18px 4px 18px;white-space:pre-wrap;overflow-wrap:anywhere}
.ss-redirect{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ss-tomato)}
.ss-reply{max-width:92%;overflow-wrap:anywhere}
.ss-reply p{margin:2px 0 0;white-space:pre-wrap}
.ss-who{font-size:11px;font-weight:700;color:var(--ss-tomato);letter-spacing:.04em;text-transform:uppercase}
.ss-more{border:0;background:none;padding:0;color:var(--ss-petrol);font-size:13px;text-decoration:underline}
.ss-step{display:flex;align-items:baseline;gap:8px;font-size:13px;color:#4a4238;animation:ss-in .25s ease-out}
.ss-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--ss-tomato);transform:translateY(-1px)}
.ss-group .ss-dot{background:#c9b48c}
.ss-group .ss-label{color:#8a7d68}
.ss-label{flex:1;min-width:0;overflow-wrap:anywhere}
.ss-dur{flex:none;font-size:12px;color:#8a7d68;font-variant-numeric:tabular-nums}
.ss-board{background:#fff;border:1px solid #e3cf9f;border-radius:14px;padding:10px 12px;font-size:13px;box-shadow:0 2px 10px rgba(30,27,25,.06);animation:ss-in .25s ease-out}
.ss-board .ss-bq+.ss-bq{margin-top:10px;padding-top:10px;border-top:1px dashed #eadcbc}
.ss-bhead{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:var(--ss-sand);border-radius:999px;padding:1px 8px}
.ss-board .ss-q{margin:6px 0 8px;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}
.ss-opts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
.ss-opt{display:flex;gap:8px;align-items:flex-start;border:1px solid #eadcbc;border-radius:10px;padding:6px 8px;color:#6b6052}
.ss-opt b{display:block;font-weight:600;color:var(--ss-ink);overflow-wrap:anywhere}
.ss-opt small{display:block;color:#8a7d68;overflow-wrap:anywhere}
.ss-onum{flex:none;width:20px;height:20px;border-radius:50%;background:#f1e6cc;display:grid;place-items:center;font-size:11px;font-weight:700}
.ss-opt.ss-chosen{border-color:var(--ss-petrol);background:#e8f1f3}
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
.ss-sim .ss-mic{flex:none;width:48px;border:0;border-radius:50%;background:var(--ss-tomato);color:#fff;font-size:20px;touch-action:none;-webkit-user-select:none;user-select:none}
.ss-mic:disabled{opacity:.4}
.ss-mic.ss-live{animation:ss-pulse 1s infinite}
.ss-end{flex:1;display:flex;flex-direction:column;gap:8px}
.ss-end p{margin:0;font-size:14px}
.ss-sim .ss-tray-handle{position:absolute;z-index:2;right:12px;bottom:84px;border:0;border-radius:999px;background:var(--ss-ink);color:var(--ss-cream);padding:6px 12px;font-size:13px;display:flex;gap:6px;box-shadow:0 4px 14px rgba(0,0,0,.2)}
.ss-tray{position:absolute;left:0;right:0;bottom:0;max-height:60%;overflow-y:auto;background:#fffaf0;border-top:1px solid #eadcbc;border-radius:20px 20px 0 0;padding:16px 14px 90px;box-shadow:0 -8px 30px rgba(0,0,0,.15)}
.ss-panel{display:none}
.ss-artifact-list{display:flex;flex-direction:column;gap:8px}
.ss-artifact{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #eadcbc;border-radius:10px;padding:8px 10px;animation:ss-in .3s ease-out}
.ss-kind{flex:none;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 6px;border-radius:4px;background:var(--ss-sand)}
.ss-kind.ss-link{background:var(--ss-aqua);color:#fff}
.ss-kind.ss-other{background:var(--ss-tomato);color:#fff}
.ss-atitle{min-width:0;overflow-wrap:anywhere;font-size:14px}
.ss-empty{color:#8a7d68;font-size:14px;margin:0}
.ss-timeline{grid-column:1/-1;padding:4px 2px}
.ss-track{display:flex;align-items:center;gap:1px;height:12px}
.ss-seg{height:100%;border-radius:2px;min-width:2px}
.ss-seg.ss-human{background:var(--ss-petrol)}
.ss-seg.ss-ask{background:var(--ss-mustard)}
.ss-seg.ss-agent{background:#efc2b8}
.ss-seg.ss-agent.ss-past{background:var(--ss-tomato)}
.ss-seg.ss-now{outline:2px solid var(--ss-ink);outline-offset:1px}
.ss-legend{display:flex;gap:14px;font-size:12px;color:#7a6d5a;margin-top:6px;flex-wrap:wrap}
.ss-legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.ss-legend i.ss-human{background:var(--ss-petrol)}.ss-legend i.ss-ask{background:var(--ss-mustard)}.ss-legend i.ss-agent{background:var(--ss-tomato)}
.ss-picker{display:flex;flex-direction:column;gap:10px;padding:8px}
.ss-picker h2{font-family:Fraunces,Georgia,serif;margin:0 0 6px}
.ss-persona{display:flex;gap:12px;align-items:center;text-align:left;border:1px solid #eadcbc;background:var(--ss-paper);border-radius:14px;padding:12px}
@container (min-width:760px){
  .ss-stage.ss-has-panel{grid-template-columns:minmax(360px,420px) 1fr}
  .ss-has-panel .ss-tray-handle,.ss-has-panel .ss-tray{display:none}
  .ss-panel{display:flex;flex-direction:column;gap:10px;align-self:start;max-height:760px;overflow-y:auto;padding:16px;background:#fffaf0;border:1px solid #eadcbc;border-radius:20px}
  .ss-panel h3{display:flex;justify-content:space-between;margin:0;font-family:Fraunces,Georgia,serif}
  .ss-panel h3 span{font-family:inherit;color:var(--ss-tomato)}
}
@keyframes ss-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@keyframes ss-blink{0%,100%{opacity:.3}50%{opacity:1}}
@keyframes ss-pulse{0%,100%{box-shadow:0 0 0 0 rgba(219,55,31,.5)}50%{box-shadow:0 0 0 10px rgba(219,55,31,0)}}
@media (prefers-reduced-motion:reduce){.ss-sim *{animation:none!important}}
`;
