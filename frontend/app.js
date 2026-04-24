/**
 * BFHL Hierarchy Analyzer — Frontend Logic
 * Calls POST /bfhl and renders structured results.
 */

// ============================================================
// CONFIG — update this to your deployed backend URL
// ============================================================
const API_BASE_URL = 'http://localhost:3000';

// ============================================================
// Example payload from the spec
// ============================================================
const EXAMPLE_INPUT = [
  'A->B', 'A->C', 'B->D', 'C->E', 'E->F',
  'X->Y', 'Y->Z', 'Z->X',
  'P->Q', 'Q->R',
  'G->H', 'G->H', 'G->I',
  'hello', '1->2', 'A->'
].join(', ');

// ============================================================
// DOM refs
// ============================================================
const nodeInput   = document.getElementById('nodeInput');
const submitBtn   = document.getElementById('submitBtn');
const btnSpinner  = document.getElementById('btnSpinner');
const btnText     = submitBtn.querySelector('.btn-text');
const btnArrow    = submitBtn.querySelector('.btn-arrow');
const loadExample = document.getElementById('loadExample');
const clearBtn    = document.getElementById('clearBtn');
const errorMsg    = document.getElementById('errorMsg');
const errorText   = document.getElementById('errorText');
const resultsSection = document.getElementById('resultsSection');
const copyJsonBtn = document.getElementById('copyJson');

// ============================================================
// Helpers
// ============================================================

function showError(msg) {
  errorText.textContent = msg;
  errorMsg.style.display = 'flex';
}

function hideError() {
  errorMsg.style.display = 'none';
}

function setLoading(loading) {
  if (loading) {
    btnText.style.opacity = '0';
    btnArrow.style.display = 'none';
    btnSpinner.style.display = 'flex';
    submitBtn.disabled = true;
  } else {
    btnText.style.opacity = '1';
    btnArrow.style.display = '';
    btnSpinner.style.display = 'none';
    submitBtn.disabled = false;
  }
}

/**
 * Parse the input textarea — handles both comma-separated and newline-separated.
 * Trims each entry.
 */
function parseInput(raw) {
  return raw
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// ============================================================
// Tree Rendering
// ============================================================

/**
 * Recursively render a nested tree object into DOM elements.
 * treeObj: { "A": { "B": {}, "C": { "D": {} } } }
 */
function renderTreeNode(nodeKey, subtree, isRoot = false, isLast = true) {
  const children = Object.keys(subtree);
  const isLeaf = children.length === 0;

  const wrapper = document.createElement('div');
  wrapper.className = 'tree-node';

  const row = document.createElement('div');
  row.className = 'tree-row' + (isLeaf ? ' tree-leaf' : '');

  const label = document.createElement('span');
  label.className = 'tree-node-label';
  label.textContent = nodeKey;

  row.appendChild(label);

  if (!isLeaf) {
    const arrow = document.createElement('span');
    arrow.className = 'tree-connector';
    arrow.style.fontSize = '0.7rem';
    arrow.textContent = ' ›';
    row.appendChild(arrow);
  }

  wrapper.appendChild(row);

  if (!isLeaf) {
    const childContainer = document.createElement('div');
    childContainer.className = 'tree-children';
    children.forEach((child, idx) => {
      childContainer.appendChild(
        renderTreeNode(child, subtree[child], false, idx === children.length - 1)
      );
    });
    wrapper.appendChild(childContainer);
  }

  return wrapper;
}

function renderTree(treeObj, hasCycle) {
  const container = document.createElement('div');
  container.className = 'tree-view';

  if (hasCycle) {
    const placeholder = document.createElement('div');
    placeholder.className = 'cycle-placeholder';
    placeholder.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 11-6.219-8.56M21 3v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Cyclic — no tree structure
    `;
    container.appendChild(placeholder);
    return container;
  }

  if (!treeObj || Object.keys(treeObj).length === 0) {
    const empty = document.createElement('div');
    empty.className = 'cycle-placeholder';
    empty.textContent = 'Empty tree';
    container.appendChild(empty);
    return container;
  }

  const rootKey = Object.keys(treeObj)[0];
  container.appendChild(renderTreeNode(rootKey, treeObj[rootKey], true));
  return container;
}

// ============================================================
// Card Rendering
// ============================================================

function renderHierarchyCard(h, index) {
  const card = document.createElement('div');
  card.className = `hierarchy-card ${h.has_cycle ? 'cyclic' : 'tree-card'}`;
  card.style.animationDelay = `${index * 0.06}s`;

  // Header
  const header = document.createElement('div');
  header.className = 'hcard-header';

  const rootSection = document.createElement('div');
  rootSection.className = 'hcard-root';

  const rootBadge = document.createElement('div');
  rootBadge.className = 'root-badge';
  rootBadge.textContent = h.root;

  const rootInfo = document.createElement('div');
  rootInfo.innerHTML = `
    <div class="root-label">Root Node</div>
    <div class="root-node">${h.root}</div>
  `;

  rootSection.appendChild(rootBadge);
  rootSection.appendChild(rootInfo);

  const badges = document.createElement('div');
  badges.className = 'hcard-badges';

  if (h.has_cycle) {
    const cycleBadge = document.createElement('span');
    cycleBadge.className = 'badge badge-cycle';
    cycleBadge.textContent = '⟳ Cycle';
    badges.appendChild(cycleBadge);
  } else if (h.depth !== undefined) {
    const depthBadge = document.createElement('span');
    depthBadge.className = 'badge badge-depth';
    depthBadge.textContent = `depth: ${h.depth}`;
    badges.appendChild(depthBadge);
  }

  header.appendChild(rootSection);
  header.appendChild(badges);
  card.appendChild(header);

  // Tree
  card.appendChild(renderTree(h.tree, h.has_cycle));

  return card;
}

// ============================================================
// Render Full Response
// ============================================================

function renderResponse(data) {
  // Identity
  document.getElementById('userId').textContent = data.user_id;
  document.getElementById('emailId').textContent = data.email_id;
  document.getElementById('rollNumber').textContent = data.college_roll_number;

  // Summary
  document.getElementById('totalTrees').textContent = data.summary.total_trees;
  document.getElementById('totalCycles').textContent = data.summary.total_cycles;
  document.getElementById('largestRoot').textContent = data.summary.largest_tree_root || '—';

  // Hierarchies
  const grid = document.getElementById('hierarchiesGrid');
  grid.innerHTML = '';
  document.getElementById('hierarchyCount').textContent = data.hierarchies.length;
  data.hierarchies.forEach((h, i) => {
    grid.appendChild(renderHierarchyCard(h, i));
  });

  // Invalid entries
  const invalidList = document.getElementById('invalidList');
  invalidList.innerHTML = '';
  document.getElementById('invalidCount').textContent = data.invalid_entries.length;
  if (data.invalid_entries.length === 0) {
    invalidList.innerHTML = '<span class="empty-state">None found</span>';
  } else {
    data.invalid_entries.forEach(e => {
      const badge = document.createElement('span');
      badge.className = 'entry-badge invalid-badge';
      badge.textContent = e || '(empty)';
      invalidList.appendChild(badge);
    });
  }

  // Duplicate edges
  const dupList = document.getElementById('dupList');
  dupList.innerHTML = '';
  document.getElementById('dupCount').textContent = data.duplicate_edges.length;
  if (data.duplicate_edges.length === 0) {
    dupList.innerHTML = '<span class="empty-state">None found</span>';
  } else {
    data.duplicate_edges.forEach(e => {
      const badge = document.createElement('span');
      badge.className = 'entry-badge dup-badge';
      badge.textContent = e;
      dupList.appendChild(badge);
    });
  }

  // Raw JSON
  document.getElementById('rawJson').textContent = JSON.stringify(data, null, 2);

  // Show results
  resultsSection.style.display = 'flex';

  // Scroll to results
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ============================================================
// API Call
// ============================================================

async function callApi() {
  hideError();
  const raw = nodeInput.value.trim();
  if (!raw) {
    showError('Please enter at least one node edge (e.g. A->B).');
    return;
  }

  const data = parseInput(raw);
  if (data.length === 0) {
    showError('No valid input entries found.');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/bfhl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `API returned status ${response.status}`);
    }

    const result = await response.json();
    renderResponse(result);
  } catch (err) {
    resultsSection.style.display = 'none';
    showError(`API call failed: ${err.message}. Make sure the backend is running at ${API_BASE_URL}.`);
  } finally {
    setLoading(false);
  }
}

// ============================================================
// Event Listeners
// ============================================================

submitBtn.addEventListener('click', callApi);

nodeInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') callApi();
});

loadExample.addEventListener('click', () => {
  nodeInput.value = EXAMPLE_INPUT;
  nodeInput.focus();
  hideError();
});

clearBtn.addEventListener('click', () => {
  nodeInput.value = '';
  hideError();
  resultsSection.style.display = 'none';
  nodeInput.focus();
});

copyJsonBtn.addEventListener('click', () => {
  const text = document.getElementById('rawJson').textContent;
  navigator.clipboard.writeText(text).then(() => {
    copyJsonBtn.textContent = 'Copied!';
    setTimeout(() => { copyJsonBtn.textContent = 'Copy'; }, 2000);
  });
});
