// tree.js

// --- Data transformation: couple-centric tree ---
function toCoupleTree(person) {
  const couple = {
    main: person,
    spouse: person.spouse || null,
    children: []
  };
  if (person.children && person.children.length > 0) {
    couple.children = person.children.map(child => toCoupleTree(child));
  }
  return couple;
}

// --- Variable-width tree layout constants ---
const SINGLE_WIDTH = 340; // match CSS max-width
const COUPLE_WIDTH = 700; // match CSS max-width for duo
const NODE_HEIGHT = 140;
const LEVEL_VSPACE = 120;
const SIBLING_HSPACE = 40;

// --- Layout computation ---
function computeLayout(node, depth = 0) {
  node.width = node.spouse ? COUPLE_WIDTH : SINGLE_WIDTH;
  node.depth = depth;
  if (!node.children || node.children.length === 0) {
    node.x = 0;
    return node.width;
  }
  let totalWidth = 0;
  node.children.forEach((child, i) => {
    const childWidth = computeLayout(child, depth + 1);
    child._subtreeWidth = childWidth;
    totalWidth += childWidth;
    if (i > 0) totalWidth += SIBLING_HSPACE;
  });
  let x = -totalWidth / 2;
  node.children.forEach(child => {
    child.x = x + child._subtreeWidth / 2;
    x += child._subtreeWidth + SIBLING_HSPACE;
  });
  node.x = 0;
  return Math.max(node.width, totalWidth);
}

// --- Collect nodes and links for rendering ---
function collectNodes(node, parentAbsX = 0, nodes = [], links = []) {
  const absX = parentAbsX + node.x;
  nodes.push({ ...node, absX, absY: node.depth * (NODE_HEIGHT + LEVEL_VSPACE) });
  if (node.children) {
    node.children.forEach(child => {
      links.push({
        source: { x: absX, y: node.depth * (NODE_HEIGHT + LEVEL_VSPACE) + NODE_HEIGHT },
        target: { x: absX + child.x, y: (node.depth + 1) * (NODE_HEIGHT + LEVEL_VSPACE) }
      });
      collectNodes(child, absX, nodes, links);
    });
  }
  return { nodes, links };
}

// --- Helper: Render name with crown if isKing ---
function nameWithCrown(person) {
  return person.isKing
    ? `${person.name} <span class="crown" title="Roi/Reine">👑</span>`
    : person.name;
}

// --- Main D3 rendering ---
document.addEventListener("DOMContentLoaded", function() {
  const svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height");
  const g = svg.append("g").attr("transform", "translate(40,40)");

  // Add zoom behavior
  svg.call(
    d3.zoom()
      .scaleExtent([0.2, 2])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      })
  );

  d3.json("data.json").then(data => {
    const coupleRoot = toCoupleTree(data);
    computeLayout(coupleRoot);
    const { nodes, links } = collectNodes(coupleRoot);

    // Center the tree in the SVG
    const minX = d3.min(nodes, d => d.absX - d.width / 2);
    const maxX = d3.max(nodes, d => d.absX + d.width / 2);
    const treeWidth = maxX - minX;
    const offsetX = width / 2 - (minX + treeWidth / 2);

    // Draw links
    g.selectAll(".link")
      .data(links)
      .join("path")
      .attr("class", "link")
      .attr("d", d => `M${d.source.x + offsetX},${d.source.y} V${d.target.y - 20} H${d.target.x + offsetX} V${d.target.y}`);

    // Draw nodes
    const node = g.selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.absX + offsetX},${d.absY})`);

    node.append("foreignObject")
      .attr("x", d => d.spouse ? -COUPLE_WIDTH/2 : -SINGLE_WIDTH/2)
      .attr("y", 5)
      .attr("width", d => d.spouse ? COUPLE_WIDTH : SINGLE_WIDTH)
      .attr("height", NODE_HEIGHT)
      .append("xhtml:div")
      .attr("class", d => d.spouse ? "node-card node-card-duo" : "node-card")
      .html(d => {
        if (d.spouse) {
          return `
            <div class="node-card-duo">
              <div class="node-person">
                <img src="${d.main.image || 'images/blason_placeholder.svg'}" alt="blason">
                <h3>${nameWithCrown(d.main)}</h3>
                <p>${d.main.title || ''}</p>
                <p>${d.main.birth || '?'} – ${d.main.death || '?'}</p>
              </div>
              <div class="spouse-divider"></div>
              <div class="node-person">
                <img src="${d.spouse.image || 'images/blason_placeholder.svg'}" alt="blason">
                <h3>${nameWithCrown(d.spouse)}</h3>
                <p>${d.spouse.title || ''}</p>
                <p>${d.spouse.birth || '?'} – ${d.spouse.death || '?'}</p>
              </div>
            </div>
          `;
        } else {
          return `
            <div class="node-person">
              <img src="${d.main.image || 'images/blason_placeholder.svg'}" alt="blason">
              <h3>${nameWithCrown(d.main)}</h3>
              <p>${d.main.title || ''}</p>
              <p>${d.main.birth || '?'} – ${d.main.death || '?'}</p>
            </div>
          `;
        }
      });
  });
}); 