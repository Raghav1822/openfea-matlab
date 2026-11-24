import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MODEL, solveCantilever } from "./fea.js";

test("cantilever solver returns finite fields and zero clamped displacement", () => {
  const result = solveCantilever();
  const leftNodes = result.nodes.map((node, index) => node[0] === 0 ? index : -1).filter((index) => index >= 0);

  assert.equal(result.nodes.length, (DEFAULT_MODEL.nx + 1) * (DEFAULT_MODEL.ny + 1));
  assert.equal(result.elements.length, DEFAULT_MODEL.nx * DEFAULT_MODEL.ny * 2);
  assert.ok(result.iterations > 0);
  assert.ok(result.residual < 1e-8);
  assert.ok(result.maxDisplacement > 0);
  assert.ok(result.maxVonMises > 0);
  assert.ok(result.maxEquivalentStrain > 0);
  for (const node of leftNodes) assert.deepEqual(result.displacement[node], [0, 0]);
});

test("vertical support reaction balances the applied tip load", () => {
  const result = solveCantilever();
  assert.ok(Math.abs(result.verticalReaction - result.model.load) < 1e-6);
});

test("centerline tip deflection agrees with the elementary beam reference", () => {
  const result = solveCantilever();
  assert.ok(result.analyticalDeflectionErrorPercent < 6);
});

test("invalid material values are rejected before assembly", () => {
  assert.throws(() => solveCantilever({ ...DEFAULT_MODEL, poissonRatio: 0.5 }), /Poisson ratio/);
  assert.throws(() => solveCantilever({ ...DEFAULT_MODEL, nx: 40 }), /Mesh resolution/);
  assert.throws(() => solveCantilever({ ...DEFAULT_MODEL, ny: 3 }), /even/);
});
