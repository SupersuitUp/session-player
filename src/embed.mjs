// <supersuit-simulator>: the simulator as a tag, for a page or a book that wants it inline
// rather than in an iframe. The page supplies React through an import map (or a bundler).
//
//   <supersuit-simulator src="/simulator/scenarios" scenario="low-tide-tapes"
//                        artifacts="off" timeline="off" autoplay="off" height="620px" device="auto"
//                        speed="3" highlights moments steps="1"></supersuit-simulator>
//   <script type="module">import { defineSimulatorElement } from '@supersuit/session-player/embed'; defineSimulatorElement();</script>
//
// `src` returns a JSON array of scenarios (or one scenario). Image paths in it resolve against
// the page, so serve the scenario's assets/ folder beside it. Any page that cannot run modules
// can use the iframe instead: <iframe src="<served>/embed?scenario=<id>&timeline=off">.

export function propsFromAttributes(a) {
  return {
    src: a.src,
    scenarioId: a.scenario || undefined,
    artifacts: a.artifacts !== 'off',
    timeline: a.timeline !== 'off',
    autoplay: a.autoplay !== 'off',
    height: a.height || undefined,
    device: a.device || undefined,
    start: a.start || undefined,
    // The highlights cut (Wilson, 0.3.0): speed="3" highlights moments steps="1".
    speed: Number(a.speed) || undefined,
    highlights: a.highlights != null && a.highlights !== 'off',
    moments: a.moments != null && a.moments !== 'off',
    maxSteps: Number(a.steps) || undefined,
  };
}

export function defineSimulatorElement(name = 'supersuit-simulator') {
  if (typeof customElements === 'undefined' || customElements.get(name)) return;
  customElements.define(name, class extends HTMLElement {
    async connectedCallback() {
      const attrs = Object.fromEntries([...this.attributes].map((x) => [x.name, x.value]));
      const { src, ...props } = propsFromAttributes(attrs);
      const [{ createElement }, { createRoot }, { SimulatorPlayer }] = await Promise.all([import('react'), import('react-dom/client'), import('./player.mjs')]);
      const data = await (await fetch(src, { credentials: 'same-origin' })).json();
      const scenarios = Array.isArray(data) ? data : [data];
      this.root = createRoot(this);
      this.root.render(createElement(SimulatorPlayer, { scenarios, ...props }));
    }
    disconnectedCallback() { this.root?.unmount(); }
  });
}
