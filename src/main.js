import { DEFAULT_MODEL, solveCantilever } from "./fea.js";
import "./style.css";

const state = {
  model: { ...DEFAULT_MODEL },
  result: solveCantilever(DEFAULT_MODEL),
  view: "2d",
  field: "vonMises",
  scale: 350,
  page: "solve",
  ansysDisplacement: "",
  ansysStress: ""
};
const app = document.querySelector("#app");

function render() {
  const result = state.result;
  app.innerHTML = `
    <div class="workspace">
      <aside class="sidebar">
        <a class="brand" href="#" aria-label="OpenFEA home"><span class="brand-icon">OF</span><span>open<span>fea</span></span></a>
        <div class="nav-caption">WORKBENCH</div>
        <nav class="side-nav" aria-label="Main navigation">
          ${navButton("solve", "▦", "Model & solve")}
          ${navButton("validate", "◎", "Validation")}
          ${navButton("matlab", "⌘", "MATLAB source")}
        </nav>
        <div class="sidebar-bottom"><span class="scope-icon">△</span><b>Linear static · 2D</b><small>Plane stress · CST triangles</small><span class="scope-tag">OPEN SOURCE / 01</span></div>
      </aside>
      <main class="main">
        <header class="topbar"><div class="breadcrumb">STRUCTURAL MECHANICS <span>/</span> FINITE ELEMENTS</div><div class="top-actions"><span class="local-chip"><i></i> BROWSER DEMO</span><button class="export-btn" id="export-button">↧ <span>Export results</span></button><span class="avatar">FE</span></div></header>
        <section class="page">
          <div class="hero"><div><div class="eyebrow"><span></span> OPEN ENGINEERING NOTEBOOK · 2D PLANE STRESS</div><h1>Small model.<em>Clear answers.</em></h1><p>Explore linear-elastic structural response with a transparent MATLAB finite-element core.</p></div><div class="hero-stamp"><span>MODEL</span><b>01 — CANTILEVER</b><small>STATIC · ISOTROPIC · SMALL STRAIN</small></div></div>
          <div class="page-tabs" role="tablist">${tab("solve", "Model & solve")}${tab("validate", "ANSYS comparison")}${tab("matlab", "MATLAB source")}</div>
          ${renderPage(result)}
          <footer class="footer"><span>OPENFEA <b>·</b> LINEAR ELASTIC FINITE ELEMENT METHOD</span><span>EDUCATIONAL TOOL · VERIFY BEFORE DESIGN USE</span></footer>
        </section>
      </main>
    </div>`;
  drawMesh(result);
  bindEvents();
}

function renderPage(result) {
  if (state.page === "validate") return renderValidation(result);
  if (state.page === "matlab") return renderMatlab();
  return renderSolver(result);
}

function renderSolver(result) {
  return `<div class="model-toolbar"><div class="model-title"><span class="mini-mark">01</span><div><b>Cantilever plate</b><small>Fixed left edge · downward point load · centerline tip</small></div></div><div class="solver-status"><i></i> SOLVED <span>·</span> ${result.iterations} CG iterations</div><button class="run-button" id="run-solver">▶ Run solve</button></div>
    <div class="solver-layout">
      <aside class="parameters-card">
        <div class="param-heading"><div><span class="micro-label">MODEL INPUTS</span><h2>Set up the beam</h2></div><button class="reset-button" id="reset-model" title="Reset model">↺</button></div>
        <label class="field-label">MATERIAL</label><select class="full-select" id="material-select"><option value="steel">Structural steel · 200 GPa</option><option value="aluminum">Aluminum alloy · 70 GPa</option><option value="custom">Custom properties</option></select>
        <div class="field-grid"><label>Young's modulus <span>E</span><div class="input-wrap"><input id="youngs-modulus" type="number" value="${state.model.youngsModulus}" min="1" /><i>MPa</i></div></label><label>Poisson ratio <span>ν</span><div class="input-wrap"><input id="poisson-ratio" type="number" value="${state.model.poissonRatio}" min="-0.99" max="0.49" step="0.01" /><i>—</i></div></label></div>
        <div class="thin-rule"></div><label class="field-label">GEOMETRY</label>
        <div class="field-grid"><label>Length <span>L</span><div class="input-wrap"><input id="length" type="number" value="${state.model.length}" min="1" /><i>mm</i></div></label><label>Height <span>H</span><div class="input-wrap"><input id="height" type="number" value="${state.model.height}" min="1" /><i>mm</i></div></label><label>Thickness <span>t</span><div class="input-wrap"><input id="thickness" type="number" value="${state.model.thickness}" min="0.1" step="0.1" /><i>mm</i></div></label><label>Tip load <span>P</span><div class="input-wrap"><input id="load" type="number" value="${state.model.load}" min="0.1" /><i>N</i></div></label></div>
        <div class="thin-rule"></div><label class="field-label">MESH RESOLUTION</label><div class="field-grid mesh-fields"><label>Along length <span>nₓ</span><div class="input-wrap"><input id="nx" type="number" value="${state.model.nx}" min="2" max="28" /><i>div</i></div></label><label>Across height <span>nᵧ</span><div class="input-wrap"><input id="ny" type="number" value="${state.model.ny}" min="2" max="12" step="2" /><i>div</i></div></label></div>
        <div class="mesh-count">${result.nodes.length} nodes <span>·</span> ${result.elements.length} triangular elements <span>·</span> ${result.nodes.length * 2 - result.fixedDofs.length} active DOFs</div>
        <div class="model-note"><span>i</span><p>Default material is steel. A downward point load is applied at the free-end centerline; the full left edge is fixed.</p></div>
      </aside>
      <div class="results-column">
        <section class="results-grid">
          ${resultCard("TIP DEFLECTION", Math.abs(result.tipVerticalDisplacement).toFixed(4), "mm", "beam")}
          ${resultCard("PEAK VON MISES", result.maxVonMises.toFixed(2), "MPa", "stress")}
          ${resultCard("PEAK EQUIV. STRAIN", (result.maxEquivalentStrain * 1e6).toFixed(1), "µε", "strain")}
          ${resultCard("BEAM CHECK ERROR", result.analyticalDeflectionErrorPercent.toFixed(1), "%", "check")}
        </section>
        <section class="mesh-card"><div class="mesh-toolbar"><div><span class="micro-label">FINITE ELEMENT FIELD</span><h2>Displacement & stress map</h2></div><div class="view-controls"><div class="segmented"><button class="${state.view === "2d" ? "selected" : ""}" data-view="2d">2D mesh</button><button class="${state.view === "3d" ? "selected" : ""}" data-view="3d">3D view</button></div><select id="field-select"><option value="vonMises" ${state.field === "vonMises" ? "selected" : ""}>Von Mises stress</option><option value="displacement" ${state.field === "displacement" ? "selected" : ""}>Displacement magnitude</option><option value="strain" ${state.field === "strain" ? "selected" : ""}>Equivalent strain</option></select></div></div>
          <div class="canvas-wrap"><canvas id="mesh-canvas" aria-label="${state.view === "2d" ? "Two-dimensional finite element mesh" : "Extruded three-dimensional mesh preview"}"></canvas><div class="mesh-legend"><span>LOW</span><i></i><i></i><i></i><i></i><i></i><span>HIGH</span><b id="legend-max">${legendMaximum(result)}</b></div><div class="mesh-annotations"><span class="legend-fixed">▰ Fixed edge</span><span class="legend-load">↓ Applied load</span><span>${state.view === "3d" ? "Extruded plate · 3D preview only" : "Deformation scale " + state.scale + "×"}</span></div></div>
          <div class="mesh-footer"><label for="scale-slider">DEFORMED SHAPE SCALE <b id="scale-value">${state.scale}×</b></label><input id="scale-slider" type="range" min="1" max="1200" step="1" value="${state.scale}" /><button class="download-matlab" data-nav="matlab">Get MATLAB solver <span>↗</span></button></div>
        </section>
        <section class="insight-row"><div class="insight-icon">⌁</div><div><b>Analytical cantilever check</b><p>Tip displacement from Euler–Bernoulli beam theory: <strong>${result.analyticTipDeflection.toFixed(4)} mm</strong>. The current finite-element result differs by ${result.analyticalDeflectionErrorPercent.toFixed(1)}%; refine the mesh and compare with your ANSYS model.</p></div><button data-nav="validate">Compare results <span>↗</span></button></section>
      </div>
    </div>
    <p class="safety-note">Prototype scope: small-strain, linear-elastic plane stress with constant-thickness 3-node triangles. Not suitable as the sole basis for safety-critical design or certification.</p>`;
}

function renderValidation(result) {
  const displacementError = state.ansysDisplacement === "" ? null : relativeError(Math.abs(result.tipVerticalDisplacement), Number(state.ansysDisplacement));
  const stressError = state.ansysStress === "" ? null : relativeError(result.maxVonMises, Number(state.ansysStress));
  const hasValues = displacementError !== null && stressError !== null;
  const withinTolerance = hasValues && displacementError <= 5 && stressError <= 5;
  return `  <div class="detail-heading"><div><div class="eyebrow"><span></span> SOLVER CROSS-CHECK</div><h2>Compare like with like.</h2><p>Use an identical model in ANSYS Mechanical, then enter its displacement and stress outputs here.</p></div><span class="validation-label"><i></i> ${hasValues ? "REFERENCE VALUES ENTERED" : "NO ANSYS DATA PROVIDED"}</span></div>
    <div class="validation-grid"><section class="validation-card"><div class="card-header"><div><span class="micro-label">CURRENT OPENFEA SOLUTION</span><h3>Cantilever benchmark</h3></div><span class="validation-code">FEA / RUN 01</span></div><div class="comparison-table"><div class="table-head"><span>OUTPUT</span><span>OPENFEA</span><span>ANALYTICAL</span></div><div><b>Tip |uy|</b><span>${Math.abs(result.tipVerticalDisplacement).toFixed(5)} mm</span><span>${result.analyticTipDeflection.toFixed(5)} mm</span></div><div><b>Peak von Mises</b><span>${result.maxVonMises.toFixed(3)} MPa</span><span>—</span></div><div><b>Mesh</b><span>${result.elements.length} CST triangles</span><span>—</span></div><div><b>Solver residual</b><span>${result.residual.toExponential(2)}</span><span>—</span></div></div><div class="reference-callout"><span>i</span><p>The beam equation is a useful displacement sanity check, not a substitute for a mesh-converged continuum solution. Peak stresses near the clamp and point load are mesh-sensitive.</p></div></section>
    <section class="validation-card ansys-card"><div class="card-header"><div><span class="micro-label">OPTIONAL EXTERNAL REFERENCE</span><h3>Enter ANSYS results</h3></div><span class="ansys-wordmark">ANSYS<span>®</span></span></div><p>Keep material, geometry, plane-stress assumption, supports and load identical. Enter matching output values to calculate relative differences.</p><label>ANSYS tip displacement magnitude <div class="input-wrap"><input id="ansys-displacement" type="number" min="0" step="any" placeholder="e.g. 0.0498" value="${escapeHtml(state.ansysDisplacement)}" /><i>mm</i></div></label><label>ANSYS peak von Mises stress <div class="input-wrap"><input id="ansys-stress" type="number" min="0" step="any" placeholder="e.g. 15.2" value="${escapeHtml(state.ansysStress)}" /><i>MPa</i></div></label><button class="dark-button compare-button" id="compare-ansys">Compare values</button>${hasValues ? `<div class="comparison-result ${withinTolerance ? "match" : "review"}"><span>${withinTolerance ? "✓" : "!"}</span><div><b>${withinTolerance ? "Within 5% on entered outputs" : "Review mesh and setup"}</b><small>Displacement Δ ${displacementError.toFixed(2)}% · Stress Δ ${stressError.toFixed(2)}%</small></div></div>` : `<div class="comparison-placeholder">Enter both ANSYS outputs to calculate relative differences.</div>`}</section></div>
    <section class="ansys-steps"><div class="steps-heading"><span class="micro-label">REPRODUCIBLE COMPARISON</span><h3>Build the same benchmark in ANSYS</h3></div><div class="steps-grid"><div><i>01</i><b>Geometry & material</b><p>${result.model.length} × ${result.model.height} mm plate, ${result.model.thickness} mm thick; E = ${result.model.youngsModulus} MPa, ν = ${result.model.poissonRatio}.</p></div><div><i>02</i><b>Element & supports</b><p>Use a plane-stress triangular mesh. Fix UX and UY on the full left edge.</p></div><div><i>03</i><b>Load & mesh study</b><p>Apply ${result.model.load} N downward at the right-end centerline. Compare tip displacement, then refine mesh.</p></div></div></section>
    <p class="safety-note">No ANSYS run is bundled or implied. This comparison tool computes differences only from values you supply; it cannot verify that the two models use equivalent settings.</p>`;
}

function renderMatlab() {
  return `<div class="detail-heading"><div><div class="eyebrow"><span></span> MATLAB PACKAGE</div><h2>Readable code, not a black box.</h2><p>Download the small MATLAB implementation and run the bundled cantilever example.</p></div><a class="dark-button" href="./matlab/cantilever_demo.m" download>↓ Download example</a></div>
    <div class="matlab-layout"><section class="code-card"><div class="code-toolbar"><span><i></i><i></i><i></i> MATLAB · solve_plane_stress.m excerpt</span><a href="./matlab/+openfea/solve_plane_stress.m" download>Download full file ↓</a></div><pre><code><span class="code-comment">% After sparse element stiffness assembly:</span>
K = <span class="code-blue">sparse</span>(I, J, V, ndof, ndof);

freeDofs = <span class="code-purple">setdiff</span>((1:ndof)', fixedDofs(:));
u = <span class="code-purple">zeros</span>(ndof, 1);
u(freeDofs) = K(freeDofs, freeDofs) \\ force(freeDofs);

<span class="code-comment">% Recover constant element strain and stress from the CST B matrix.</span>
reactions = K * u - force;</code></pre></section>
    <aside class="file-card"><div class="file-card-icon">⌘</div><h3>Project files</h3><a href="./matlab/+openfea/solve_plane_stress.m" download><span>solve_plane_stress.m</span><b>↧</b></a><a href="./matlab/+openfea/mesh_rectangular.m" download><span>mesh_rectangular.m</span><b>↧</b></a><a href="./matlab/cantilever_demo.m" download><span>cantilever_demo.m</span><b>↧</b></a><a href="./matlab/tests/test_plane_stress.m" download><span>test_plane_stress.m</span><b>↧</b></a><a href="./matlab/ANSYS-validation-checklist.md" download><span>ANSYS-validation-checklist.md</span><b>↧</b></a><div class="run-command"><small>RUN IN MATLAB</small><code>addpath('public/matlab');<br/>cantilever_demo</code></div></aside></div>
    <section class="method-strip"><span>i</span><p>The web demo uses the same constant-strain triangle formulation in JavaScript for instant interaction. The MATLAB package is the portable engineering deliverable; this browser implementation is a teaching and visualization companion.</p><button class="download-matlab" data-nav="solve">Back to model <span>↗</span></button></section>
    <p class="safety-note">MATLAB source is provided for review and study. Run the included tests in MATLAB before adapting the solver to other structures or design decisions.</p>`;
}

function resultCard(label, value, unit, kind) {
  return `<article class="result-card"><div class="result-card-top"><span>${label}</span><i class="result-symbol ${kind}">${{ beam: "↧", stress: "◉", strain: "∿", check: "◎" }[kind]}</i></div><div class="result-value">${value}<small>${unit}</small></div></article>`;
}

function drawMesh(result) {
  const canvas = app.querySelector("#mesh-canvas");
  if (!canvas) return;
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(300, canvas.clientWidth);
  const height = 300;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);
  if (state.view === "3d") draw3D(context, result, width, height);
  else draw2D(context, result, width, height);
}

function draw2D(context, result, width, height) {
  const { model, nodes, elements, displacement } = result;
  const padX = 56;
  const padY = 37;
  const scale = Math.min((width - 2 * padX) / model.length, (height - 2 * padY) / model.height);
  const originX = (width - model.length * scale) / 2;
  const originY = (height + model.height * scale) / 2;
  const screen = nodes.map(([x, y], index) => {
    const [ux, uy] = displacement[index];
    return [originX + (x + ux * state.scale) * scale, originY - (y + uy * state.scale) * scale];
  });
  elements.forEach((element, index) => {
    context.beginPath();
    element.nodes.forEach((node, localIndex) => {
      const [x, y] = screen[node];
      if (localIndex === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = fieldColor(fieldValue(result, index));
    context.fill();
    context.strokeStyle = "#fffefa";
    context.lineWidth = 0.8;
    context.stroke();
  });
  drawBoundarySymbols(context, originX, originY, model, scale);
  context.font = "9px monospace";
  context.fillStyle = "#7b8981";
  context.fillText(`${model.length} mm`, originX + model.length * scale / 2 - 15, originY + 22);
}

function draw3D(context, result, width, height) {
  const { model, nodes, elements, displacement } = result;
  const angle = state.rotation || -0.65;
  const elevation = 0.62;
  const fit = Math.min((width - 130) / model.length, (height - 85) / (model.height + model.thickness * 1.8));
  const scale = fit * 0.9;
  const centerX = width / 2;
  const centerY = height / 2 + 11;
  const project = (nodeIndex, z) => {
    const [x, y] = nodes[nodeIndex];
    const [ux, uy] = displacement[nodeIndex];
    const dx = x + ux * state.scale;
    const dy = y + uy * state.scale;
    const centeredX = dx - model.length / 2;
    const centeredY = dy - model.height / 2;
    const rx = centeredX * Math.cos(angle) - z * Math.sin(angle);
    const ry = centeredX * Math.sin(angle) + centeredY * Math.cos(angle);
    const depth = centeredY * Math.sin(elevation) + z * Math.cos(elevation);
    return [centerX + rx * scale, centerY - (ry * Math.cos(elevation) - z * Math.sin(elevation)) * scale, depth];
  };
  const faceRecords = elements.map((element, index) => ({
    element,
    index,
    top: element.nodes.map((node) => project(node, model.thickness / 2)),
    bottom: element.nodes.map((node) => project(node, -model.thickness / 2))
  }));
  const boundaryEdges = new Map();
  elements.forEach((element) => {
    for (let edge = 0; edge < 3; edge += 1) {
      const first = element.nodes[edge];
      const second = element.nodes[(edge + 1) % 3];
      const key = first < second ? `${first}:${second}` : `${second}:${first}`;
      const record = boundaryEdges.get(key) || { first, second, count: 0 };
      record.count += 1;
      boundaryEdges.set(key, record);
    }
  });
  [...boundaryEdges.values()].filter((edge) => edge.count === 1).forEach(({ first, second }) => {
    const a = project(first, model.thickness / 2);
    const b = project(second, model.thickness / 2);
    const c = project(second, -model.thickness / 2);
    const d = project(first, -model.thickness / 2);
    context.beginPath();
    context.moveTo(a[0], a[1]); context.lineTo(b[0], b[1]); context.lineTo(c[0], c[1]); context.lineTo(d[0], d[1]);
    context.closePath();
    context.fillStyle = "#9caea6";
    context.fill();
    context.strokeStyle = "#fffefa";
    context.lineWidth = 0.7;
    context.stroke();
  });
  faceRecords.sort((a, b) => a.top.reduce((sum, point) => sum + point[2], 0) - b.top.reduce((sum, point) => sum + point[2], 0));
  faceRecords.forEach(({ element, index, top }) => {
    context.beginPath();
    top.forEach(([x, y], localIndex) => {
      if (localIndex === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = fieldColor(fieldValue(result, index));
    context.fill();
    context.strokeStyle = "#fffefa";
    context.lineWidth = 0.75;
    context.stroke();
  });
  context.fillStyle = "#74877d";
  context.font = "9px monospace";
  context.fillText(`${model.thickness} mm extrusion`, 16, height - 14);
}

function drawBoundarySymbols(context, x, y, model, scale) {
  const top = y - model.height * scale;
  context.fillStyle = "#50756a";
  context.fillRect(x - 9, top - 4, 6, model.height * scale + 8);
  for (let i = 0; i < 6; i += 1) {
    context.beginPath();
    context.moveTo(x - 3, top + i * model.height * scale / 5);
    context.lineTo(x + 2, top + i * model.height * scale / 5 + 4);
    context.lineTo(x - 3, top + i * model.height * scale / 5 + 7);
    context.fill();
  }
  context.strokeStyle = "#be715b";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x + model.length * scale - 12, y - model.height * scale / 2 - 28);
  context.lineTo(x + model.length * scale - 12, y - model.height * scale / 2 - 5);
  context.stroke();
  context.beginPath();
  context.moveTo(x + model.length * scale - 17, y - model.height * scale / 2 - 11);
  context.lineTo(x + model.length * scale - 12, y - model.height * scale / 2 - 5);
  context.lineTo(x + model.length * scale - 7, y - model.height * scale / 2 - 11);
  context.stroke();
}

function fieldValue(result, elementIndex) {
  const element = result.elements[elementIndex];
  if (state.field === "displacement") {
    return element.nodes.reduce((sum, node) => sum + Math.hypot(...result.displacement[node]), 0) / 3;
  }
  if (state.field === "strain") return Math.hypot(...element.strain);
  return element.vonMises;
}

function legendMaximum(result) {
  const values = result.elements.map((_, index) => fieldValue(result, index));
  const maximum = Math.max(0, ...values);
  if (state.field === "displacement") return `${maximum.toFixed(4)} mm`;
  if (state.field === "strain") return `${(maximum * 1e6).toFixed(0)} µε`;
  return `${maximum.toFixed(1)} MPa`;
}

function fieldColor(value) {
  const values = state.result.elements.map((_, index) => fieldValue(state.result, index));
  const max = Math.max(...values, 1e-12);
  const fraction = Math.min(1, Math.max(0, value / max));
  const stops = [[56, 103, 134], [59, 146, 155], [125, 173, 137], [226, 189, 96], [191, 95, 73]];
  const position = fraction * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(position));
  const blend = position - index;
  const rgb = stops[index].map((channel, i) => Math.round(channel + (stops[index + 1][i] - channel) * blend));
  return `rgb(${rgb.join(",")})`;
}

function bindEvents() {
  app.querySelectorAll("[data-nav]").forEach((button) => button.addEventListener("click", () => {
    state.page = button.dataset.nav;
    render();
  }));
  app.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    state.view = button.dataset.view;
    render();
  }));
  app.querySelector("#field-select")?.addEventListener("change", (event) => {
    state.field = event.target.value;
    drawMesh(state.result);
    app.querySelector("#legend-max").textContent = legendMaximum(state.result);
  });
  app.querySelector("#scale-slider")?.addEventListener("input", (event) => {
    state.scale = Number(event.target.value);
    app.querySelector("#scale-value").textContent = `${state.scale}×`;
    drawMesh(state.result);
  });
  app.querySelector("#mesh-canvas")?.addEventListener("pointerdown", (event) => {
    if (state.view !== "3d") return;
    state.dragX = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  });
  app.querySelector("#mesh-canvas")?.addEventListener("pointermove", (event) => {
    if (!state.view || state.dragX === undefined || !event.buttons) return;
    state.rotation = (state.rotation || -0.65) + (event.clientX - state.dragX) * 0.01;
    state.dragX = event.clientX;
    drawMesh(state.result);
  });
  app.querySelector("#mesh-canvas")?.addEventListener("pointerup", () => { state.dragX = undefined; });
  app.querySelector("#material-select")?.addEventListener("change", (event) => {
    if (event.target.value === "steel") {
      app.querySelector("#youngs-modulus").value = 200000;
      app.querySelector("#poisson-ratio").value = 0.3;
    } else if (event.target.value === "aluminum") {
      app.querySelector("#youngs-modulus").value = 70000;
      app.querySelector("#poisson-ratio").value = 0.33;
    }
  });
  app.querySelector("#run-solver")?.addEventListener("click", runSolver);
  app.querySelector("#reset-model")?.addEventListener("click", () => {
    state.model = { ...DEFAULT_MODEL };
    state.result = solveCantilever(state.model);
    state.field = "vonMises";
    state.view = "2d";
    render();
  });
  app.querySelector("#export-button")?.addEventListener("click", () => exportResults(state.result));
  app.querySelector("#compare-ansys")?.addEventListener("click", () => {
    state.ansysDisplacement = app.querySelector("#ansys-displacement").value;
    state.ansysStress = app.querySelector("#ansys-stress").value;
    render();
  });
}

function runSolver() {
  try {
    const number = (id) => Number(app.querySelector(`#${id}`).value);
    const model = {
      youngsModulus: number("youngs-modulus"),
      poissonRatio: number("poisson-ratio"),
      length: number("length"),
      height: number("height"),
      thickness: number("thickness"),
      load: number("load"),
      nx: number("nx"),
      ny: number("ny")
    };
    state.result = solveCantilever(model);
    state.model = model;
    render();
    showToast(`Solved ${state.result.elements.length} triangles in ${state.result.iterations} iterations.`);
  } catch (error) {
    showToast(error.message, true);
  }
}

function exportResults(result) {
  const report = {
    generatedAt: new Date().toISOString(),
    model: result.model,
    solver: "2D plane-stress, 3-node constant-strain triangles",
    nodalDisplacementsMm: result.displacement,
    elementFields: result.elements.map((element, index) => ({
      element: index + 1,
      nodeIds: element.nodes.map((node) => node + 1),
      strain: { ex: element.strain[0], ey: element.strain[1], gammaXY: element.strain[2] },
      stressMPa: { sx: element.stress[0], sy: element.stress[1], tauXY: element.stress[2], vonMises: element.vonMises }
    })),
    maxDisplacementMm: result.maxDisplacement,
    tipVerticalDisplacementMm: result.tipVerticalDisplacement,
    maxVonMisesMPa: result.maxVonMises,
    maxEquivalentStrain: result.maxEquivalentStrain,
    beamDeflectionReferenceMm: result.analyticTipDeflection,
    beamReferenceDifferencePercent: result.analyticalDeflectionErrorPercent,
    solverIterations: result.iterations,
    relativeResidual: result.residual,
    caveat: "Educational linear-elastic 2D plane-stress result. Not certified and not a substitute for qualified analysis."
  };
  const anchor = document.createElement("a");
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
  anchor.href = url;
  anchor.download = "openfea-cantilever-results.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function relativeError(value, reference) {
  if (!Number.isFinite(reference) || reference <= 0) return 100;
  return Math.abs(value - reference) / reference * 100;
}

function showToast(message, error = false) {
  app.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = `toast ${error ? "toast-error" : ""}`;
  toast.setAttribute("role", error ? "alert" : "status");
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 3500);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function navButton(id, icon, label) {
  return `<button class="side-item ${state.page === id ? "active" : ""}" data-nav="${id}"><span>${icon}</span>${label}</button>`;
}

function tab(id, label) {
  return `<button class="tab ${state.page === id ? "active" : ""}" role="tab" aria-selected="${state.page === id}" data-nav="${id}">${label}</button>`;
}

render();
