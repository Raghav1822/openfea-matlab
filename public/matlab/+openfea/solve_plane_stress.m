function result = solve_plane_stress(nodes, elements, E, nu, thickness, fixedDofs, force)
%SOLVE_PLANE_STRESS Small-strain isotropic plane-stress CST finite elements.
%   NODES is N-by-2, ELEMENTS is M-by-3 (1-based), and FORCE is 2N-by-1.
%   DOFs are ordered [ux1 uy1 ux2 uy2 ...]. FIXEDDOFS contains 1-based DOF
%   indices. Geometry is in mm, E in MPa (N/mm^2), thickness in mm, and
%   force in N. Result displacements are mm; stresses are MPa.

validateattributes(nodes, {'numeric'}, {'2d', 'ncols', 2, 'finite'});
validateattributes(elements, {'numeric'}, {'2d', 'ncols', 3, 'integer', 'positive'});
validateattributes(E, {'numeric'}, {'scalar', 'positive', 'finite'});
validateattributes(nu, {'numeric'}, {'scalar', '>', -0.99, '<', 0.49, 'finite'});
validateattributes(thickness, {'numeric'}, {'scalar', 'positive', 'finite'});

nNode = size(nodes, 1);
nElement = size(elements, 1);
ndof = 2 * nNode;
if any(elements(:) > nNode) || numel(force) ~= ndof
    error('openfea:InvalidModel', 'Element nodes or force vector do not match the mesh.');
end
fixedDofs = unique(fixedDofs(:));
if any(fixedDofs < 1) || any(fixedDofs > ndof)
    error('openfea:InvalidSupports', 'Fixed DOFs must be valid 1-based DOF indices.');
end
force = force(:);

scale = E / (1 - nu^2);
D = scale * [1, nu, 0; nu, 1, 0; 0, 0, (1 - nu) / 2];
I = zeros(36 * nElement, 1);
J = zeros(36 * nElement, 1);
V = zeros(36 * nElement, 1);
strains = zeros(nElement, 3);
stresses = zeros(nElement, 4);
areas = zeros(nElement, 1);
cursor = 1;

for e = 1:nElement
    nodeIds = elements(e, :);
    xy = nodes(nodeIds, :);
    [B, area] = cst_B_matrix(xy);
    areas(e) = area;
    dofs = reshape([2 * nodeIds - 1; 2 * nodeIds], [], 1);
    Ke = thickness * area * (B' * D * B);
    [row, column] = ndgrid(dofs, dofs);
    range = cursor:(cursor + 35);
    I(range) = row(:);
    J(range) = column(:);
    V(range) = Ke(:);
    cursor = cursor + 36;
end

K = sparse(I, J, V, ndof, ndof);
freeDofs = setdiff((1:ndof)', fixedDofs);
u = zeros(ndof, 1);
if ~isempty(freeDofs)
    u(freeDofs) = K(freeDofs, freeDofs) \ force(freeDofs);
end

vonMises = zeros(nElement, 1);
equivalentStrain = zeros(nElement, 1);
for e = 1:nElement
    nodeIds = elements(e, :);
    [B, ~] = cst_B_matrix(nodes(nodeIds, :));
    dofs = reshape([2 * nodeIds - 1; 2 * nodeIds], [], 1);
    strains(e, :) = (B * u(dofs))';
    stresses(e, 1:3) = (D * strains(e, :)')';
    sx = stresses(e, 1);
    sy = stresses(e, 2);
    txy = stresses(e, 3);
    vonMises(e) = sqrt(sx^2 - sx * sy + sy^2 + 3 * txy^2);
    ex = strains(e, 1);
    ey = strains(e, 2);
    gamma = strains(e, 3);
    equivalentStrain(e) = sqrt((2 / 3) * (ex^2 + ey^2 - ex * ey + 3 * (gamma / 2)^2));
end
stresses(:, 4) = vonMises;

result.displacement = reshape(u, 2, [])';
result.strain = strains;
result.stress = stresses;
result.vonMises = vonMises;
result.equivalentStrain = equivalentStrain;
result.area = areas;
result.reactions = K * u - force;
result.stiffness = K;
result.freeDofs = freeDofs;
end

function [B, area] = cst_B_matrix(xy)
x = xy(:, 1);
y = xy(:, 2);
twiceArea = (x(2) - x(1)) * (y(3) - y(1)) - (x(3) - x(1)) * (y(2) - y(1));
area = abs(twiceArea) / 2;
if area <= eps(max(abs(xy(:))) + 1)
    error('openfea:DegenerateElement', 'Mesh contains a zero-area triangle.');
end
b = [y(2) - y(3); y(3) - y(1); y(1) - y(2)];
c = [x(3) - x(2); x(1) - x(3); x(2) - x(1)];
factor = 1 / twiceArea;
B = factor * [b(1), 0, b(2), 0, b(3), 0; ...
              0, c(1), 0, c(2), 0, c(3); ...
              c(1), b(1), c(2), b(2), c(3), b(3)];
end
