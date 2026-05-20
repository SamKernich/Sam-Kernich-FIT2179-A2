/**
 * cube.js
 * -------
 * Renders a CSS 3D cube with three Vega-Lite heatmaps on its faces.
 * Each face embeds a separate Vega-Lite JSON spec file.
 *
 * Dependencies (must be loaded in HTML before this script):
 *   - vega@5
 *   - vega-lite@5
 *   - vega-embed@6
 */

(function () {

  /* Config */

  const FACES = [
    { id: 'face-north',   specUrl: 'Vega_Specs/northern_sst.json', label: 'Northern GBR' },
    { id: 'face-central', specUrl: 'Vega_Specs/Central_SST.json',  label: 'Central GBR'  },
    { id: 'face-south',   specUrl: 'Vega_Specs/Southern_SST.json', label: 'Southern GBR' },
  ];

  const INIT_ROT_X = -22;
  const INIT_ROT_Y =  -35;

  const VIEWS = {
    reset:   [INIT_ROT_X, INIT_ROT_Y],
    north:   [0,   0],
    central: [0,  -90],
    south:   [-90,  0],
  };

  /* State of the cube*/

  let rotX = INIT_ROT_X;
  let rotY = INIT_ROT_Y;
  let scale = 1;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let cubeEl  = null;
  let sceneEl = null;

  /* Transforming the cube rotations and location*/

  function applyTransform(transition) {
    if (transition) {
      cubeEl.style.transition = 'transform 0.65s cubic-bezier(0.4,0,0.2,1)';
      setTimeout(() => { cubeEl.style.transition = 'transform 0.04s linear'; }, 700);
    }
    cubeEl.style.transform =
      `scale(${scale}) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }

  function snapTo(view) {
    [rotX, rotY] = VIEWS[view];
    scale = 1;
    applyTransform(true);
  }

  /* Embed a Vega Lite .json file into a specific face on the cube */

  function embedSpec(containerId, specUrl) {
    const el = document.getElementById(containerId);
    if (!el) {
      console.warn(`cube.js: container #${containerId} not found`);
      return;
    }

    fetch(specUrl)
      .then(r => r.json())
      .then(spec => {

        /* Measure the face at runtime so chart always fits */
        const faceEl   = el.closest('.cube-face') || el;
        const faceSize = faceEl.offsetWidth || 420;

        /* Tight padding so chart fills the face without clipping */
        const PAD = 8;

        spec.width      = faceSize - PAD * 2;
        spec.height     = faceSize - PAD * 2;
        spec.background = 'transparent';
        spec.autosize   = { type: 'fit', contains: 'padding' };

        /* Strip padding from the spec itself */
        spec.padding = PAD;

        /* Override config to remove internal margins and shrink text */
        if (!spec.config) spec.config = {};
        spec.config.background = 'transparent';
        spec.config.padding    = PAD;

        /* Shrink axis labels so they fit in the smaller face */
        if (!spec.config.axis) spec.config.axis = {};
        spec.config.axis.labelFontSize  = 8;
        spec.config.axis.titleFontSize  = 9;
        spec.config.axis.labelAngle     = spec.config.axis.labelAngle ?? -40;

        /* Hide legend — too wide for the face */
        if (!spec.config.legend) spec.config.legend = {};
        spec.config.legend.disable = true;

        /* Also kill legend in encoding if defined inline */
        function stripLegends(obj) {
          if (!obj || typeof obj !== 'object') return;
          if (obj.legend !== undefined) obj.legend = null;
          Object.values(obj).forEach(stripLegends);
        }
        stripLegends(spec.encoding);

        /* Hide title — already labelled on the face */
        spec.title = null;

        return vegaEmbed(el, spec, {
          renderer: 'svg',
          actions:  false,
          theme:    'dark',
          config:   { background: 'transparent' },
        });
      })
      .catch(err => {
        console.error(`cube.js: failed to load ${specUrl}`, err);
        el.innerHTML =
          `<p style="color:#e57373;padding:16px;font-size:12px;">
             Failed to load: ${specUrl}
           </p>`;
      });
  }

  /*Interactive mouse/drag with the cube*/

  function onMouseDown(e) {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    rotY += (e.clientX - lastX) * 0.45;
    rotX -= (e.clientY - lastY) * 0.45;
    lastX = e.clientX;
    lastY = e.clientY;
    applyTransform(false);
  }

  function onMouseUp() { isDragging = false; }

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    isDragging = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    if (!isDragging || e.touches.length !== 1) return;
    rotY += (e.touches[0].clientX - lastX) * 0.45;
    rotX -= (e.touches[0].clientY - lastY) * 0.45;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
    applyTransform(false);
  }

  function onWheel(e) {
    scale = Math.min(1.7, Math.max(0.5, scale - e.deltaY * 0.001));
    applyTransform(false);
    e.preventDefault();
  }

  /* Build DOM */
 
  function buildDOM(mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) {
      console.error(`cube.js: mount point #${mountId} not found`);
      return;
    }

    mount.innerHTML = `
      <div class="cube-wrapper">

        <div class="cube-legend-row">
          <span class="cube-legend-item">
            <span class="cube-swatch" style="background:#2166ac"></span>Cool anomaly
          </span>
          <span class="cube-legend-item">
            <span class="cube-swatch" style="background:#f7f7f7;border:0.5px solid #888"></span>Near normal
          </span>
          <span class="cube-legend-item">
            <span class="cube-swatch" style="background:#d6604d"></span>Warm anomaly
          </span>
          <span class="cube-legend-item">
            <span class="cube-swatch" style="background:#67000d"></span>Extreme heat
          </span>
        </div>

        <div class="cube-scene" id="cube-scene">
          <div class="cube-3d" id="cube-3d">
            <div class="cube-face cube-face--front">
              <div class="cube-face-inner" id="face-north"></div>
              <span class="cube-face-label">Northern GBR</span>
            </div>
            <div class="cube-face cube-face--right">
              <div class="cube-face-inner" id="face-central"></div>
              <span class="cube-face-label">Central GBR</span>
            </div>
            <div class="cube-face cube-face--top">
              <div class="cube-face-inner" id="face-south"></div>
              <span class="cube-face-label">Southern GBR</span>
            </div>
            <div class="cube-face cube-face--back"></div>
            <div class="cube-face cube-face--left"></div>
            <div class="cube-face cube-face--bottom"></div>
          </div>
        </div>

        <div class="cube-controls">
          <button class="cube-btn" onclick="GBRCube.snap('reset')">Reset</button>
          <button class="cube-btn" onclick="GBRCube.snap('north')">Northern</button>
          <button class="cube-btn" onclick="GBRCube.snap('central')">Central</button>
          <button class="cube-btn" onclick="GBRCube.snap('south')">Southern</button>
        </div>

        <p class="cube-hint">Drag to rotate · scroll to zoom</p>

      </div>
    `;
  }

  /* Initialize the cube */
  
  function init(mountId) {
    buildDOM(mountId);

    cubeEl  = document.getElementById('cube-3d');
    sceneEl = document.getElementById('cube-scene');

    if (!cubeEl || !sceneEl) return;

    sceneEl.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mousemove',   onMouseMove);
    window.addEventListener('mouseup',     onMouseUp);
    sceneEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',   onTouchMove,  { passive: true });
    sceneEl.addEventListener('wheel',      onWheel,      { passive: false });

    applyTransform(false);

    /*
      Delay embed slightly so the DOM has painted and offsetWidth
      returns the actual rendered face size, not 0
    */
    setTimeout(() => {
      FACES.forEach(face => embedSpec(face.id, face.specUrl));
    }, 100);
  }

  /* Public API called in the main html file to access the cube */

  window.GBRCube = { init, snap: snapTo };

})();