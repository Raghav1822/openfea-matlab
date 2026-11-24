export const DEFAULT_MODEL = Object.freeze({
  length: 100,
  height: 20,
  thickness: 5,
  youngsModulus: 200000,
  poissonRatio: 0.3,
  load: 100,
  nx: 24,
  ny: 8
});

export function solveCantilever(model = DEFAULT_MODEL) {
  validateModel(model);
  const { length, height, thickness, youngsModulus, poissonRatio, load, nx, ny } = model;
  const nodes = [];
  for (let j = 0; j <= ny; j += 1) {
    for (let i = 0; i <= nx; i += 1) {
      nodes.push([length * i / nx, height * j / ny]);
    }
  }
  const nodeId = (i, j) => j * (nx + 1) + i;
  const elements = [];
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const lowerLeft = nodeId(i, j);
      const lowerRight = nodeId(i + 1, j);
      const upperLeft = nodeId(i, j + 1);
      const upperRight = nodeId(i + 1, j + 1);
      elements.push([lowerLeft, lowerRight, upperRight], [lowerLeft, upperRight, upperLeft]);
    }
  }

  const dofCount = nodes.length * 2;
  const stiffness = Array.from({ length: dofCount }, () => new Map());
  const force = new Float64Array(dofCount);
  const constitutive = planeStressMatrix(youngsModulus, poissonRatio);
  const elementData = elements.map((element) => {
    const coordinates = element.map((index) => nodes[index]);
    const { area, B } = triangleStrainMatrix(coordinates);
    const localStiffness = elementStiffness(B, constitutive, area, thickness);
    const dofs = element.flatMap((node) => [node * 2, node * 2 + 1]);
    for (let row = 0; row < 6; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        addSparse(stiffness[dofs[row]], dofs[column], localStiffness[row][column]);
      }
    }
    return { nodes: element, dofs, area, B };
  });

  const centerRow = Math.round(ny / 2);
  const loadNode = nodeId(nx, centerRow);
  force[loadNode * 2 + 1] = -load;
  const fixedDofs = [];
  for (let j = 0; j <= ny; j += 1) {
    const node = nodeId(0, j);
    fixedDofs.push(node * 2, node * 2 + 1);
  }
  const fixed = new Set(fixedDofs);
  const freeDofs = Array.from({ length: dofCount }, (_, dof) => dof).filter((dof) => !fixed.has(dof));
  const solution = solveConjugateGradient(stiffness, force, freeDofs);
  const displacement = new Float64Array(dofCount);
  freeDofs.forEach((dof, index) => { displacement[dof] = solution.values[index]; });

  const elementResults = elementData.map(({ nodes: elementNodes, dofs, area, B }) => {
    const localDisplacement = dofs.map((dof) => displacement[dof]);
    const strain = multiply(B, localDisplacement);
    const stress = multiply(constitutive, strain);
    const [sigmaX, sigmaY, tauXY] = stress;
    const vonMises = Math.sqrt(sigmaX ** 2 - sigmaX * sigmaY + sigmaY ** 2 + 3 * tauXY ** 2);
    return {
      nodes: elementNodes,
      area,
      strain,
      stress,
      vonMises,
      center: elementNodes.reduce((point, index) => [point[0] + nodes[index][0] / 3, point[1] + nodes[index][1] / 3], [0, 0])
    };
  });

  const reaction = new Float64Array(dofCount);
  for (let row = 0; row < dofCount; row += 1) {
    let internal = 0;
    for (const [column, value] of stiffness[row]) internal += value * displacement[column];
    reaction[row] = internal - force[row];
  }
  const nodalDisplacements = nodes.map((_, index) => [displacement[index * 2], displacement[index * 2 + 1]]);
  const maxDisplacement = nodalDisplacements.reduce((maximum, vector) => Math.max(maximum, Math.hypot(...vector)), 0);
  const tipNode = nodeId(nx, centerRow);
  const tipVerticalDisplacement = displacement[tipNode * 2 + 1];
  const maxVonMises = elementResults.reduce((maximum, element) => Math.max(maximum, element.vonMises), 0);
  const maxEquivalentStrain = elementResults.reduce((maximum, element) => {
    const [ex, ey, gamma] = element.strain;
    const equivalent = Math.sqrt((2 / 3) * (ex ** 2 + ey ** 2 - ex * ey + 3 * (gamma / 2) ** 2));
    return Math.max(maximum, equivalent);
  }, 0);
  const inertia = thickness * height ** 3 / 12;
  const analyticTipDeflection = load * length ** 3 / (3 * youngsModulus * inertia);
  const verticalReaction = fixedDofs.filter((dof) => dof % 2 === 1).reduce((sum, dof) => sum + reaction[dof], 0);

  return {
    nodes,
    elements: elementResults,
    displacement: nodalDisplacements,
    force,
    reaction,
    fixedDofs,
    loadNode,
    maxDisplacement,
    maxVonMises,
    maxEquivalentStrain,
    tipVerticalDisplacement,
    analyticTipDeflection,
    analyticalDeflectionErrorPercent: Math.abs(Math.abs(tipVerticalDisplacement) - analyticTipDeflection) / analyticTipDeflection * 100,
    verticalReaction,
    iterations: solution.iterations,
    residual: solution.residual,
    model: { ...model }
  };
}

function validateModel(model) {
  const positive = ["length", "height", "thickness", "youngsModulus", "load"];
  for (const key of positive) {
    if (!Number.isFinite(model[key]) || model[key] <= 0) throw new Error(`${key} must be a positive number.`);
  }
  if (!Number.isFinite(model.poissonRatio) || model.poissonRatio <= -0.99 || model.poissonRatio >= 0.49) {
    throw new Error("Poisson ratio must be between -0.99 and 0.49 for this plane-stress model.");
  }
  if (!Number.isInteger(model.nx) || model.nx < 2 || model.nx > 28 || !Number.isInteger(model.ny) || model.ny < 2 || model.ny > 12 || model.ny % 2 !== 0) {
    throw new Error("Mesh resolution must use 2–28 divisions along the length and an even 2–12 divisions across the height.");
  }
}

function planeStressMatrix(youngsModulus, poissonRatio) {
  const scale = youngsModulus / (1 - poissonRatio ** 2);
  return [
    [scale, scale * poissonRatio, 0],
    [scale * poissonRatio, scale, 0],
    [0, 0, scale * (1 - poissonRatio) / 2]
  ];
}

function triangleStrainMatrix(coordinates) {
  const [[x1, y1], [x2, y2], [x3, y3]] = coordinates;
  const twiceArea = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
  const area = Math.abs(twiceArea) / 2;
  if (area < Number.EPSILON) throw new Error("Degenerate triangle in mesh.");
  const b = [y2 - y3, y3 - y1, y1 - y2];
  const c = [x3 - x2, x1 - x3, x2 - x1];
  const factor = 1 / twiceArea;
  return {
    area,
    B: [
      [b[0] * factor, 0, b[1] * factor, 0, b[2] * factor, 0],
      [0, c[0] * factor, 0, c[1] * factor, 0, c[2] * factor],
      [c[0] * factor, b[0] * factor, c[1] * factor, b[1] * factor, c[2] * factor, b[2] * factor]
    ]
  };
}

function elementStiffness(B, D, area, thickness) {
  const DB = D.map((row) => B[0].map((_, column) => row.reduce((sum, value, index) => sum + value * B[index][column], 0)));
  const factor = area * thickness;
  return B[0].map((_, i) => B[0].map((__, j) =>
    factor * B.reduce((sum, row, index) => sum + row[i] * DB[index][j], 0)));
}

function solveConjugateGradient(stiffness, force, freeDofs) {
  const localIndex = new Map(freeDofs.map((dof, index) => [dof, index]));
  const matrix = freeDofs.map((globalRow) => {
    const entries = new Map();
    for (const [globalColumn, value] of stiffness[globalRow]) {
      const column = localIndex.get(globalColumn);
      if (column !== undefined && value !== 0) entries.set(column, value);
    }
    return entries;
  });
  const rhs = Float64Array.from(freeDofs, (dof) => force[dof]);
  const size = rhs.length;
  const x = new Float64Array(size);
  const diagonal = Float64Array.from(matrix, (row, index) => row.get(index) || 1);
  const residual = Float64Array.from(rhs);
  const z = Float64Array.from(residual, (value, index) => value / diagonal[index]);
  let direction = Float64Array.from(z);
  let rz = dot(residual, z);
  const normB = Math.sqrt(dot(rhs, rhs));
  const tolerance = Math.max(1e-12, normB * 1e-10);
  if (normB === 0) return { values: x, iterations: 0, residual: 0 };

  for (let iteration = 0; iteration < Math.min(8000, size * 8); iteration += 1) {
    const product = sparseMultiply(matrix, direction);
    const denominator = dot(direction, product);
    if (!(denominator > 0)) throw new Error("The stiffness system is not positive definite. Check supports and material values.");
    const alpha = rz / denominator;
    for (let index = 0; index < size; index += 1) {
      x[index] += alpha * direction[index];
      residual[index] -= alpha * product[index];
    }
    const residualNorm = Math.sqrt(dot(residual, residual));
    if (residualNorm <= tolerance) return { values: x, iterations: iteration + 1, residual: residualNorm / normB };
    for (let index = 0; index < size; index += 1) z[index] = residual[index] / diagonal[index];
    const nextRz = dot(residual, z);
    const beta = nextRz / rz;
    for (let index = 0; index < size; index += 1) direction[index] = z[index] + beta * direction[index];
    rz = nextRz;
  }
  throw new Error("The solver did not converge. Try a coarser mesh or review the model inputs.");
}

function addSparse(row, column, value) {
  row.set(column, (row.get(column) || 0) + value);
}

function sparseMultiply(matrix, vector) {
  const result = new Float64Array(vector.length);
  matrix.forEach((row, rowIndex) => {
    for (const [column, value] of row) result[rowIndex] += value * vector[column];
  });
  return result;
}

function multiply(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
}

function dot(first, second) {
  let sum = 0;
  for (let index = 0; index < first.length; index += 1) sum += first[index] * second[index];
  return sum;
}
