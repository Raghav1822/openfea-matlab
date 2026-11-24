# OpenFEA

**A small, open MATLAB finite-element solver for introductory structural analysis.**

OpenFEA solves one well-defined problem: linear-elastic, small-strain 2D plane stress using 3-node constant-strain triangles (CST). The web workbench is an interactive teaching/visualization companion; the MATLAB package is the portable engineering deliverable.

## Live workbench

After GitHub Pages is enabled and the first deployment succeeds:

**https://raghav1822.github.io/openfea-matlab/**

The site includes a built-in steel cantilever example, editable material/geometry/load/mesh inputs, 2D stress/displacement/strain maps, an extruded 3D plate preview, MATLAB source downloads, and an optional ANSYS value-comparison panel.

## Capabilities

- **MATLAB CST solver:** assemble a sparse global stiffness matrix; solve prescribed static loads and fixed DOFs; recover nodal displacement, element strain, stress, von Mises stress, and reactions.
- **Interactive browser companion:** same plane-stress CST formulation with a cantilever sample; change E, ν, dimensions, thickness, force, and mesh resolution.
- **2D and 3D mesh views:** color the deformed 2D mesh or inspect an extruded 3D plate preview. The 3D view is visualization only; this project does not solve 3D continuum elements.
- **Validation support:** compare tip displacement with the Euler–Bernoulli beam reference; enter ANSYS outputs to compute differences; follow the included reproducible comparison checklist.
- **Data export:** download element stress/strain and nodal displacement as JSON.

## Run the MATLAB example

Requirements: MATLAB with base MATLAB sparse linear algebra and plotting.

```matlab
addpath('public/matlab')
cantilever_demo
```

Run the MATLAB unit tests:

```matlab
results = runtests('public/matlab/tests');
table(results)
```

The web companion can be run separately:

```bash
npm ci
npm test
npm run dev
```

## Units and conventions

Coordinates and dimensions are millimetres, Young's modulus is MPa (`N/mm²`), thickness is mm, loads are N, displacement is mm, and stress is MPa. MATLAB node and DOF indices are 1-based; the browser display reports mesh counts and fields in the same physical units. The cantilever height mesh uses an even number of divisions so a node lies at the free-end centerline load location.

## ANSYS comparison

No ANSYS installation or reference run is bundled. Use the checklist in `public/matlab/ANSYS-validation-checklist.md` to reproduce the geometry, material, plane-stress assumption, supports, and centerline tip load in ANSYS Mechanical. Enter matched displacement and stress values in the browser panel; the app calculates relative differences but cannot verify that the external model setup is equivalent.

## Scope and limitations

This is an educational/basic solver, not a general-purpose FEA package. It does not support 3D continuum elements, dynamics, buckling, contact, plasticity, thermal coupling, holes/cut-outs, large deformation, or automatic meshing. Point loads and idealized fixed edges create mesh-sensitive local stresses. The simple beam formula is a sanity check, not a validation certificate. Do not use the project as the sole basis for safety-critical design, certification, or asset disposition.

## License

MIT. See [LICENSE](LICENSE).
