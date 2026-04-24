/**
 * Core processing logic for the BFHL API.
 * Handles: validation, deduplication, graph construction,
 * cycle detection, tree building, and summary generation.
 */

/**
 * Validates a single entry after trimming whitespace.
 * Valid format: single uppercase letter -> single uppercase letter, not self-loop.
 * @param {string} raw
 * @returns {{ valid: boolean, entry: string }}
 */
function validateEntry(raw) {
  const entry = raw.trim();
  // Must match exactly X->Y where X and Y are single uppercase letters
  const match = entry.match(/^([A-Z])->([A-Z])$/);
  if (!match) return { valid: false, entry };
  if (match[1] === match[2]) return { valid: false, entry }; // self-loop
  return { valid: true, entry, parent: match[1], child: match[2] };
}

/**
 * Main processing function.
 * @param {string[]} data - raw input array
 * @returns {object} processed result fields
 */
function processData(data) {
  const invalid_entries = [];
  const duplicate_edges = [];

  // Track seen edges for dedup (Set stores "A->B" strings)
  const seenEdges = new Set();
  // Track duplicate edge strings already added to duplicate_edges (push once each)
  const addedDuplicates = new Set();

  // Valid edges after dedup: array of { parent, child }
  const validEdges = [];

  for (const raw of data) {
    const result = validateEntry(raw);
    if (!result.valid) {
      invalid_entries.push(result.entry);
      continue;
    }

    const { entry, parent, child } = result;

    if (seenEdges.has(entry)) {
      // Duplicate — push once to duplicate_edges
      if (!addedDuplicates.has(entry)) {
        duplicate_edges.push(entry);
        addedDuplicates.add(entry);
      }
    } else {
      seenEdges.add(entry);
      validEdges.push({ parent, child });
    }
  }

  // Build adjacency: parent -> [children] and track childParent map
  // Diamond handling: first-encountered parent wins; track parentOf[child]
  const adjacency = {}; // parent -> [children]
  const parentOf = {};  // child -> parent (first assignment wins)
  const allNodes = new Set();

  for (const { parent, child } of validEdges) {
    // Diamond/multi-parent: if child already has a parent, discard this edge silently
    if (parentOf[child] !== undefined) {
      continue;
    }
    parentOf[child] = parent;
    allNodes.add(parent);
    allNodes.add(child);
    if (!adjacency[parent]) adjacency[parent] = [];
    adjacency[parent].push(child);
  }

  // Also add any nodes that only appear as parents (leaf-less parents)
  for (const node of Object.keys(adjacency)) {
    allNodes.add(node);
  }

  // Find connected components via Union-Find
  const parent_uf = {};
  function find(x) {
    if (parent_uf[x] === undefined) parent_uf[x] = x;
    if (parent_uf[x] !== x) parent_uf[x] = find(parent_uf[x]);
    return parent_uf[x];
  }
  function union(x, y) {
    const rx = find(x), ry = find(y);
    if (rx !== ry) parent_uf[rx] = ry;
  }

  for (const { parent, child } of validEdges) {
    // Only union if the edge was kept (i.e., child's parent is this parent)
    if (parentOf[child] === parent) {
      union(parent, child);
    }
  }

  // Group nodes into components
  const components = {}; // root -> Set of nodes
  for (const node of allNodes) {
    const r = find(node);
    if (!components[r]) components[r] = new Set();
    components[r].add(node);
  }

  const hierarchies = [];

  for (const compNodes of Object.values(components)) {
    const nodesArr = Array.from(compNodes);

    // Find component root(s): nodes that are NOT anyone's child
    const roots = nodesArr.filter(n => parentOf[n] === undefined);

    let rootNode;
    if (roots.length === 0) {
      // Pure cycle — use lexicographically smallest
      rootNode = nodesArr.sort()[0];
    } else if (roots.length === 1) {
      rootNode = roots[0];
    } else {
      // Multiple roots in a component — pick lex smallest
      // This happens when diamond resolution disconnects sub-trees
      // Each root forms its own independent tree
      // We actually need to split them — but with diamond resolution, only one root per component
      // In case of true multiple roots, treat each as separate tree
      for (const r of roots.sort()) {
        const subComponent = getReachable(r, adjacency);
        const hasCycle = detectCycle(r, adjacency, subComponent);
        if (hasCycle) {
          hierarchies.push({ root: r, tree: {}, has_cycle: true });
        } else {
          const tree = buildTree(r, adjacency);
          const depth = computeDepth(r, adjacency);
          hierarchies.push({ root: r, tree, depth });
        }
      }
      continue;
    }

    // Cycle detection (DFS) within this component
    const hasCycle = detectCycle(rootNode, adjacency, compNodes);

    if (hasCycle) {
      hierarchies.push({ root: rootNode, tree: {}, has_cycle: true });
    } else {
      const tree = buildTree(rootNode, adjacency);
      const depth = computeDepth(rootNode, adjacency);
      hierarchies.push({ root: rootNode, tree, depth });
    }
  }

  // Sort hierarchies for deterministic output (non-cyclic first by depth desc, then lex root)
  // Actually keep order based on roots alphabetically for clean output
  hierarchies.sort((a, b) => a.root.localeCompare(b.root));

  // Build summary
  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const cyclic = hierarchies.filter(h => h.has_cycle);

  let largest_tree_root = null;
  if (nonCyclic.length > 0) {
    let maxDepth = -1;
    for (const h of nonCyclic) {
      if (h.depth > maxDepth || (h.depth === maxDepth && h.root < largest_tree_root)) {
        maxDepth = h.depth;
        largest_tree_root = h.root;
      }
    }
  }

  const summary = {
    total_trees: nonCyclic.length,
    total_cycles: cyclic.length,
    largest_tree_root,
  };

  return { hierarchies, invalid_entries, duplicate_edges, summary };
}

/**
 * Get all nodes reachable from a start node via adjacency.
 */
function getReachable(start, adjacency) {
  const visited = new Set();
  const queue = [start];
  while (queue.length) {
    const node = queue.shift();
    if (visited.has(node)) continue;
    visited.add(node);
    for (const child of (adjacency[node] || [])) {
      queue.push(child);
    }
  }
  return visited;
}

/**
 * Detect cycle in the subgraph rooted at `root` using DFS.
 * @param {string} root
 * @param {object} adjacency
 * @param {Set} componentNodes - nodes in this component
 * @returns {boolean}
 */
function detectCycle(root, adjacency, componentNodes) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  for (const n of componentNodes) color[n] = WHITE;

  function dfs(node) {
    color[node] = GRAY;
    for (const child of (adjacency[node] || [])) {
      if (!componentNodes.has(child)) continue;
      if (color[child] === GRAY) return true; // back edge = cycle
      if (color[child] === WHITE && dfs(child)) return true;
    }
    color[node] = BLACK;
    return false;
  }

  // Also check nodes not reachable from root (cycles disconnected from root)
  for (const node of componentNodes) {
    if (color[node] === WHITE) {
      if (dfs(node)) return true;
    }
  }
  return false;
}

/**
 * Recursively build nested tree object.
 * Returns the full tree with root as the top key: { root: { child: { ... } } }
 * @param {string} node
 * @param {object} adjacency
 * @returns {object}
 */
function buildTree(node, adjacency) {
  return { [node]: buildChildren(node, adjacency) };
}

/**
 * Recursively build the children subtree (value part only).
 * @param {string} node
 * @param {object} adjacency
 * @returns {object}
 */
function buildChildren(node, adjacency) {
  const children = adjacency[node] || [];
  const subtree = {};
  for (const child of children) {
    subtree[child] = buildChildren(child, adjacency);
  }
  return subtree;
}

/**
 * Compute depth = number of nodes on longest root-to-leaf path.
 * @param {string} node
 * @param {object} adjacency
 * @returns {number}
 */
function computeDepth(node, adjacency) {
  const children = adjacency[node] || [];
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map(c => computeDepth(c, adjacency)));
}

module.exports = { processData };
