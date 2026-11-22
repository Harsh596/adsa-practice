/**
 * Main Application Controller for GCC Code
 */

let state = {
    problems: [],
    currentProblem: null,
    editor: null,
    currentLanguage: 'cpp',
    activeLeftTab: 'description',
    activeConsoleTab: 'testcase',
    activeCaseIndex: 0,
    activeResultCaseIndex: 0,
    testcases: [],
    lastResult: null,
    isRunning: false,
    isSubmitting: false,
    stats: null,
    randomMode: localStorage.getItem('gcc_random_mode') || 'unsolved'
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    cleanLegacyLocalStorage();
    initEditor();
    initSplitters();
    initEventListeners();
    await loadProblems();
    await loadInitialProblem();
    await refreshStats();
});

function initEditor() {
    const editorContainer = document.getElementById('code-editor-root');
    state.editor = new CodeEditor(editorContainer, {
        fontSize: '13px',
        onRun: () => handleRunCode(),
        onSubmit: () => handleSubmitCode(),
        onShowShortcuts: () => openShortcutsModal(),
        onPickRandom: () => pickRandomProblem()
    });
}

function initSplitters() {
    // Horizontal Splitter (Left vs Right pane)
    const gutterH = document.getElementById('gutter-h');
    const leftPane = document.getElementById('left-pane');
    let isDraggingH = false;

    gutterH.addEventListener('mousedown', (e) => {
        isDraggingH = true;
        gutterH.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    // Vertical Splitter (Editor vs Console)
    const gutterV = document.getElementById('gutter-v');
    const consoleContainer = document.getElementById('console-pane');
    let isDraggingV = false;

    gutterV.addEventListener('mousedown', (e) => {
        isDraggingV = true;
        gutterV.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
        if (isDraggingH) {
            const containerWidth = document.getElementById('main-workspace').clientWidth;
            const newLeftWidth = Math.max(300, Math.min(containerWidth - 350, e.clientX));
            const pct = (newLeftWidth / containerWidth) * 100;
            leftPane.style.width = `${pct}%`;
        }
        if (isDraggingV) {
            const rightPaneHeight = document.getElementById('right-pane').clientHeight;
            const offsetTop = document.getElementById('right-pane').getBoundingClientRect().top;
            const pointerY = e.clientY - offsetTop;
            const newConsoleHeight = Math.max(40, Math.min(rightPaneHeight - 120, rightPaneHeight - pointerY));
            consoleContainer.style.height = `${newConsoleHeight}px`;
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDraggingH) {
            isDraggingH = false;
            gutterH.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
        if (isDraggingV) {
            isDraggingV = false;
            gutterV.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

function initEventListeners() {
    // Left pane tabs
    document.querySelectorAll('.left-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchLeftTab(tabId);
        });
    });

    // Console tabs
    document.querySelectorAll('.console-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchConsoleTab(tabId);
        });
    });

    // Run & Submit buttons
    document.getElementById('btn-run').addEventListener('click', handleRunCode);
    document.getElementById('btn-submit').addEventListener('click', handleSubmitCode);
    document.getElementById('btn-run-console').addEventListener('click', handleRunCode);
    document.getElementById('btn-submit-console').addEventListener('click', handleSubmitCode);

    // Problem navigation
    document.getElementById('btn-prev-problem').addEventListener('click', () => navigateProblem(-1));
    document.getElementById('btn-next-problem').addEventListener('click', () => navigateProblem(1));

    // Random Problem Picker events
    const btnRandom = document.getElementById('btn-random-problem');
    if (btnRandom) {
        btnRandom.addEventListener('click', (e) => {
            e.stopPropagation();
            const unsolvedCount = getUnsolvedProblems().length;
            // If there are NO unsolved questions, "that option won't be shown"
            // and there is only 1 possibility (All Questions), so pick immediately!
            if (unsolvedCount === 0) {
                closeRandomDropdown();
                pickRandomProblem('all');
                return;
            }
            // If there are unsolved questions, toggle dropdown menu for user to choose
            toggleRandomDropdown();
        });
    }

    const btnRandomAll = document.getElementById('btn-random-all');
    if (btnRandomAll) {
        btnRandomAll.addEventListener('click', (e) => {
            e.stopPropagation();
            setRandomMode('all');
            pickRandomProblem('all');
        });
    }

    const btnRandomUnsolved = document.getElementById('btn-random-unsolved');
    if (btnRandomUnsolved) {
        btnRandomUnsolved.addEventListener('click', (e) => {
            e.stopPropagation();
            setRandomMode('unsolved');
            pickRandomProblem('unsolved');
        });
    }

    // Close random dropdown on click outside
    document.addEventListener('click', (e) => {
        const container = document.getElementById('random-dropdown-container');
        if (container && !container.contains(e.target)) {
            closeRandomDropdown();
        }
    });

    // Close on Escape or Quick Pick Random on Option+R / Alt+R
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeRandomDropdown();
        }
        // Option+R (Mac) or Alt+R (Win)
        if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && (e.key === 'r' || e.key === 'R' || e.code === 'KeyR')) {
            e.preventDefault();
            pickRandomProblem();
        }
    });

    // Problems modal
    document.getElementById('btn-problems-modal').addEventListener('click', openProblemsModal);
    document.getElementById('btn-close-modal').addEventListener('click', closeProblemsModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeProblemsModal();
    });

    // Shortcuts modal
    const btnShortcuts = document.getElementById('btn-shortcuts-modal');
    if (btnShortcuts) btnShortcuts.addEventListener('click', openShortcutsModal);
    const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');
    if (btnCloseShortcuts) btnCloseShortcuts.addEventListener('click', closeShortcutsModal);
    const modalShortcutsOverlay = document.getElementById('modal-shortcuts-overlay');
    if (modalShortcutsOverlay) {
        modalShortcutsOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'modal-shortcuts-overlay') closeShortcutsModal();
        });
    }

    // Search and filters
    document.getElementById('problem-search').addEventListener('input', filterProblemsTable);
    document.getElementById('filter-topic').addEventListener('change', filterProblemsTable);
    document.getElementById('filter-difficulty').addEventListener('change', filterProblemsTable);
    document.getElementById('filter-status').addEventListener('change', filterProblemsTable);

    // Editor actions
    document.getElementById('btn-reset-code').addEventListener('click', resetStarterCode);
    document.getElementById('btn-copy-code').addEventListener('click', copyCode);
    document.getElementById('select-font-size').addEventListener('change', (e) => {
        state.editor.setFontSize(e.target.value);
    });

    // Console toggle
    document.getElementById('btn-toggle-console').addEventListener('click', toggleConsole);

    // Language selector
    const langSelect = document.getElementById('select-language');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            switchLanguage(e.target.value);
        });
    }

    // Auto-save code on input (only if code matches active language to prevent cross-language contamination)
    document.getElementById('editor-textarea').addEventListener('input', () => {
        if (state.currentProblem) {
            const lang = state.currentLanguage || 'cpp';
            const val = state.editor.getValue();
            if (isCodeMatchingLanguage(val, lang)) {
                localStorage.setItem(`gcc_code_${state.currentProblem.id}_${lang}`, val);
            }
        }
    });
}

async function loadProblems() {
    try {
        const res = await API.getProblems();
        state.problems = res.problems;
        populateTopicFilter();
        renderProblemsTable();
        updateRandomPickerUI();
        const btnModal = document.getElementById('btn-open-problems-modal');
        if (btnModal) btnModal.textContent = `☰ All ${state.problems.length} Problems`;
        const modalTitle = document.getElementById('problems-modal-title');
        if (modalTitle) modalTitle.innerHTML = `<span>⚡</span> Problem Set (${state.problems.length} Questions)`;
    } catch (err) {
        console.error('Error loading problems:', err);
    }
}

async function refreshStats() {
    try {
        const stats = await API.getStats();
        state.stats = stats;
        const statsEl = document.getElementById('nav-stats-pill');
        statsEl.innerHTML = `🔥 ${stats.streak}d &nbsp;|&nbsp; <strong>${stats.total_solved}</strong>/${stats.total_problems} Solved`;
        renderStatsGrid(stats);
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

function renderStatsGrid(stats) {
    const grid = document.getElementById('stats-grid-container');
    if (!grid) return;
    grid.innerHTML = `
        <div class="stat-card">
            <div class="stat-card-title">Total Solved</div>
            <div class="stat-card-val" style="color: var(--accent-green);">${stats.total_solved} / ${stats.total_problems}</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-title">Easy</div>
            <div class="stat-card-val" style="color: #4ade80;">${stats.by_difficulty.Easy.solved} / ${stats.by_difficulty.Easy.total}</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-title">Medium</div>
            <div class="stat-card-val" style="color: #fbbf24;">${stats.by_difficulty.Medium.solved} / ${stats.by_difficulty.Medium.total}</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-title">Hard</div>
            <div class="stat-card-val" style="color: #f87171;">${stats.by_difficulty.Hard.solved} / ${stats.by_difficulty.Hard.total}</div>
        </div>
    `;
}

async function loadInitialProblem() {
    // Check URL hash or load first problem
    const hash = window.location.hash.replace('#', '');
    const targetId = hash || (state.problems[0] ? state.problems[0].id : null);
    if (targetId) {
        await selectProblem(targetId);
    }
}

async function selectProblem(problemId) {
    try {
        const data = await API.getProblem(problemId);
        state.currentProblem = data.problem;
        window.location.hash = problemId;

        // Render details
        renderProblemDescription(data.problem);
        renderHintsAndEditorial(data.problem);
        renderSubmissions(data.submissions || []);

        // Load code: check preferred language, localStorage first, else use starter_codes for current language
        const preferredLang = localStorage.getItem('gcc_preferred_lang') || state.currentLanguage || 'cpp';
        state.currentLanguage = preferredLang;
        state.editor.setLanguage(preferredLang);
        const langSelect = document.getElementById('select-language');
        if (langSelect) langSelect.value = preferredLang;

        const starter = getStarterCode(data.problem, preferredLang);
        const savedCode = localStorage.getItem(`gcc_code_${problemId}_${preferredLang}`);
        if (savedCode !== null && isCodeMatchingLanguage(savedCode, preferredLang) && savedCode.trim() !== '') {
            state.editor.setValue(savedCode);
        } else {
            if (savedCode !== null && !isCodeMatchingLanguage(savedCode, preferredLang)) {
                localStorage.removeItem(`gcc_code_${problemId}_${preferredLang}`);
            }
            state.editor.setValue(starter);
        }

        // Setup testcases
        state.testcases = JSON.parse(JSON.stringify(data.problem.sample_testcases || []));
        state.activeCaseIndex = 0;
        renderTestcaseTabs();

        // Reset results tab
        state.lastResult = null;
        renderEmptyResult();
        switchConsoleTab('testcase');
        switchLeftTab('description');

        // Update Nav problem switcher title
        document.getElementById('current-problem-title-btn').textContent = `${data.problem.title}`;

        closeProblemsModal();
    } catch (err) {
        console.error('Error selecting problem:', err);
    }
}

// ==========================================
// Tree Visualization Helpers (Question Details)
// ==========================================

function isTreePreorderString(val) {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (!trimmed.includes('-1')) return false;
    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 3) return false;
    return tokens.every(t => t === '-1' || /^-?\d+$/.test(t));
}

function parseTreePreorder(str) {
    if (!str || typeof str !== 'string') return null;
    const cleanStr = str.trim().replace(/^["']|["']$/g, '');
    const tokens = cleanStr.split(/\s+/);
    if (!tokens.length) return null;
    let idx = 0;
    function build() {
        if (idx >= tokens.length) return null;
        const valStr = tokens[idx++];
        if (valStr === '-1' || valStr === 'null' || valStr === '#') return null;
        const val = parseInt(valStr, 10);
        if (isNaN(val)) return null;
        const node = { val, left: null, right: null };
        node.left = build();
        node.right = build();
        return node;
    }
    return build();
}

function generateTreeSvg(root) {
    if (!root) return '<div class="tree-empty">(Empty Tree)</div>';
    let inOrderIndex = 0;
    let maxDepth = 0;

    function layout(node, depth) {
        if (!node) return;
        if (depth > maxDepth) maxDepth = depth;
        layout(node.left, depth + 1);
        node.xIdx = inOrderIndex++;
        node.depth = depth;
        layout(node.right, depth + 1);
    }
    layout(root, 0);

    const totalNodes = inOrderIndex;
    const xStep = totalNodes > 10 ? 44 : 52;
    const yStep = 56;
    const paddingX = 40;
    const paddingY = 36;
    const nodeRadius = 18;

    const actualWidth = Math.max(260, paddingX * 2 + (totalNodes - 1) * xStep);
    const actualHeight = Math.max(140, paddingY * 2 + maxDepth * yStep);
    const leftOffset = (actualWidth - (paddingX * 2 + (totalNodes - 1) * xStep)) / 2;

    function assignCoords(node) {
        if (!node) return;
        node.x = paddingX + leftOffset + node.xIdx * xStep;
        node.y = paddingY + node.depth * yStep;
        assignCoords(node.left);
        assignCoords(node.right);
    }
    assignCoords(root);

    let edgesSvg = '';
    let nodesSvg = '';

    function traverse(node) {
        if (!node) return;
        if (node.left) {
            edgesSvg += `<line x1="${node.x}" y1="${node.y}" x2="${node.left.x}" y2="${node.left.y}" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>`;
        }
        if (node.right) {
            edgesSvg += `<line x1="${node.x}" y1="${node.y}" x2="${node.right.x}" y2="${node.right.y}" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>`;
        }

        const valStr = String(node.val);
        const r = Math.max(nodeRadius, Math.floor(valStr.length * 4.5) + 6);
        nodesSvg += `
            <g class="tree-node-group" data-val="${escapeHTML(valStr)}">
                <title>Node: ${escapeHTML(valStr)}</title>
                <circle cx="${node.x}" cy="${node.y}" r="${r}" fill="#1e293b" stroke="#3b82f6" stroke-width="2.5"/>
                <text x="${node.x}" y="${node.y}" text-anchor="middle" dominant-baseline="central" fill="#f8fafc" font-size="12px" font-weight="600" font-family="'JetBrains Mono', monospace">${escapeHTML(valStr)}</text>
            </g>
        `;

        traverse(node.left);
        traverse(node.right);
    }
    traverse(root);

    return `<svg class="tree-svg-canvas" viewBox="0 0 ${actualWidth} ${actualHeight}" width="${actualWidth}" height="${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <g class="tree-edges">${edgesSvg}</g>
        <g class="tree-nodes">${nodesSvg}</g>
    </svg>`;
}

function treeToAsciiLines(root) {
    if (!root) return '(empty tree)';
    function build(node) {
        if (!node) return null;
        const valStr = String(node.val);
        const valLen = valStr.length;
        if (!node.left && !node.right) {
            return { lines: [valStr], rootCol: Math.floor(valLen / 2), width: valLen };
        }
        const left = build(node.left);
        const right = build(node.right);
        if (left && !right) {
            const rootCol = left.rootCol + 2;
            const branchCol = left.rootCol + 1;
            const width = Math.max(rootCol + valLen, left.width + 1);
            const line0 = ' '.repeat(rootCol) + valStr;
            const line1 = ' '.repeat(branchCol) + '/';
            const childLines = left.lines.map(l => l.padEnd(width, ' '));
            return { lines: [line0, line1, ...childLines], rootCol: rootCol + Math.floor(valLen / 2), width };
        }
        if (!left && right) {
            const rootCol = 0;
            const branchCol = Math.max(1, Math.floor(valLen / 2) + 1);
            const rightShift = Math.max(valLen + 1, branchCol + 1);
            const line0 = valStr;
            const line1 = ' '.repeat(branchCol) + '\\';
            const childLines = right.lines.map(l => ' '.repeat(rightShift) + l);
            const width = Math.max(valLen, rightShift + right.width);
            return { lines: [line0, line1, ...childLines], rootCol: Math.floor(valLen / 2), width };
        }
        const gap = 2;
        const leftWidth = left.width;
        const rightShift = leftWidth + gap;
        const bLeft = left.rootCol + 1;
        const bRight = rightShift + right.rootCol - 1;
        let rootCol = Math.floor((bLeft + bRight - valLen) / 2);
        let leftPad = 0;
        if (rootCol < 0) { leftPad = -rootCol; rootCol = 0; }
        const line0 = ' '.repeat(rootCol) + valStr;
        const branchLen = Math.max(rootCol + valLen, bRight + leftPad + 1);
        let line1Arr = Array(branchLen).fill(' ');
        if (bLeft + leftPad < branchLen) line1Arr[bLeft + leftPad] = '/';
        if (bRight + leftPad < branchLen) line1Arr[bRight + leftPad] = '\\';
        const line1 = line1Arr.join('');
        const maxChildLines = Math.max(left.lines.length, right.lines.length);
        const childLines = [];
        for (let i = 0; i < maxChildLines; i++) {
            const lLine = i < left.lines.length ? left.lines[i] : '';
            const rLine = i < right.lines.length ? right.lines[i] : '';
            const paddedL = ' '.repeat(leftPad) + lLine.padEnd(leftWidth, ' ');
            childLines.push(paddedL + ' '.repeat(gap) + rLine);
        }
        const allLines = [line0, line1, ...childLines];
        const width = Math.max(...allLines.map(l => l.length));
        return { lines: allLines, rootCol: rootCol + Math.floor(valLen / 2), width };
    }
    return build(root).lines.join('\n');
}

function renderTreePreviewCard(title, svgHtml, asciiText, rawStr, uniqueId) {
    return `
        <div class="tree-preview-card" data-card-id="${uniqueId}">
            <div class="tree-preview-header">
                <div class="tree-preview-title">
                    <span class="tree-icon">🌲</span>
                    <span>${escapeHTML(title)}</span>
                </div>
                <div class="tree-preview-tabs">
                    <button type="button" class="tree-view-tab-btn active" data-view="diagram" onclick="switchTreeView(this, 'diagram')">Diagram</button>
                    <button type="button" class="tree-view-tab-btn" data-view="ascii" onclick="switchTreeView(this, 'ascii')">ASCII</button>
                    <button type="button" class="tree-view-tab-btn" data-view="raw" onclick="switchTreeView(this, 'raw')">Raw</button>
                </div>
            </div>
            <div class="tree-preview-body">
                <div class="tree-view-pane view-diagram active">
                    ${svgHtml}
                </div>
                <div class="tree-view-pane view-ascii" style="display: none;">
                    <pre class="tree-ascii-view">${escapeHTML(asciiText)}</pre>
                </div>
                <div class="tree-view-pane view-raw" style="display: none;">
                    <code class="tree-raw-view">${escapeHTML(String(rawStr))}</code>
                </div>
            </div>
        </div>
    `;
}

window.switchTreeView = function(btn, viewType) {
    if (!btn) return;
    const card = btn.closest('.tree-preview-card');
    if (!card) return;

    card.querySelectorAll('.tree-view-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const diagramPane = card.querySelector('.view-diagram');
    const asciiPane = card.querySelector('.view-ascii');
    const rawPane = card.querySelector('.view-raw');

    if (diagramPane) {
        diagramPane.style.display = viewType === 'diagram' ? 'flex' : 'none';
        diagramPane.classList.toggle('active', viewType === 'diagram');
    }
    if (asciiPane) {
        asciiPane.style.display = viewType === 'ascii' ? 'block' : 'none';
        asciiPane.classList.toggle('active', viewType === 'ascii');
    }
    if (rawPane) {
        rawPane.style.display = viewType === 'raw' ? 'block' : 'none';
        rawPane.classList.toggle('active', viewType === 'raw');
    }
};

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.tree-view-tab-btn');
    if (btn && btn.dataset.view) {
        window.switchTreeView(btn, btn.dataset.view);
    }
});

function renderProblemDescription(p) {
    const root = document.getElementById('description-content');

    const diffClass = `badge-${p.difficulty.toLowerCase()}`;
    const tagsHtml = (p.tags || []).map(t => `<span class="tag-pill">${t}</span>`).join('');

    const paramTypeMap = {};
    if (p.function && Array.isArray(p.function.params)) {
        p.function.params.forEach(pr => {
            paramTypeMap[pr.name] = pr.type;
        });
    }

    let examplesHtml = '';
    (p.examples || []).forEach((eg, i) => {
        let inputStr = Object.entries(eg.input).map(([k, v]) => `${k} = ${v}`).join(', ');

        let treePreviewsHtml = '';
        if (eg.input && typeof eg.input === 'object') {
            Object.entries(eg.input).forEach(([paramName, val]) => {
                const isDeclaredTree = paramTypeMap[paramName] === 'binary_tree';
                const isHeuristicTree = isTreePreorderString(val);
                if (isDeclaredTree || isHeuristicTree) {
                    const rootNode = parseTreePreorder(val);
                    if (rootNode) {
                        const svg = generateTreeSvg(rootNode);
                        const ascii = treeToAsciiLines(rootNode);
                        treePreviewsHtml += renderTreePreviewCard(
                            `Tree ${paramName} Structure`,
                            svg,
                            ascii,
                            val,
                            `eg-${i}-param-${paramName}`
                        );
                    }
                }
            });
        }

        const isDeclaredReturnTree = p.function && p.function.returns === 'binary_tree';
        const isHeuristicReturnTree = isTreePreorderString(eg.output);
        if (isDeclaredReturnTree || isHeuristicReturnTree) {
            const rootNode = parseTreePreorder(eg.output);
            if (rootNode) {
                const svg = generateTreeSvg(rootNode);
                const ascii = treeToAsciiLines(rootNode);
                treePreviewsHtml += renderTreePreviewCard(
                    'Output Tree Structure',
                    svg,
                    ascii,
                    eg.output,
                    `eg-${i}-output`
                );
            }
        }

        examplesHtml += `
            <div class="example-box">
                <div class="example-title">Example ${i + 1}</div>
                <div class="io-row"><span class="io-label">Input:</span><span class="io-value">${escapeHTML(inputStr)}</span></div>
                <div class="io-row"><span class="io-label">Output:</span><span class="io-value">${escapeHTML(eg.output)}</span></div>
                ${eg.explanation ? `<div class="explanation-text"><strong>Explanation:</strong> ${escapeHTML(eg.explanation)}</div>` : ''}
                ${treePreviewsHtml}
            </div>
        `;
    });

    let constraintsHtml = '';
    if (p.constraints && p.constraints.length > 0) {
        constraintsHtml = `
            <div class="section-title">Constraints:</div>
            <ul class="constraints-list">
                ${p.constraints.map(c => `<li>${escapeHTML(c)}</li>`).join('')}
            </ul>
        `;
    }

    let notesHtml = '';
    if (p.notes && p.notes.length > 0) {
        notesHtml = `
            <div class="notes-box">
                <strong>💡 Notes & Tips:</strong><br>
                ${p.notes.map(n => `• ${escapeHTML(n)}`).join('<br>')}
            </div>
        `;
    }

    root.innerHTML = `
        <div class="problem-header">
            <h1 class="problem-title">
                ${escapeHTML(p.title)}
                <span class="badge ${diffClass}">${p.difficulty}</span>
            </h1>
            <div class="tag-list">
                <span class="tag-pill" style="color: #60a5fa; border-color: #2563eb;">${escapeHTML(p.topic || 'General')}</span>
                ${tagsHtml}
            </div>
        </div>

        <div class="problem-description">
            ${formatDescription(p.description)}
        </div>

        ${notesHtml}

        <div class="section-title">Examples:</div>
        ${examplesHtml}

        ${constraintsHtml}
    `;
}

function renderHintsAndEditorial(p) {
    const root = document.getElementById('hints-content');
    const hints = p.hints || [];

    let hintsHtml = hints.map((h, i) => `
        <div class="hint-item" id="hint-item-${i}">
            <div class="hint-header" onclick="toggleHint(${i})">
                <span>💡 Hint ${i + 1}</span>
                <span class="hint-arrow">▶</span>
            </div>
            <div class="hint-body">${escapeHTML(h)}</div>
        </div>
    `).join('');

    root.innerHTML = `
        <div class="section-title">Problem Hints</div>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 14px;">Try solving on your own first! Reveal hints progressively as needed.</p>
        ${hintsHtml}

        <div class="section-title" style="margin-top: 24px;">Approach & Guidance</div>
        <div class="example-box">
            <div style="font-weight: 600; margin-bottom: 6px;">Key Invariant:</div>
            <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
                This problem is categorized under <strong>${escapeHTML(p.topic || 'Algorithms')}</strong>.
                Make sure your solution adheres to the constraints (${(p.constraints || []).join('; ')}).
                Check edge cases such as minimal sizes, prime conditions, or balanced tree heights before submitting.
            </p>
        </div>
    `;
}

window.toggleHint = function(idx) {
    const el = document.getElementById(`hint-item-${idx}`);
    if (el) {
        el.classList.toggle('open');
        const arrow = el.querySelector('.hint-arrow');
        if (arrow) arrow.textContent = el.classList.contains('open') ? '▼' : '▶';
    }
};

function renderSubmissions(submissions) {
    const root = document.getElementById('submissions-content');
    if (!submissions || submissions.length === 0) {
        root.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 40px 0;">
                No submissions yet for this problem.<br>Write your code and click <strong>Submit</strong>!
            </div>
        `;
        return;
    }

    const rows = submissions.map(s => {
        const isAc = (s.status === 'Accepted');
        const statusClass = isAc ? 'style="color: #4ade80; font-weight: 600;"' : 'style="color: #f87171; font-weight: 600;"';
        const dateStr = new Date(s.timestamp * 1000).toLocaleString();
        const langName = (s.language || 'cpp').toUpperCase();
        return `
            <tr onclick="loadPastSubmission('${s.id}')">
                <td ${statusClass}>${s.status}</td>
                <td><span class="tag-pill" style="font-size: 10px;">${langName}</span></td>
                <td style="font-family: var(--font-mono);">${s.runtime_ms} ms</td>
                <td>${s.passed_count}/${s.total_count}</td>
                <td style="color: var(--text-muted);">${dateStr}</td>
            </tr>
        `;
    }).join('');

    root.innerHTML = `
        <div class="section-title">Past Submissions</div>
        <table class="sub-table">
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Lang</th>
                    <th>Runtime</th>
                    <th>Testcases</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        <p style="color: var(--text-muted); font-size: 11px; margin-top: 10px;">Click any row to view submitted code.</p>
    `;
}

window.loadPastSubmission = function(subId) {
    if (!state.currentProblem) return;
    API.getSubmissions(state.currentProblem.id).then(res => {
        const sub = res.submissions.find(s => s.id === subId);
        if (sub && sub.code) {
            if (sub.language && sub.language !== state.currentLanguage) {
                switchLanguage(sub.language);
                const langSelect = document.getElementById('select-language');
                if (langSelect) langSelect.value = sub.language;
            }
            state.editor.setValue(sub.code);
            alert(`Loaded ${sub.language ? sub.language.toUpperCase() : 'C++'} code from submission (${sub.status} - ${sub.runtime_ms}ms)`);
        }
    });
};

function renderTestcaseTabs() {
    const tabsContainer = document.getElementById('tc-case-tabs');
    const inputContainer = document.getElementById('tc-input-container');

    let tabsHtml = '';
    state.testcases.forEach((tc, i) => {
        const activeClass = (i === state.activeCaseIndex) ? 'active' : '';
        tabsHtml += `<button class="tc-tab-btn ${activeClass}" onclick="switchTestCase(${i})">Case ${i + 1}</button>`;
    });
    tabsHtml += `<button class="tc-tab-btn" onclick="addCustomTestCase()" style="color: var(--brand-primary);">+ Custom</button>`;
    tabsContainer.innerHTML = tabsHtml;

    // Render active test case inputs
    const curTc = state.testcases[state.activeCaseIndex];
    if (!curTc) return;

    const fn = state.currentProblem.function;
    let inputsHtml = '';

    fn.params.forEach(p => {
        const val = curTc.input[p.name] !== undefined ? curTc.input[p.name] : '';
        inputsHtml += `
            <div class="tc-param-group">
                <div class="tc-param-label">${escapeHTML(p.name)} (${p.type}) =</div>
                <input type="text" class="tc-param-input" value="${escapeHTML(String(val))}"
                    onchange="updateTestCaseParam('${p.name}', this.value)">
            </div>
        `;
    });

    inputContainer.innerHTML = inputsHtml;
}

window.switchTestCase = function(idx) {
    state.activeCaseIndex = idx;
    renderTestcaseTabs();
};

window.updateTestCaseParam = function(paramName, val) {
    if (state.testcases[state.activeCaseIndex]) {
        state.testcases[state.activeCaseIndex].input[paramName] = val;
    }
};

window.addCustomTestCase = function() {
    if (!state.currentProblem) return;
    const fn = state.currentProblem.function;
    const newInp = {};
    fn.params.forEach(p => {
        newInp[p.name] = (state.testcases[0] && state.testcases[0].input[p.name]) || "";
    });
    state.testcases.push({
        input: newInp,
        expected: "",
        is_sample: true
    });
    state.activeCaseIndex = state.testcases.length - 1;
    renderTestcaseTabs();
};

async function handleRunCode() {
    if (state.isRunning || state.isSubmitting || !state.currentProblem) return;
    state.isRunning = true;
    updateRunButtons(true);

    const lang = state.currentLanguage || 'cpp';
    const langNames = { cpp: 'C++ (g++)', java: 'Java (javac)', python: 'Python 3', csharp: 'C#' };
    switchConsoleTab('result');
    renderLoadingResult(`Compiling/Running with ${langNames[lang] || lang}...`);

    try {
        const code = state.editor.getValue();
        const res = await API.runCode(state.currentProblem.id, code, state.testcases, lang);
        state.lastResult = res;
        state.activeResultCaseIndex = 0;
        renderTestResult(res, false);
    } catch (err) {
        renderErrorResult("Client/Server communication error: " + err.message);
    } finally {
        state.isRunning = false;
        updateRunButtons(false);
    }
}

async function handleSubmitCode() {
    if (state.isRunning || state.isSubmitting || !state.currentProblem) return;
    state.isSubmitting = true;
    updateSubmitButtons(true);

    const lang = state.currentLanguage || 'cpp';
    const langNames = { cpp: 'C++ (g++)', java: 'Java (javac)', python: 'Python 3', csharp: 'C#' };
    switchConsoleTab('result');
    renderLoadingResult(`Evaluating ${langNames[lang] || lang} against full test suite...`);

    try {
        const code = state.editor.getValue();
        const res = await API.submitCode(state.currentProblem.id, code, lang);
        state.lastResult = res;
        state.activeResultCaseIndex = 0;
        renderTestResult(res, true);
        await refreshStats();
        await loadProblems(); // Refresh status checkmarks
        // Refresh submissions tab
        const probDetails = await API.getProblem(state.currentProblem.id);
        renderSubmissions(probDetails.submissions || []);
    } catch (err) {
        renderErrorResult("Submission error: " + err.message);
    } finally {
        state.isSubmitting = false;
        updateSubmitButtons(false);
    }
}

function renderLoadingResult(msg) {
    const container = document.getElementById('result-content');
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 180px; gap: 14px;">
            <div class="spinner" style="width: 28px; height: 28px; border-width: 3px; border-top-color: var(--brand-primary);"></div>
            <div style="color: var(--text-secondary); font-size: 13px;">${escapeHTML(msg)}</div>
        </div>
    `;
}

function renderErrorResult(msg) {
    const container = document.getElementById('result-content');
    container.innerHTML = `
        <div class="verdict-banner runtime-error">
            <div class="verdict-title">Error</div>
        </div>
        <div class="compile-error-box">${escapeHTML(msg)}</div>
    `;
}

function renderEmptyResult() {
    const container = document.getElementById('result-content');
    const langName = getLanguageDisplayName(state.currentLanguage || 'cpp');
    container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 40px 0;">
            Click <strong>Run Code</strong> or <strong>Submit</strong> to compile and execute your ${langName} solution.
        </div>
    `;
}

function renderTestResult(res, isSubmit) {
    const container = document.getElementById('result-content');

    if (res.verdict === 'Compile Error') {
        const metrics = getCompilerMetrics(state.currentLanguage || 'cpp');
        container.innerHTML = `
            <div class="verdict-banner compile-error">
                <div class="verdict-title">Compilation Error</div>
                <div class="verdict-metrics">${escapeHTML(metrics)}</div>
            </div>
            <div class="compile-error-box">${escapeHTML(res.compile_error)}</div>
        `;
        return;
    }

    const isAc = (res.verdict === 'Accepted');
    const bannerClass = isAc ? 'accepted' : (res.verdict === 'Wrong Answer' ? 'wrong-answer' : 'runtime-error');

    let bannerTitle = res.verdict;
    if (isSubmit && isAc) {
        bannerTitle = '🎉 Accepted';
    }

    let bannerMetrics = `Passed ${res.passed_count}/${res.total_count} cases &nbsp;|&nbsp; Runtime: ${res.total_time_ms} ms`;

    // Testcase breakdown
    const tcs = res.testcases || [];
    let navBtns = '';
    tcs.forEach((tc, i) => {
        const pClass = (tc.status === 'Passed') ? 'pass' : 'fail';
        const activeClass = (i === state.activeResultCaseIndex) ? 'active' : '';
        navBtns += `<button class="result-tc-btn ${pClass} ${activeClass}" onclick="switchResultCase(${i})">Case ${tc.case_index}</button>`;
    });

    const activeTc = tcs[state.activeResultCaseIndex] || tcs[0];
    let tcDetailHtml = '';

    if (activeTc) {
        const inpStr = Object.entries(activeTc.input || {}).map(([k, v]) => `${k} = ${v}`).join('\n');
        tcDetailHtml = `
            <div class="result-card">
                <div class="result-label">INPUT</div>
                <div class="result-val">${escapeHTML(inpStr)}</div>
            </div>

            <div class="result-card">
                <div class="result-label">YOUR OUTPUT</div>
                <div class="result-val" style="${activeTc.status === 'Passed' ? 'color: #4ade80;' : 'color: #f87171;'}">${escapeHTML(activeTc.output || '')}</div>
            </div>

            <div class="result-card">
                <div class="result-label">EXPECTED</div>
                <div class="result-val">${escapeHTML(activeTc.expected || '')}</div>
            </div>

            ${activeTc.stdout ? `
                <div class="result-card" style="border-color: #3b82f6;">
                    <div class="result-label" style="color: #60a5fa;">STDOUT (std::cout)</div>
                    <div class="result-val">${escapeHTML(activeTc.stdout)}</div>
                </div>
            ` : ''}

            ${activeTc.custom_reason ? `
                <div class="result-card" style="border-color: #ef4444;">
                    <div class="result-label" style="color: #f87171;">VALIDATOR NOTE</div>
                    <div class="result-val">${escapeHTML(activeTc.custom_reason)}</div>
                </div>
            ` : ''}
        `;
    }

    container.innerHTML = `
        <div class="verdict-banner ${bannerClass}">
            <div class="verdict-title">${bannerTitle}</div>
            <div class="verdict-metrics">${bannerMetrics}</div>
        </div>

        <div class="result-tc-nav">
            ${navBtns}
        </div>

        <div id="result-tc-detail">
            ${tcDetailHtml}
        </div>
    `;
}

window.switchResultCase = function(idx) {
    state.activeResultCaseIndex = idx;
    if (state.lastResult) {
        renderTestResult(state.lastResult, state.isSubmitting);
    }
};

function switchLeftTab(tabId) {
    state.activeLeftTab = tabId;
    document.querySelectorAll('.left-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('#left-pane .tab-content').forEach(c => {
        c.classList.toggle('active', c.id === `${tabId}-content`);
    });
}

function switchConsoleTab(tabId) {
    state.activeConsoleTab = tabId;
    document.querySelectorAll('.console-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.getElementById('testcase-content').style.display = (tabId === 'testcase') ? 'block' : 'none';
    document.getElementById('result-content').style.display = (tabId === 'result') ? 'block' : 'none';
}

function toggleConsole() {
    const consolePane = document.getElementById('console-pane');
    if (consolePane.clientHeight <= 45) {
        consolePane.style.height = '260px';
    } else {
        consolePane.style.height = '38px';
    }
}

function updateRunButtons(loading) {
    const btns = [document.getElementById('btn-run'), document.getElementById('btn-run-console')];
    btns.forEach(b => {
        if (!b) return;
        b.disabled = loading;
        b.innerHTML = loading ? `<span class="spinner"></span> Running...` : `▶ Run`;
    });
}

function updateSubmitButtons(loading) {
    const btns = [document.getElementById('btn-submit'), document.getElementById('btn-submit-console')];
    btns.forEach(b => {
        if (!b) return;
        b.disabled = loading;
        b.innerHTML = loading ? `<span class="spinner"></span> Submitting...` : `✓ Submit`;
    });
}

function getLanguageDisplayName(lang) {
    const names = {
        cpp: 'C++',
        java: 'Java',
        python: 'Python 3',
        csharp: 'C#'
    };
    return names[lang] || lang.toUpperCase();
}

function getCompilerMetrics(lang) {
    const metrics = {
        cpp: 'g++ -O2 -std=c++17 -Wall',
        java: 'javac OpenJDK 21',
        python: 'Python 3.14 (CPython)',
        csharp: 'dotnet / mcs'
    };
    return metrics[lang] || lang;
}

function isCodeMatchingLanguage(code, lang) {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim();
    if (!trimmed) return false;

    if (lang === 'python') {
        if (trimmed.includes('class Solution {') || trimmed.includes('public:') || trimmed.includes('#include') || trimmed.includes('using System;') || trimmed.includes('import java.')) {
            return false;
        }
        return true;
    }
    if (lang === 'java') {
        if (trimmed.includes('TreeNode*') || trimmed.includes('public:\n') || trimmed.includes('public: ') || trimmed.includes('def ') || trimmed.includes('using System;') || trimmed.includes('#include')) {
            return false;
        }
        return true;
    }
    if (lang === 'csharp') {
        if (trimmed.includes('TreeNode*') || trimmed.includes('public:\n') || trimmed.includes('def ') || trimmed.includes('import java.') || trimmed.includes('#include')) {
            return false;
        }
        return true;
    }
    if (lang === 'cpp') {
        if (trimmed.includes('def ') || trimmed.includes('import java.') || trimmed.includes('using System;')) {
            return false;
        }
        return true;
    }
    return true;
}

function getStarterCode(problem, lang) {
    if (!problem) return '';
    const starterCodes = problem.starter_codes || {};
    return starterCodes[lang] || problem.starter_code || '';
}

function showLanguageSwitchedToast(lang) {
    const badge = document.getElementById('lang-status-badge');
    if (!badge) return;
    const name = getLanguageDisplayName(lang);
    badge.textContent = `⚡ ${name} template loaded`;
    badge.style.display = 'inline-block';
    badge.style.opacity = '1';
    clearTimeout(badge._timer);
    badge._timer = setTimeout(() => {
        badge.style.opacity = '0';
        setTimeout(() => { badge.style.display = 'none'; }, 300);
    }, 2200);
}

function cleanLegacyLocalStorage() {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('gcc_code_')) continue;
            const parts = key.split('_');
            if (parts.length === 3) {
                // Legacy gcc_code_<problemId> format
                keysToRemove.push(key);
            } else if (parts.length === 4) {
                const lang = parts[3];
                const val = localStorage.getItem(key);
                if (val && !isCodeMatchingLanguage(val, lang)) {
                    keysToRemove.push(key);
                }
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
        // Ignore localStorage quota / access errors
    }
}

function switchLanguage(newLang) {
    if (!state.currentProblem) {
        state.currentLanguage = newLang;
        localStorage.setItem('gcc_preferred_lang', newLang);
        return;
    }

    const oldLang = state.currentLanguage || 'cpp';
    const curCode = state.editor.getValue();

    // Save old code only if it was modified from starter template and matches old language
    const oldStarter = getStarterCode(state.currentProblem, oldLang);
    if (curCode && curCode.trim() !== oldStarter.trim() && isCodeMatchingLanguage(curCode, oldLang)) {
        localStorage.setItem(`gcc_code_${state.currentProblem.id}_${oldLang}`, curCode);
    }

    state.currentLanguage = newLang;
    localStorage.setItem('gcc_preferred_lang', newLang);
    state.editor.setLanguage(newLang);

    // Synchronize select element if not already matching
    const langSelect = document.getElementById('select-language');
    if (langSelect && langSelect.value !== newLang) {
        langSelect.value = newLang;
    }

    const newStarter = getStarterCode(state.currentProblem, newLang);
    const savedCode = localStorage.getItem(`gcc_code_${state.currentProblem.id}_${newLang}`);

    // If there is an existing draft for this language that matches its syntax, load it;
    // otherwise load the official starter template for this language!
    if (savedCode !== null && isCodeMatchingLanguage(savedCode, newLang) && savedCode.trim() !== '') {
        state.editor.setValue(savedCode);
    } else {
        if (savedCode !== null && !isCodeMatchingLanguage(savedCode, newLang)) {
            localStorage.removeItem(`gcc_code_${state.currentProblem.id}_${newLang}`);
        }
        state.editor.setValue(newStarter);
    }

    showLanguageSwitchedToast(newLang);
}

function resetStarterCode() {
    if (!state.currentProblem) return;
    const lang = state.currentLanguage || 'cpp';
    const name = getLanguageDisplayName(lang);
    if (confirm(`Reset ${name} code to default starter template?`)) {
        const starter = getStarterCode(state.currentProblem, lang);
        state.editor.setValue(starter);
        localStorage.removeItem(`gcc_code_${state.currentProblem.id}_${lang}`);
        showLanguageSwitchedToast(lang);
    }
}

async function copyCode() {
    if (!state.editor) return;
    const code = state.editor.getValue();
    let copied = false;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(code);
            copied = true;
        }
    } catch (e) {
        // Fallback below
    }

    if (!copied) {
        try {
            const ta = document.createElement('textarea');
            ta.value = code;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            copied = true;
        } catch (e) {
            console.error('Copy fallback failed:', e);
        }
    }

    const badge = document.getElementById('lang-status-badge');
    if (badge) {
        badge.textContent = `📋 Code copied to clipboard!`;
        badge.style.display = 'inline-block';
        badge.style.opacity = '1';
        clearTimeout(badge._timer);
        badge._timer = setTimeout(() => {
            badge.style.opacity = '0';
            setTimeout(() => { badge.style.display = 'none'; }, 300);
        }, 2000);
    }
}

function navigateProblem(direction) {
    if (!state.currentProblem || state.problems.length === 0) return;
    const curIdx = state.problems.findIndex(p => p.id === state.currentProblem.id);
    if (curIdx === -1) return;
    let nextIdx = curIdx + direction;
    if (nextIdx < 0) nextIdx = state.problems.length - 1;
    if (nextIdx >= state.problems.length) nextIdx = 0;
    selectProblem(state.problems[nextIdx].id);
}

// ==========================================
// Random Problem Picker Logic
// ==========================================

function getUnsolvedProblems() {
    return (state.problems || []).filter(p => p.status !== 'solved');
}

function updateRandomPickerUI() {
    const totalCount = state.problems.length;
    const unsolvedProblems = getUnsolvedProblems();
    const unsolvedCount = unsolvedProblems.length;

    if (unsolvedCount === 0 && state.randomMode === 'unsolved') {
        state.randomMode = 'all';
    }

    const countAllEl = document.getElementById('count-all-problems');
    const badgeAllEl = document.getElementById('badge-all-problems');
    if (countAllEl) countAllEl.textContent = totalCount;
    if (badgeAllEl) badgeAllEl.textContent = totalCount;

    const unsolvedOptionEl = document.getElementById('btn-random-unsolved');
    const countUnsolvedEl = document.getElementById('count-unsolved-problems');
    const badgeUnsolvedEl = document.getElementById('badge-unsolved-problems');
    const caretEl = document.getElementById('random-caret');
    const checkAll = document.getElementById('check-random-all');
    const checkUnsolved = document.getElementById('check-random-unsolved');
    const btnAll = document.getElementById('btn-random-all');
    const btnUnsolved = document.getElementById('btn-random-unsolved');

    if (unsolvedCount > 0) {
        // "only from the unsolved, if there are any" -> SHOW IT!
        if (unsolvedOptionEl) unsolvedOptionEl.style.display = 'flex';
        if (countUnsolvedEl) countUnsolvedEl.textContent = unsolvedCount;
        if (badgeUnsolvedEl) badgeUnsolvedEl.textContent = unsolvedCount;
        if (caretEl) caretEl.style.display = 'inline-block';
    } else {
        // "if not, that option won't be shown" -> HIDE IT!
        if (unsolvedOptionEl) unsolvedOptionEl.style.display = 'none';
        if (caretEl) caretEl.style.display = 'none';
        state.randomMode = 'all';
    }

    const isUnsolvedMode = (state.randomMode === 'unsolved' && unsolvedCount > 0);
    if (checkAll) checkAll.textContent = isUnsolvedMode ? '' : '✓';
    if (checkUnsolved) checkUnsolved.textContent = isUnsolvedMode ? '✓' : '';
    if (btnAll) btnAll.classList.toggle('active', !isUnsolvedMode);
    if (btnUnsolved) btnUnsolved.classList.toggle('active', isUnsolvedMode);
}

function toggleRandomDropdown(forceState = null) {
    const container = document.getElementById('random-dropdown-container');
    if (!container) return;
    if (forceState !== null) {
        container.classList.toggle('open', forceState);
    } else {
        container.classList.toggle('open');
    }
}

function closeRandomDropdown() {
    toggleRandomDropdown(false);
}

function setRandomMode(mode) {
    const unsolvedCount = getUnsolvedProblems().length;
    if (mode === 'unsolved' && unsolvedCount === 0) {
        mode = 'all';
    }
    state.randomMode = mode;
    localStorage.setItem('gcc_random_mode', mode);
    updateRandomPickerUI();
}

function pickRandomProblem(forcedMode = null) {
    if (!state.problems || state.problems.length === 0) return;

    const unsolvedProblems = getUnsolvedProblems();
    let mode = forcedMode || state.randomMode || 'unsolved';

    // If 'unsolved' was chosen but none are left, fall back to 'all'
    if (mode === 'unsolved' && unsolvedProblems.length === 0) {
        mode = 'all';
    }

    const pool = (mode === 'unsolved') ? unsolvedProblems : state.problems;
    if (pool.length === 0) return;

    // Filter out currently active problem if pool has more than 1 option
    let candidates = pool;
    if (state.currentProblem && pool.length > 1) {
        candidates = pool.filter(p => p.id !== state.currentProblem.id);
        if (candidates.length === 0) candidates = pool;
    }

    const randomIdx = Math.floor(Math.random() * candidates.length);
    const chosenProblem = candidates[randomIdx];

    closeRandomDropdown();
    selectProblem(chosenProblem.id);

    // Show toast notification
    if (mode === 'unsolved') {
        showToast(`⭕ Picked unsolved (${unsolvedProblems.length} remaining): <strong>${escapeHTML(chosenProblem.title)}</strong>`);
    } else {
        showToast(`🎲 Picked from all ${state.problems.length} questions: <strong>${escapeHTML(chosenProblem.title)}</strong>`);
    }
}

// Global Toast Notification
let toastTimer = null;
function showToast(htmlContent, duration = 3000) {
    const toast = document.getElementById('global-toast');
    if (!toast) return;
    toast.innerHTML = htmlContent;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Problems Modal
function openProblemsModal() {
    renderProblemsTable();
    document.getElementById('modal-overlay').classList.add('open');
    document.getElementById('problem-search').focus();
}

function closeProblemsModal() {
    document.getElementById('modal-overlay').classList.remove('open');
}

// Shortcuts Modal
function openShortcutsModal() {
    const overlay = document.getElementById('modal-shortcuts-overlay');
    if (overlay) overlay.classList.add('open');
}

function closeShortcutsModal() {
    const overlay = document.getElementById('modal-shortcuts-overlay');
    if (overlay) overlay.classList.remove('open');
    if (state.editor && state.editor.textarea) {
        state.editor.textarea.focus();
    }
}

function populateTopicFilter() {
    const select = document.getElementById('filter-topic');
    const topics = new Set();
    state.problems.forEach(p => {
        if (p.topic) topics.add(p.topic);
    });
    topics.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        select.appendChild(opt);
    });
}

function filterProblemsTable() {
    const q = document.getElementById('problem-search').value.toLowerCase();
    const topic = document.getElementById('filter-topic').value;
    const diff = document.getElementById('filter-difficulty').value;
    const status = document.getElementById('filter-status').value;

    const filtered = state.problems.filter(p => {
        const matchesQ = !q || p.title.toLowerCase().includes(q) || (p.topic || '').toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q));
        const matchesTopic = !topic || p.topic === topic;
        const matchesDiff = !diff || p.difficulty === diff;
        const matchesStatus = !status || p.status === status;
        return matchesQ && matchesTopic && matchesDiff && matchesStatus;
    });

    renderProblemsTable(filtered);
}

function renderProblemsTable(problemsList = null) {
    const list = problemsList || state.problems;
    const tbody = document.getElementById('problems-tbody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">No problems match your filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((p, i) => {
        let statusIcon = '<span class="status-icon" style="color: var(--text-muted);">○</span>';
        if (p.status === 'solved') {
            statusIcon = '<span class="status-icon solved">✓</span>';
        } else if (p.status === 'attempted') {
            statusIcon = '<span class="status-icon attempted">◐</span>';
        }

        const diffClass = `badge-${p.difficulty.toLowerCase()}`;
        return `
            <tr onclick="selectProblem('${p.id}')">
                <td style="width: 40px; text-align: center;">${statusIcon}</td>
                <td style="font-weight: 500; color: #fff;">${i + 1}. ${escapeHTML(p.title)}</td>
                <td style="color: var(--text-secondary);">${escapeHTML(p.topic || 'General')}</td>
                <td><span class="badge ${diffClass}">${p.difficulty}</span></td>
                <td style="color: var(--text-muted); font-size: 12px;">${p.total_testcases || 2} cases</td>
            </tr>
        `;
    }).join('');
}

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatDescription(desc) {
    if (!desc) return '';
    return escapeHTML(desc)
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');
}
