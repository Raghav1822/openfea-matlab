function tests = test_plane_stress
tests = functiontests(localfunctions);
end

function testCantileverDeflectionAndEquilibrium(testCase)
root = fileparts(fileparts(mfilename('fullpath')));
addpath(root);

L = 100; H = 20; t = 5; E = 200000; nu = 0.30; P = 100;
[nodes, elements] = openfea.mesh_rectangular(L, H, 24, 8);
leftNodes = find(abs(nodes(:, 1)) < eps(L));
fixedDofs = reshape([2 * leftNodes - 1, 2 * leftNodes].', [], 1);
loadNode = find(abs(nodes(:, 1) - L) < eps(L) & abs(nodes(:, 2) - H / 2) < eps(H), 1);
force = zeros(2 * size(nodes, 1), 1);
force(2 * loadNode) = -P;
result = openfea.solve_plane_stress(nodes, elements, E, nu, t, fixedDofs, force);

beamDeflection = P * L^3 / (3 * E * (t * H^3 / 12));
relativeDifference = abs(abs(result.displacement(loadNode, 2)) - beamDeflection) / beamDeflection;
verifyLessThan(testCase, relativeDifference, 0.06);
verifyEqual(testCase, sum(result.reactions(2:2:end)), P, 'AbsTol', 1e-6);
verifyEqual(testCase, result.displacement(leftNodes, :), zeros(numel(leftNodes), 2), 'AbsTol', 1e-12);
verifyGreaterThan(testCase, max(result.vonMises), 0);
end

function testMeshHasPositiveAreaElements(testCase)
[nodes, elements] = openfea.mesh_rectangular(50, 10, 4, 2);
for element = 1:size(elements, 1)
    xy = nodes(elements(element, :), :);
    signedArea = 0.5 * det([xy(2, :) - xy(1, :); xy(3, :) - xy(1, :)]);
    verifyGreaterThan(testCase, signedArea, 0);
end
end
