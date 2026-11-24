# ANSYS Mechanical comparison checklist

This worksheet defines a reproducible comparison; no ANSYS run or certified benchmark values are bundled.

## Match the browser / MATLAB model

- Geometry: rectangular 2D plate, `L × H`, thickness `t`.
- Material: isotropic, linear elastic, Young's modulus `E`, Poisson ratio `ν`.
- Analysis: static structural, plane stress, small strain, constant thickness.
- Left edge: constrain both in-plane translations on every node.
- Load: apply the same downward point force at the centerline node on the free end. Avoid an edge traction unless you update both models to the same load definition.
- Mesh: use a triangular linear element compatible with a 3-node constant-strain triangle; compare at similar element sizes and refine each mesh.

## Compare

1. Compare the vertical displacement at the free-end centerline node.
2. Compare reaction-force balance and total applied load.
3. Compare von Mises stress away from the clamped boundary and point-load singularities. Do not compare the single maximum at a singular corner as if it were mesh-independent.
4. Repeat with successively finer meshes. Record element count and output change for each solver.
5. Enter corresponding ANSYS displacement and stress values in the browser app to calculate relative differences.

The app's 5% indicator is a convenience threshold, not an acceptance criterion. Differences can come from element formulation, mesh, plane-stress assumptions, load distribution, stress averaging, solver tolerances, or singular regions. Record the ANSYS version, element type, mesh metrics, and exact boundary/load setup with any comparison.
