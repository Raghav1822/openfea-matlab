function [nodes, elements] = mesh_rectangular(lengthX, heightY, nx, ny)
%MESH_RECTANGULAR Create a structured, two-triangle-per-cell 2D mesh.
%   Nodes are returned as [x y] coordinates in millimetres. Elements are
%   1-based node triplets with consistent counter-clockwise orientation.

validateattributes(lengthX, {'numeric'}, {'scalar', 'positive', 'finite'});
validateattributes(heightY, {'numeric'}, {'scalar', 'positive', 'finite'});
validateattributes(nx, {'numeric'}, {'scalar', 'integer', '>=', 1});
validateattributes(ny, {'numeric'}, {'scalar', 'integer', '>=', 1});

nodes = zeros((nx + 1) * (ny + 1), 2);
for j = 0:ny
    for i = 0:nx
        node = j * (nx + 1) + i + 1;
        nodes(node, :) = [lengthX * i / nx, heightY * j / ny];
    end
end

elements = zeros(2 * nx * ny, 3);
element = 1;
nodeId = @(i, j) j * (nx + 1) + i + 1;
for j = 0:ny - 1
    for i = 0:nx - 1
        lowerLeft = nodeId(i, j);
        lowerRight = nodeId(i + 1, j);
        upperLeft = nodeId(i, j + 1);
        upperRight = nodeId(i + 1, j + 1);
        elements(element, :) = [lowerLeft, lowerRight, upperRight];
        elements(element + 1, :) = [lowerLeft, upperRight, upperLeft];
        element = element + 2;
    end
end
end
