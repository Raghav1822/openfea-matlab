%CANTILEVER_DEMO Run a simple plane-stress cantilever benchmark.
% Units: mm, N, MPa. Requires the +openfea package on the MATLAB path.

root = fileparts(mfilename('fullpath'));
addpath(root);

L = 100;
H = 20;
t = 5;
E = 200000;
nu = 0.30;
P = 100;
nx = 24;
ny = 8;

[nodes, elements] = openfea.mesh_rectangular(L, H, nx, ny);
leftNodes = find(abs(nodes(:, 1)) < eps(L));
fixedDofs = reshape([2 * leftNodes - 1, 2 * leftNodes].', [], 1);
loadNode = find(abs(nodes(:, 1) - L) < eps(L) & abs(nodes(:, 2) - H / 2) < eps(H), 1);
if isempty(loadNode)
    error('The height mesh must include a centerline node; choose an even ny.');
end
force = zeros(2 * size(nodes, 1), 1);
force(2 * loadNode) = -P;

result = openfea.solve_plane_stress(nodes, elements, E, nu, t, fixedDofs, force);
deformedNodes = nodes + result.displacement * 200;
I = t * H^3 / 12;
beamDeflection = P * L^3 / (3 * E * I);
actualTipDeflection = abs(result.displacement(loadNode, 2));
relativeDifference = abs(actualTipDeflection - beamDeflection) / beamDeflection * 100;

fprintf('Tip displacement:  %.6f mm\n', actualTipDeflection);
fprintf('Beam reference:    %.6f mm\n', beamDeflection);
fprintf('Difference:        %.2f %%\n', relativeDifference);
fprintf('Peak von Mises:    %.3f MPa\n', max(result.vonMises));

figure('Name', 'OpenFEA cantilever — von Mises stress');
nodeStress = zeros(size(nodes, 1), 1);
nodeCount = zeros(size(nodes, 1), 1);
for e = 1:size(elements, 1)
    nodeStress(elements(e, :)) = nodeStress(elements(e, :)) + result.vonMises(e);
    nodeCount(elements(e, :)) = nodeCount(elements(e, :)) + 1;
end
nodeStress = nodeStress ./ max(nodeCount, 1);
patch('Faces', elements, 'Vertices', deformedNodes, ...
    'FaceVertexCData', nodeStress, 'FaceColor', 'interp', ...
    'EdgeColor', [0.94 0.94 0.91], 'LineWidth', 0.75);
axis equal tight;
colorbar;
xlabel('x (mm)');
ylabel('y (mm)');
title('Von Mises stress · deformed shape ×200');
colormap(turbo);
