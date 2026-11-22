/**
 * Custom C++ Code Editor for GCC Code (LeetCode style)
 * Fully offline, high performance, syntax highlighted, tab-aware, auto-indenting.
 */

class CodeEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = Object.assign({
            fontSize: '13px',
            tabSize: 4,
            onRun: () => {},
            onSubmit: () => {}
        }, options);

        this.initDOM();
        this.bindEvents();
        this.setValue(options.initialValue || "");
    }

    initDOM() {
        this.container.innerHTML = `
            <div class="line-numbers-gutter" id="editor-gutter"></div>
            <div class="editor-textarea-container">
                <div class="editor-find-widget" id="editor-find-widget" style="display: none;">
                    <div class="find-row">
                        <input type="text" class="find-input" id="find-search-input" placeholder="Find">
                        <span class="find-count" id="find-match-count">No results</span>
                        <button class="find-btn" id="find-prev-btn" title="Previous Match (Shift+Enter / Shift+F3)">▲</button>
                        <button class="find-btn" id="find-next-btn" title="Next Match (Enter / F3)">▼</button>
                        <button class="find-btn" id="find-close-btn" title="Close (Escape)">✕</button>
                    </div>
                    <div class="find-row replace-row" id="find-replace-row" style="display: none;">
                        <input type="text" class="find-input" id="find-replace-input" placeholder="Replace">
                        <button class="find-btn text-btn" id="find-replace-btn" title="Replace Current Match">Replace</button>
                        <button class="find-btn text-btn" id="find-replace-all-btn" title="Replace All Matches">All</button>
                    </div>
                </div>
                <pre class="code-highlight-layer" id="editor-highlight" aria-hidden="true"></pre>
                <textarea class="code-input-textarea" id="editor-textarea" wrap="off" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
            </div>
        `;

        this.gutter = this.container.querySelector('#editor-gutter');
        this.highlightLayer = this.container.querySelector('#editor-highlight');
        this.textarea = this.container.querySelector('#editor-textarea');

        // Find & Replace widget elements
        this.findWidget = this.container.querySelector('#editor-find-widget');
        this.findSearchInput = this.container.querySelector('#find-search-input');
        this.findReplaceInput = this.container.querySelector('#find-replace-input');
        this.findReplaceRow = this.container.querySelector('#find-replace-row');
        this.findMatchCount = this.container.querySelector('#find-match-count');
        this.findPrevBtn = this.container.querySelector('#find-prev-btn');
        this.findNextBtn = this.container.querySelector('#find-next-btn');
        this.findCloseBtn = this.container.querySelector('#find-close-btn');
        this.findReplaceBtn = this.container.querySelector('#find-replace-btn');
        this.findReplaceAllBtn = this.container.querySelector('#find-replace-all-btn');

        this.setFontSize(this.options.fontSize);
    }

    bindEvents() {
        this.textarea.addEventListener('input', () => {
            this.recordHistory();
            this.updateHighlighting();
            this.updateLineNumbers();
        });

        this.textarea.addEventListener('scroll', () => {
            this.highlightLayer.scrollTop = this.textarea.scrollTop;
            this.highlightLayer.scrollLeft = this.textarea.scrollLeft;
            this.gutter.scrollTop = this.textarea.scrollTop;
        });

        this.textarea.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Click anywhere in editor container to focus textarea
        this.container.addEventListener('click', (e) => {
            if (e.target !== this.textarea) {
                this.textarea.focus();
            }
        });

        // Copy event: when no text is selected, copy current line
        this.textarea.addEventListener('copy', (e) => this.handleCopy(e));

        // Cut event: when no text is selected, cut current line
        this.textarea.addEventListener('cut', (e) => this.handleCut(e));

        // Paste event: handle cleanly with history and re-highlight
        this.textarea.addEventListener('paste', () => {
            this.recordHistory();
            setTimeout(() => {
                this.updateHighlighting();
                this.updateLineNumbers();
                this.updateActiveLine();
            }, 0);
        });

        // Active line cursor tracking
        const updateLineOnCursor = () => this.updateActiveLine();
        this.textarea.addEventListener('click', updateLineOnCursor);
        this.textarea.addEventListener('keyup', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                updateLineOnCursor();
            }
        });
        this.textarea.addEventListener('select', updateLineOnCursor);

        // Initialize Find & Replace widget events
        this.initFindWidget();
    }

    recordHistory() {
        if (!this.history) {
            this.history = { undoStack: [], redoStack: [], lastVal: null };
        }
        const state = {
            val: this.textarea.value,
            start: this.textarea.selectionStart,
            end: this.textarea.selectionEnd
        };
        if (this.history.lastVal === state.val) return;
        this.history.undoStack.push(state);
        if (this.history.undoStack.length > 100) this.history.undoStack.shift();
        this.history.redoStack = [];
        this.history.lastVal = state.val;
    }

    undo() {
        if (!this.history || this.history.undoStack.length === 0) return false;
        if (this.history.undoStack[this.history.undoStack.length - 1].val === this.textarea.value) {
            this.history.redoStack.push(this.history.undoStack.pop());
            if (this.history.undoStack.length === 0) return true;
        }
        const current = {
            val: this.textarea.value,
            start: this.textarea.selectionStart,
            end: this.textarea.selectionEnd
        };
        this.history.redoStack.push(current);
        const prev = this.history.undoStack.pop();
        this.history.lastVal = prev.val;
        this.textarea.value = prev.val;
        this.textarea.selectionStart = prev.start;
        this.textarea.selectionEnd = prev.end;
        this.updateHighlighting();
        this.updateLineNumbers();
        this.updateActiveLine();
        return true;
    }

    redo() {
        if (!this.history || this.history.redoStack.length === 0) return false;
        if (this.history.redoStack[this.history.redoStack.length - 1].val === this.textarea.value) {
            this.history.undoStack.push(this.history.redoStack.pop());
            if (this.history.redoStack.length === 0) return true;
        }
        const current = {
            val: this.textarea.value,
            start: this.textarea.selectionStart,
            end: this.textarea.selectionEnd
        };
        this.history.undoStack.push(current);
        const next = this.history.redoStack.pop();
        this.history.lastVal = next.val;
        this.textarea.value = next.val;
        this.textarea.selectionStart = next.start;
        this.textarea.selectionEnd = next.end;
        this.updateHighlighting();
        this.updateLineNumbers();
        this.updateActiveLine();
        return true;
    }

    handleCopy(e) {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        if (start === end) {
            // When no text is selected, copy the current full line (including newline)
            const val = this.textarea.value;
            const lineStart = val.lastIndexOf('\n', start - 1) + 1;
            let lineEnd = val.indexOf('\n', end);
            if (lineEnd === -1) lineEnd = val.length;
            const lineText = val.substring(lineStart, lineEnd) + '\n';
            if (e.clipboardData) {
                e.clipboardData.setData('text/plain', lineText);
                e.preventDefault();
            }
        }
    }

    handleCut(e) {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.recordHistory();
        if (start === end) {
            // When no text is selected, cut the current full line
            const val = this.textarea.value;
            const lineStart = val.lastIndexOf('\n', start - 1) + 1;
            let lineEnd = val.indexOf('\n', end);
            if (lineEnd === -1) {
                lineEnd = val.length;
            } else {
                lineEnd += 1;
            }
            const lineText = val.substring(lineStart, lineEnd);
            if (e.clipboardData) {
                e.clipboardData.setData('text/plain', lineText);
            }
            this.textarea.value = val.substring(0, lineStart) + val.substring(lineEnd);
            this.textarea.selectionStart = this.textarea.selectionEnd = Math.min(lineStart, this.textarea.value.length);
            this.updateHighlighting();
            this.updateLineNumbers();
            e.preventDefault();
        }
    }

    moveLines(dir) {
        const val = this.textarea.value;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = val.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = val.length;
        const selectedBlock = val.substring(lineStart, lineEnd);

        if (dir === -1) {
            // Move UP
            if (lineStart === 0) return;
            const prevLineStart = val.lastIndexOf('\n', lineStart - 2) + 1;
            const prevLine = val.substring(prevLineStart, lineStart - 1);
            const prefix = val.substring(0, prevLineStart);
            const suffix = val.substring(lineEnd);
            this.textarea.value = prefix + selectedBlock + '\n' + prevLine + suffix;
            const delta = prevLineStart - lineStart;
            this.textarea.selectionStart = start + delta;
            this.textarea.selectionEnd = end + delta;
        } else if (dir === 1) {
            // Move DOWN
            if (lineEnd >= val.length) return;
            let nextLineEnd = val.indexOf('\n', lineEnd + 1);
            if (nextLineEnd === -1) nextLineEnd = val.length;
            const nextLine = val.substring(lineEnd + 1, nextLineEnd);
            const prefix = val.substring(0, lineStart);
            const suffix = val.substring(nextLineEnd);
            this.textarea.value = prefix + nextLine + '\n' + selectedBlock + suffix;
            const delta = nextLine.length + 1;
            this.textarea.selectionStart = start + delta;
            this.textarea.selectionEnd = end + delta;
        }
        this.updateHighlighting();
        this.updateLineNumbers();
        this.updateActiveLine();
    }

    copyLines(dir) {
        const val = this.textarea.value;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = val.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = val.length;
        const selectedBlock = val.substring(lineStart, lineEnd);
        const prefix = val.substring(0, lineStart);
        const suffix = val.substring(lineEnd);
        this.textarea.value = prefix + selectedBlock + '\n' + selectedBlock + suffix;
        if (dir === -1) {
            this.textarea.selectionStart = start;
            this.textarea.selectionEnd = end;
        } else {
            const delta = selectedBlock.length + 1;
            this.textarea.selectionStart = start + delta;
            this.textarea.selectionEnd = end + delta;
        }
        this.updateHighlighting();
        this.updateLineNumbers();
        this.updateActiveLine();
    }

    toggleComment() {
        const val = this.textarea.value;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = val.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = val.length;

        const block = val.substring(lineStart, lineEnd);
        const lines = block.split('\n');

        const isPy = (this.language === 'python' || this.language === 'py');
        const pfx = isPy ? '# ' : '// ';
        const altPfx = isPy ? '#' : '//';

        const allCommented = lines.every(l => {
            const trimmed = l.trim();
            return trimmed.length === 0 || trimmed.startsWith(altPfx);
        });

        let newLines;
        if (allCommented) {
            newLines = lines.map(l => {
                const trimmed = l.trimStart();
                const leadingSpaces = l.substring(0, l.length - trimmed.length);
                if (trimmed.startsWith(pfx)) return leadingSpaces + trimmed.substring(pfx.length);
                if (trimmed.startsWith(altPfx)) return leadingSpaces + trimmed.substring(altPfx.length);
                return l;
            });
        } else {
            newLines = lines.map(l => {
                if (l.trim().length === 0) return l;
                return pfx + l;
            });
        }

        const newBlock = newLines.join('\n');
        this.textarea.value = val.substring(0, lineStart) + newBlock + val.substring(lineEnd);
        this.textarea.selectionStart = lineStart;
        this.textarea.selectionEnd = lineStart + newBlock.length;

        this.updateHighlighting();
        this.updateLineNumbers();
        this.updateActiveLine();
    }

    deleteLine() {
        const val = this.textarea.value;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = val.indexOf('\n', end);
        if (lineEnd === -1) {
            lineEnd = val.length;
        } else {
            lineEnd += 1;
        }
        this.textarea.value = val.substring(0, lineStart) + val.substring(lineEnd);
        this.textarea.selectionStart = this.textarea.selectionEnd = Math.min(lineStart, this.textarea.value.length);
        this.updateHighlighting();
        this.updateLineNumbers();
        this.updateActiveLine();
    }

    selectWordOrNextOccurrence() {
        const val = this.textarea.value;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;

        if (start === end) {
            let wordStart = start;
            while (wordStart > 0 && /[a-zA-Z0-9_]/.test(val[wordStart - 1])) {
                wordStart--;
            }
            let wordEnd = end;
            while (wordEnd < val.length && /[a-zA-Z0-9_]/.test(val[wordEnd])) {
                wordEnd++;
            }
            if (wordStart < wordEnd) {
                this.textarea.selectionStart = wordStart;
                this.textarea.selectionEnd = wordEnd;
                this.updateActiveLine();
            }
        } else {
            const selectedText = val.substring(start, end);
            const nextIdx = val.indexOf(selectedText, end);
            if (nextIdx !== -1) {
                this.textarea.selectionStart = nextIdx;
                this.textarea.selectionEnd = nextIdx + selectedText.length;
                this.updateActiveLine();
            } else {
                const firstIdx = val.indexOf(selectedText);
                if (firstIdx !== -1) {
                    this.textarea.selectionStart = firstIdx;
                    this.textarea.selectionEnd = firstIdx + selectedText.length;
                    this.updateActiveLine();
                }
            }
        }
    }

    handleTab(isShift) {
        const val = this.textarea.value;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const tabStr = "    ";

        if (start === end) {
            if (!isShift) {
                this.textarea.value = val.substring(0, start) + tabStr + val.substring(end);
                this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
            } else {
                const lineStart = val.lastIndexOf('\n', start - 1) + 1;
                if (val.substring(lineStart, lineStart + 4) === tabStr) {
                    this.textarea.value = val.substring(0, lineStart) + val.substring(lineStart + 4);
                    this.textarea.selectionStart = this.textarea.selectionEnd = Math.max(lineStart, start - 4);
                } else if (val[lineStart] === ' ') {
                    let spaces = 0;
                    while (spaces < 4 && val[lineStart + spaces] === ' ') spaces++;
                    this.textarea.value = val.substring(0, lineStart) + val.substring(lineStart + spaces);
                    this.textarea.selectionStart = this.textarea.selectionEnd = Math.max(lineStart, start - spaces);
                }
            }
        } else {
            const lineStart = val.lastIndexOf('\n', start - 1) + 1;
            let lineEnd = val.indexOf('\n', end);
            if (lineEnd === -1) lineEnd = val.length;

            const block = val.substring(lineStart, lineEnd);
            const lines = block.split('\n');

            let deltaStart = 0;
            let deltaEnd = 0;
            let newLines;

            if (!isShift) {
                newLines = lines.map(l => tabStr + l);
                deltaStart = 4;
                deltaEnd = 4 * lines.length;
            } else {
                newLines = lines.map((l, idx) => {
                    if (l.startsWith(tabStr)) {
                        if (idx === 0) deltaStart = -4;
                        deltaEnd -= 4;
                        return l.substring(4);
                    } else if (l.startsWith(' ')) {
                        const match = l.match(/^ +/);
                        const removeCount = Math.min(match ? match[0].length : 0, 4);
                        if (idx === 0) deltaStart = -removeCount;
                        deltaEnd -= removeCount;
                        return l.substring(removeCount);
                    }
                    return l;
                });
            }

            const newBlock = newLines.join('\n');
            this.textarea.value = val.substring(0, lineStart) + newBlock + val.substring(lineEnd);
            this.textarea.selectionStart = Math.max(lineStart, start + deltaStart);
            this.textarea.selectionEnd = Math.max(lineStart, end + deltaEnd);
        }

        this.updateHighlighting();
        this.updateLineNumbers();
        this.updateActiveLine();
    }

    initFindWidget() {
        if (!this.findWidget) return;
        this.findSearchInput.addEventListener('input', () => this.updateFindMatches());
        this.findSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) this.findPrev();
                else this.findNext();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.closeFind();
            }
        });

        this.findReplaceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.replace();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.closeFind();
            }
        });

        this.findPrevBtn.addEventListener('click', () => this.findPrev());
        this.findNextBtn.addEventListener('click', () => this.findNext());
        this.findCloseBtn.addEventListener('click', () => this.closeFind());
        this.findReplaceBtn.addEventListener('click', () => this.replace());
        this.findReplaceAllBtn.addEventListener('click', () => this.replaceAll());
    }

    openFind(replaceMode = false) {
        if (!this.findWidget) return;
        this.findWidget.style.display = 'flex';
        this.findReplaceRow.style.display = replaceMode ? 'flex' : 'none';

        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        if (start !== end) {
            const selected = this.textarea.value.substring(start, end);
            if (!selected.includes('\n')) {
                this.findSearchInput.value = selected;
            }
        }

        this.updateFindMatches();
        if (replaceMode && this.findSearchInput.value) {
            this.findReplaceInput.focus();
            this.findReplaceInput.select();
        } else {
            this.findSearchInput.focus();
            this.findSearchInput.select();
        }
    }

    closeFind() {
        if (!this.findWidget) return;
        this.findWidget.style.display = 'none';
        this.textarea.focus();
    }

    updateFindMatches() {
        const query = this.findSearchInput.value;
        if (!query) {
            this.findMatchCount.textContent = 'No results';
            this.matches = [];
            this.currentMatchIndex = -1;
            return;
        }

        const val = this.textarea.value;
        const matches = [];
        let idx = val.indexOf(query);
        while (idx !== -1) {
            matches.push(idx);
            idx = val.indexOf(query, idx + query.length);
        }

        this.matches = matches;
        if (matches.length === 0) {
            this.findMatchCount.textContent = '0 of 0';
            this.currentMatchIndex = -1;
        } else {
            const curPos = this.textarea.selectionStart;
            let bestIdx = 0;
            for (let i = 0; i < matches.length; i++) {
                if (matches[i] >= curPos) {
                    bestIdx = i;
                    break;
                }
            }
            this.currentMatchIndex = bestIdx;
            this.findMatchCount.textContent = `${this.currentMatchIndex + 1} of ${matches.length}`;
            this.highlightCurrentMatch();
        }
    }

    findNext() {
        if (!this.matches || this.matches.length === 0) return;
        this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
        this.findMatchCount.textContent = `${this.currentMatchIndex + 1} of ${this.matches.length}`;
        this.highlightCurrentMatch();
    }

    findPrev() {
        if (!this.matches || this.matches.length === 0) return;
        this.currentMatchIndex = (this.currentMatchIndex - 1 + this.matches.length) % this.matches.length;
        this.findMatchCount.textContent = `${this.currentMatchIndex + 1} of ${this.matches.length}`;
        this.highlightCurrentMatch();
    }

    highlightCurrentMatch() {
        if (!this.matches || this.matches.length === 0 || this.currentMatchIndex === -1) return;
        const pos = this.matches[this.currentMatchIndex];
        const len = this.findSearchInput.value.length;
        this.textarea.selectionStart = pos;
        this.textarea.selectionEnd = pos + len;
        this.updateActiveLine();
    }

    replace() {
        const query = this.findSearchInput.value;
        const repl = this.findReplaceInput.value;
        if (!query) return;

        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const val = this.textarea.value;

        if (start !== end && val.substring(start, end) === query) {
            this.recordHistory();
            this.textarea.value = val.substring(0, start) + repl + val.substring(end);
            this.textarea.selectionStart = start;
            this.textarea.selectionEnd = start + repl.length;
            this.updateHighlighting();
            this.updateLineNumbers();
        }
        this.updateFindMatches();
        this.findNext();
    }

    replaceAll() {
        const query = this.findSearchInput.value;
        const repl = this.findReplaceInput.value;
        if (!query) return;

        this.recordHistory();
        const val = this.textarea.value;
        this.textarea.value = val.split(query).join(repl);
        this.updateHighlighting();
        this.updateLineNumbers();
        this.updateFindMatches();
    }

    insertLineBelow() {
        const val = this.textarea.value;
        const pos = this.textarea.selectionStart;
        const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
        let lineEnd = val.indexOf('\n', pos);
        if (lineEnd === -1) lineEnd = val.length;

        const indentMatch = val.substring(lineStart, lineEnd).match(/^\s*/);
        const indent = indentMatch ? indentMatch[0] : "";

        this.recordHistory();
        this.textarea.value = val.substring(0, lineEnd) + '\n' + indent + val.substring(lineEnd);
        this.textarea.selectionStart = this.textarea.selectionEnd = lineEnd + 1 + indent.length;
        this.updateHighlighting();
        this.updateLineNumbers();
        this.updateActiveLine();
    }

    insertLineAbove() {
        const val = this.textarea.value;
        const pos = this.textarea.selectionStart;
        const lineStart = val.lastIndexOf('\n', pos - 1) + 1;

        const indentMatch = val.substring(lineStart).match(/^\s*/);
        const indent = indentMatch ? indentMatch[0] : "";

        this.recordHistory();
        this.textarea.value = val.substring(0, lineStart) + indent + '\n' + val.substring(lineStart);
        this.textarea.selectionStart = this.textarea.selectionEnd = lineStart + indent.length;
        this.updateHighlighting();
        this.updateLineNumbers();
        this.updateActiveLine();
    }

    selectLine() {
        const val = this.textarea.value;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;

        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = val.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = val.length;
        else lineEnd += 1;

        this.textarea.selectionStart = lineStart;
        this.textarea.selectionEnd = lineEnd;
        this.updateActiveLine();
    }

    toggleBlockComment() {
        const val = this.textarea.value;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        if (start === end) return;

        const selected = val.substring(start, end);
        const isPy = (this.language === 'python' || this.language === 'py');

        this.recordHistory();
        if (isPy) {
            if (selected.startsWith('"""\n') && selected.endsWith('\n"""')) {
                const unwrap = selected.substring(4, selected.length - 4);
                this.textarea.value = val.substring(0, start) + unwrap + val.substring(end);
                this.textarea.selectionStart = start;
                this.textarea.selectionEnd = start + unwrap.length;
            } else {
                const wrap = '"""\n' + selected + '\n"""';
                this.textarea.value = val.substring(0, start) + wrap + val.substring(end);
                this.textarea.selectionStart = start;
                this.textarea.selectionEnd = start + wrap.length;
            }
        } else {
            if (selected.startsWith('/*') && selected.endsWith('*/')) {
                const unwrap = selected.substring(2, selected.length - 2).trim();
                this.textarea.value = val.substring(0, start) + unwrap + val.substring(end);
                this.textarea.selectionStart = start;
                this.textarea.selectionEnd = start + unwrap.length;
            } else {
                const wrap = '/* ' + selected + ' */';
                this.textarea.value = val.substring(0, start) + wrap + val.substring(end);
                this.textarea.selectionStart = start;
                this.textarea.selectionEnd = start + wrap.length;
            }
        }
        this.updateHighlighting();
        this.updateLineNumbers();
        this.updateActiveLine();
    }

    joinLines() {
        const val = this.textarea.value;
        const pos = this.textarea.selectionStart;
        const lineEnd = val.indexOf('\n', pos);
        if (lineEnd === -1) return;

        let nextLineEnd = val.indexOf('\n', lineEnd + 1);
        if (nextLineEnd === -1) nextLineEnd = val.length;

        const nextLine = val.substring(lineEnd + 1, nextLineEnd).trimStart();
        this.recordHistory();
        this.textarea.value = val.substring(0, lineEnd) + ' ' + nextLine + val.substring(nextLineEnd);
        this.textarea.selectionStart = this.textarea.selectionEnd = lineEnd + 1;
        this.updateHighlighting();
        this.updateLineNumbers();
        this.updateActiveLine();
    }

    transformCase(isUpper) {
        const val = this.textarea.value;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        if (start === end) return;

        const selected = val.substring(start, end);
        const transformed = isUpper ? selected.toUpperCase() : selected.toLowerCase();
        this.recordHistory();
        this.textarea.value = val.substring(0, start) + transformed + val.substring(end);
        this.textarea.selectionStart = start;
        this.textarea.selectionEnd = start + transformed.length;
        this.updateHighlighting();
    }

    handleEnter() {
        const val = this.textarea.value;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;

        const curLineStart = val.lastIndexOf('\n', start - 1) + 1;
        const curLine = val.substring(curLineStart, start);
        const indentMatch = curLine.match(/^\s*/);
        const indent = indentMatch ? indentMatch[0] : "";

        const trimmedLine = curLine.trim();
        const extraIndent = (trimmedLine.endsWith('{') || trimmedLine.endsWith(':')) ? "    " : "";

        const nextChar = val[start];
        let insertStr = "\n" + indent + extraIndent;

        if (trimmedLine.endsWith('{') && nextChar === '}') {
            insertStr = "\n" + indent + extraIndent + "\n" + indent;
            this.textarea.value = val.substring(0, start) + insertStr + val.substring(end);
            this.textarea.selectionStart = this.textarea.selectionEnd = start + indent.length + extraIndent.length + 1;
        } else {
            this.textarea.value = val.substring(0, start) + insertStr + val.substring(end);
            this.textarea.selectionStart = this.textarea.selectionEnd = start + insertStr.length;
        }

        this.updateHighlighting();
        this.updateLineNumbers();
        this.updateActiveLine();
    }

    handleKeyDown(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
        const altKey = e.altKey;
        const shiftKey = e.shiftKey;

        // F1: Open Keyboard Shortcuts Sheet
        if (e.key === 'F1') {
            e.preventDefault();
            if (this.options.onShowShortcuts) this.options.onShowShortcuts();
            return;
        }

        // Run Shortcut: Cmd+Enter (Mac) / Ctrl+Enter (Win) or Ctrl+' (LeetCode)
        if ((cmdOrCtrl && !altKey && !shiftKey && e.key === 'Enter') || (e.ctrlKey && e.key === "'")) {
            e.preventDefault();
            this.options.onRun();
            return;
        }

        // Submit Shortcut: Cmd+Alt+Enter / Ctrl+Alt+Enter
        if (cmdOrCtrl && altKey && e.key === 'Enter') {
            e.preventDefault();
            this.options.onSubmit();
            return;
        }

        // Pick Random Problem: Option+R (Mac) / Alt+R (Win)
        if (altKey && !cmdOrCtrl && !shiftKey && (e.key === 'r' || e.key === 'R' || e.code === 'KeyR')) {
            e.preventDefault();
            if (this.options.onPickRandom) this.options.onPickRandom();
            return;
        }

        // Escape: Close Find Widget
        if (e.key === 'Escape' && this.findWidget && this.findWidget.style.display !== 'none') {
            e.preventDefault();
            this.closeFind();
            return;
        }

        // Find in Code: Cmd+F (Mac) / Ctrl+F (Win)
        if (cmdOrCtrl && !altKey && !shiftKey && (e.key === 'f' || e.key === 'F')) {
            e.preventDefault();
            this.openFind(false);
            return;
        }

        // Find & Replace: Cmd+H (Mac) / Ctrl+H (Win)
        if (cmdOrCtrl && !altKey && !shiftKey && (e.key === 'h' || e.key === 'H')) {
            e.preventDefault();
            this.openFind(true);
            return;
        }

        // Find Next: F3 or Cmd+G (Mac) / Ctrl+G (Win)
        if ((!cmdOrCtrl && !altKey && !shiftKey && e.key === 'F3') || (cmdOrCtrl && !altKey && !shiftKey && (e.key === 'g' || e.key === 'G'))) {
            e.preventDefault();
            this.findNext();
            return;
        }

        // Find Prev: Shift+F3 or Cmd+Shift+G (Mac) / Ctrl+Shift+G (Win)
        if ((!cmdOrCtrl && !altKey && shiftKey && e.key === 'F3') || (cmdOrCtrl && !altKey && shiftKey && (e.key === 'g' || e.key === 'G'))) {
            e.preventDefault();
            this.findPrev();
            return;
        }

        // Move Line(s) UP: Option+ArrowUp (Mac) / Alt+ArrowUp (Win)
        if (altKey && !shiftKey && !cmdOrCtrl && e.key === 'ArrowUp') {
            e.preventDefault();
            this.recordHistory();
            this.moveLines(-1);
            return;
        }

        // Move Line(s) DOWN: Option+ArrowDown (Mac) / Alt+ArrowDown (Win)
        if (altKey && !shiftKey && !cmdOrCtrl && e.key === 'ArrowDown') {
            e.preventDefault();
            this.recordHistory();
            this.moveLines(1);
            return;
        }

        // Duplicate Line(s) UP: Shift+Option+ArrowUp (Mac) / Shift+Alt+ArrowUp (Win)
        if (altKey && shiftKey && !cmdOrCtrl && e.key === 'ArrowUp') {
            e.preventDefault();
            this.recordHistory();
            this.copyLines(-1);
            return;
        }

        // Duplicate Line(s) DOWN: Shift+Option+ArrowDown (Mac) / Shift+Alt+ArrowDown (Win)
        if (altKey && shiftKey && !cmdOrCtrl && e.key === 'ArrowDown') {
            e.preventDefault();
            this.recordHistory();
            this.copyLines(1);
            return;
        }

        // Insert Line Below: Option+Enter (Mac) / Alt+Enter (Win) or Cmd+Shift+O
        if ((altKey && !shiftKey && !cmdOrCtrl && e.key === 'Enter') || (cmdOrCtrl && shiftKey && !altKey && (e.key === 'o' || e.key === 'O'))) {
            e.preventDefault();
            this.insertLineBelow();
            return;
        }

        // Insert Line Above: Cmd+Shift+Enter (Mac) / Ctrl+Shift+Enter (Win)
        if (cmdOrCtrl && shiftKey && !altKey && e.key === 'Enter') {
            e.preventDefault();
            this.insertLineAbove();
            return;
        }

        // Delete Line: Cmd+Shift+K (Mac) / Ctrl+Shift+K (Win)
        if (cmdOrCtrl && shiftKey && !altKey && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            this.recordHistory();
            this.deleteLine();
            return;
        }

        // Select Current Line: Cmd+L (Mac) / Ctrl+L (Win)
        if (cmdOrCtrl && !altKey && !shiftKey && (e.key === 'l' || e.key === 'L')) {
            e.preventDefault();
            this.selectLine();
            return;
        }

        // Select Word / Next Occurrence: Cmd+D (Mac) / Ctrl+D (Win)
        if (cmdOrCtrl && !altKey && !shiftKey && (e.key === 'd' || e.key === 'D')) {
            e.preventDefault();
            this.selectWordOrNextOccurrence();
            return;
        }

        // Toggle Line Comment: Cmd+/ (Mac) / Ctrl+/ (Win)
        if (cmdOrCtrl && !altKey && !shiftKey && (e.key === '/' || e.code === 'Slash')) {
            e.preventDefault();
            this.recordHistory();
            this.toggleComment();
            return;
        }

        // Toggle Block Comment: Shift+Option+A (Mac) / Shift+Alt+A (Win)
        if (altKey && shiftKey && !cmdOrCtrl && (e.key === 'a' || e.key === 'A')) {
            e.preventDefault();
            this.toggleBlockComment();
            return;
        }

        // Indent Line(s) with Bracket: Cmd+] (Mac) / Ctrl+] (Win)
        if (cmdOrCtrl && !altKey && !shiftKey && (e.key === ']' || e.code === 'BracketRight')) {
            e.preventDefault();
            this.recordHistory();
            this.handleTab(false);
            return;
        }

        // Outdent Line(s) with Bracket: Cmd+[ (Mac) / Ctrl+[ (Win)
        if (cmdOrCtrl && !altKey && !shiftKey && (e.key === '[' || e.code === 'BracketLeft')) {
            e.preventDefault();
            this.recordHistory();
            this.handleTab(true);
            return;
        }

        // Join Lines: Ctrl+J (Mac / Win)
        if (e.ctrlKey && !altKey && !shiftKey && (e.key === 'j' || e.key === 'J')) {
            e.preventDefault();
            this.joinLines();
            return;
        }

        // Transform UPPERCASE: Cmd+Shift+U (Mac) / Ctrl+Shift+U (Win)
        if (cmdOrCtrl && shiftKey && !altKey && (e.key === 'u' || e.key === 'U')) {
            e.preventDefault();
            this.transformCase(true);
            return;
        }

        // Transform lowercase: Cmd+Shift+Y (Mac) / Ctrl+Shift+Y (Win)
        if (cmdOrCtrl && shiftKey && !altKey && (e.key === 'y' || e.key === 'Y')) {
            e.preventDefault();
            this.transformCase(false);
            return;
        }

        // Undo: Cmd+Z (Mac) / Ctrl+Z (Win)
        if (cmdOrCtrl && !shiftKey && !altKey && (e.key === 'z' || e.key === 'Z')) {
            if (this.undo()) {
                e.preventDefault();
                return;
            }
        }

        // Redo: Cmd+Shift+Z or Cmd+Y (Mac) / Ctrl+Y or Ctrl+Shift+Z (Win)
        if ((cmdOrCtrl && shiftKey && !altKey && (e.key === 'z' || e.key === 'Z')) ||
            (cmdOrCtrl && !shiftKey && !altKey && (e.key === 'y' || e.key === 'Y'))) {
            if (this.redo()) {
                e.preventDefault();
                return;
            }
        }

        // Standard clipboard keys (Cmd+C, Cmd+V, Cmd+X, Cmd+A) - allow native browser handling
        if (cmdOrCtrl && ['c', 'C', 'v', 'V', 'x', 'X', 'a', 'A'].includes(e.key)) {
            return;
        }

        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const val = this.textarea.value;

        // Tab handling (multi-line indent / outdent)
        if (e.key === 'Tab') {
            e.preventDefault();
            this.recordHistory();
            this.handleTab(e.shiftKey);
            return;
        }

        // Auto-indent on Enter
        if (e.key === 'Enter') {
            e.preventDefault();
            this.recordHistory();
            this.handleEnter();
            return;
        }

        // Auto-close brackets & quotes (only when not holding Cmd/Ctrl or Alt)
        if (!cmdOrCtrl && !altKey) {
            const pairs = {
                '(': ')',
                '[': ']',
                '{': '}',
                '"': '"',
                "'": "'"
            };

            if (pairs[e.key]) {
                const closeChar = pairs[e.key];
                if (start !== end) {
                    e.preventDefault();
                    this.recordHistory();
                    const selected = val.substring(start, end);
                    this.textarea.value = val.substring(0, start) + e.key + selected + closeChar + val.substring(end);
                    this.textarea.selectionStart = start + 1;
                    this.textarea.selectionEnd = end + 1;
                    this.updateHighlighting();
                    return;
                }

                if ((e.key === '"' || e.key === "'") && val[start] === e.key) {
                    e.preventDefault();
                    this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
                    return;
                }

                e.preventDefault();
                this.recordHistory();
                this.textarea.value = val.substring(0, start) + e.key + closeChar + val.substring(end);
                this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
                this.updateHighlighting();
                return;
            }

            if ([')', ']', '}'].includes(e.key) && val[start] === e.key) {
                e.preventDefault();
                this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
                return;
            }

            if (e.key === 'Backspace' && start === end && start > 0) {
                const prevChar = val[start - 1];
                const nextChar = val[start];
                if (pairs[prevChar] === nextChar) {
                    e.preventDefault();
                    this.recordHistory();
                    this.textarea.value = val.substring(0, start - 1) + val.substring(start + 1);
                    this.textarea.selectionStart = this.textarea.selectionEnd = start - 1;
                    this.updateHighlighting();
                    this.updateLineNumbers();
                    return;
                }
            }
        }
    }

    setValue(text) {
        this.textarea.value = text;
        this.updateHighlighting();
        this.updateLineNumbers();
    }

    getValue() {
        return this.textarea.value;
    }

    setFontSize(size) {
        const lineHeights = {
            '12px': '18px',
            '13px': '20px',
            '14px': '22px',
            '16px': '24px'
        };
        this.currentLineHeight = lineHeights[size] || '20px';
        this.currentFontSize = size;

        this.container.style.fontSize = size;
        this.textarea.style.fontSize = size;
        this.textarea.style.lineHeight = this.currentLineHeight;
        this.highlightLayer.style.fontSize = size;
        this.highlightLayer.style.lineHeight = this.currentLineHeight;
        this.gutter.style.fontSize = size;

        this.gutter.querySelectorAll('.gutter-line').forEach(el => {
            el.style.height = this.currentLineHeight;
            el.style.lineHeight = this.currentLineHeight;
            el.style.fontSize = size;
        });
    }

    updateLineNumbers() {
        const lines = this.textarea.value.split('\n').length;
        const lh = this.currentLineHeight || '20px';
        const fs = this.currentFontSize || '13px';
        let html = '';
        for (let i = 1; i <= lines; i++) {
            html += `<div class="gutter-line" data-line="${i}" style="height: ${lh}; line-height: ${lh}; font-size: ${fs};">${i}</div>`;
        }
        this.gutter.innerHTML = html;
        this.updateActiveLine();
    }

    updateActiveLine() {
        const pos = this.textarea.selectionStart || 0;
        const currentLine = this.textarea.value.substring(0, pos).split('\n').length;
        this.gutter.querySelectorAll('.gutter-line').forEach(el => {
            const lineNum = parseInt(el.dataset.line, 10);
            el.classList.toggle('active', lineNum === currentLine);
        });
    }

    setLanguage(lang) {
        this.language = (lang || 'cpp').toLowerCase();
        this.updateHighlighting();
    }

    updateHighlighting() {
        const text = this.textarea.value;
        const lang = this.language || 'cpp';
        let highlighted = '';

        if (lang === 'python' || lang === 'py') {
            highlighted = this.highlightPython(text);
        } else if (lang === 'java') {
            highlighted = this.highlightJava(text);
        } else if (lang === 'csharp' || lang === 'cs') {
            highlighted = this.highlightCSharp(text);
        } else {
            highlighted = this.highlightCPP(text);
        }

        this.highlightLayer.innerHTML = highlighted + '\n';
    }

    escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    highlightPython(code) {
        const keywords = new Set([
            'def', 'class', 'self', 'return', 'if', 'elif', 'else', 'for', 'while',
            'in', 'not', 'is', 'and', 'or', 'import', 'from', 'as', 'try', 'except',
            'finally', 'raise', 'pass', 'lambda', 'yield', 'with', 'global', 'nonlocal',
            'assert', 'break', 'continue', 'del', 'async', 'await'
        ]);

        const builtins = new Set([
            'print', 'len', 'range', 'min', 'max', 'sum', 'sorted', 'reversed',
            'list', 'dict', 'set', 'tuple', 'int', 'str', 'float', 'bool',
            'enumerate', 'zip', 'map', 'filter', 'any', 'all', 'isinstance',
            'abs', 'round', 'pow', 'TreeNode', 'List', 'Optional', 'Dict', 'Set', 'Tuple'
        ]);

        const literals = new Set(['True', 'False', 'None']);

        let html = '';
        let i = 0;
        const n = code.length;

        while (i < n) {
            const ch = code[i];

            // Comment
            if (ch === '#') {
                let start = i;
                while (i < n && code[i] !== '\n') i++;
                html += `<span class="hl-comment">${this.escapeHTML(code.substring(start, i))}</span>`;
                continue;
            }

            // Triple quote strings
            if ((ch === '"' || ch === "'") && code.substr(i, 3) === ch.repeat(3)) {
                const quote = ch.repeat(3);
                let start = i;
                i += 3;
                while (i < n && code.substr(i, 3) !== quote) i++;
                if (i < n) i += 3;
                html += `<span class="hl-string">${this.escapeHTML(code.substring(start, i))}</span>`;
                continue;
            }

            // Single quote string
            if (ch === '"' || ch === "'") {
                const quote = ch;
                let start = i;
                i++;
                while (i < n && code[i] !== quote) {
                    if (code[i] === '\\' && i + 1 < n) i += 2;
                    else i++;
                }
                if (i < n) i++;
                html += `<span class="hl-string">${this.escapeHTML(code.substring(start, i))}</span>`;
                continue;
            }

            // Numbers
            if (/\d/.test(ch) && (i === 0 || !/[a-zA-Z0-9_]/.test(code[i - 1]))) {
                let start = i;
                while (i < n && /[0-9\.eExX_]/.test(code[i])) i++;
                html += `<span class="hl-number">${this.escapeHTML(code.substring(start, i))}</span>`;
                continue;
            }

            // Words
            if (/[a-zA-Z_]/.test(ch)) {
                let start = i;
                while (i < n && /[a-zA-Z0-9_]/.test(code[i])) i++;
                const word = code.substring(start, i);

                let j = i;
                while (j < n && code[j] === ' ') j++;
                const isFn = (code[j] === '(' && !keywords.has(word));

                if (keywords.has(word)) {
                    html += `<span class="hl-keyword">${this.escapeHTML(word)}</span>`;
                } else if (literals.has(word)) {
                    html += `<span class="hl-number">${this.escapeHTML(word)}</span>`;
                } else if (builtins.has(word)) {
                    html += `<span class="hl-type">${this.escapeHTML(word)}</span>`;
                } else if (isFn) {
                    html += `<span class="hl-function">${this.escapeHTML(word)}</span>`;
                } else {
                    html += this.escapeHTML(word);
                }
                continue;
            }

            if (['{', '}', '(', ')', '[', ']'].includes(ch)) {
                html += `<span class="hl-bracket">${this.escapeHTML(ch)}</span>`;
                i++;
                continue;
            }

            html += this.escapeHTML(ch);
            i++;
        }
        return html;
    }

    highlightJava(code) {
        const keywords = new Set([
            'class', 'public', 'private', 'protected', 'static', 'final', 'abstract',
            'void', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
            'default', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'throws',
            'new', 'null', 'true', 'false', 'this', 'super', 'extends', 'implements',
            'package', 'import', 'instanceof', 'interface', 'enum', 'record'
        ]);

        const types = new Set([
            'int', 'long', 'short', 'byte', 'char', 'float', 'double', 'boolean',
            'String', 'Integer', 'Long', 'Boolean', 'Double', 'List', 'ArrayList',
            'Map', 'HashMap', 'TreeMap', 'Set', 'HashSet', 'TreeSet', 'Queue', 'Deque',
            'LinkedList', 'PriorityQueue', 'Stack', 'Collections', 'Arrays', 'Math',
            'TreeNode', 'System', 'PrintStream', 'ByteArrayOutputStream'
        ]);

        return this.tokenizeCStyle(code, keywords, types);
    }

    highlightCSharp(code) {
        const keywords = new Set([
            'using', 'namespace', 'class', 'public', 'private', 'protected', 'internal',
            'static', 'readonly', 'const', 'void', 'return', 'if', 'else', 'for', 'foreach',
            'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'try',
            'catch', 'finally', 'throw', 'new', 'null', 'true', 'false', 'this',
            'base', 'var', 'async', 'await', 'get', 'set', 'override', 'virtual',
            'struct', 'interface', 'enum', 'in', 'out', 'ref'
        ]);

        const types = new Set([
            'int', 'long', 'short', 'byte', 'char', 'float', 'double', 'bool', 'string',
            'object', 'decimal', 'List', 'Dictionary', 'HashSet', 'Queue', 'Stack',
            'IList', 'IDictionary', 'ISet', 'IEnumerable', 'Math', 'Console', 'TreeNode'
        ]);

        return this.tokenizeCStyle(code, keywords, types);
    }

    tokenizeCStyle(code, keywords, types) {
        let html = '';
        let i = 0;
        const n = code.length;

        while (i < n) {
            const ch = code[i];

            // Single line comment
            if (ch === '/' && code[i + 1] === '/') {
                let start = i;
                while (i < n && code[i] !== '\n') i++;
                html += `<span class="hl-comment">${this.escapeHTML(code.substring(start, i))}</span>`;
                continue;
            }

            // Multi line comment
            if (ch === '/' && code[i + 1] === '*') {
                let start = i;
                i += 2;
                while (i < n && !(code[i - 1] === '*' && code[i] === '/')) i++;
                if (i < n) i++;
                html += `<span class="hl-comment">${this.escapeHTML(code.substring(start, i))}</span>`;
                continue;
            }

            // String
            if (ch === '"' || ch === "'") {
                const quote = ch;
                let start = i;
                i++;
                while (i < n && code[i] !== quote) {
                    if (code[i] === '\\' && i + 1 < n) i += 2;
                    else i++;
                }
                if (i < n) i++;
                html += `<span class="hl-string">${this.escapeHTML(code.substring(start, i))}</span>`;
                continue;
            }

            // Numbers
            if (/\d/.test(ch) && (i === 0 || !/[a-zA-Z0-9_]/.test(code[i - 1]))) {
                let start = i;
                while (i < n && /[0-9\.eExXa-fA-FLfFdD]/.test(code[i])) i++;
                html += `<span class="hl-number">${this.escapeHTML(code.substring(start, i))}</span>`;
                continue;
            }

            // Words
            if (/[a-zA-Z_]/.test(ch)) {
                let start = i;
                while (i < n && /[a-zA-Z0-9_]/.test(code[i])) i++;
                const word = code.substring(start, i);

                let j = i;
                while (j < n && code[j] === ' ') j++;
                const isFn = (code[j] === '(' && !keywords.has(word));

                if (keywords.has(word)) {
                    html += `<span class="hl-keyword">${this.escapeHTML(word)}</span>`;
                } else if (types.has(word)) {
                    html += `<span class="hl-type">${this.escapeHTML(word)}</span>`;
                } else if (isFn) {
                    html += `<span class="hl-function">${this.escapeHTML(word)}</span>`;
                } else {
                    html += this.escapeHTML(word);
                }
                continue;
            }

            if (['{', '}', '(', ')', '[', ']'].includes(ch)) {
                html += `<span class="hl-bracket">${this.escapeHTML(ch)}</span>`;
                i++;
                continue;
            }

            html += this.escapeHTML(ch);
            i++;
        }
        return html;
    }

    highlightCPP(code) {
        // C++ Syntax Tokenizer
        const tokens = [];
        let i = 0;
        const n = code.length;

        const keywords = new Set([
            'class', 'public', 'private', 'protected', 'struct', 'union', 'enum',
            'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
            'break', 'continue', 'goto', 'try', 'catch', 'throw', 'new', 'delete',
            'nullptr', 'true', 'false', 'sizeof', 'typedef', 'using', 'namespace',
            'template', 'typename', 'const', 'static', 'inline', 'virtual', 'explicit',
            'friend', 'override', 'final', 'auto', 'decltype'
        ]);

        const types = new Set([
            'int', 'long', 'short', 'char', 'float', 'double', 'bool', 'void',
            'size_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t', 'uint8_t', 'uint32_t', 'uint64_t',
            'string', 'vector', 'map', 'set', 'unordered_map', 'unordered_set',
            'queue', 'deque', 'priority_queue', 'stack', 'pair', 'tuple', 'list',
            'TreeNode', 'ListNode', 'stringstream', 'ostringstream', 'istringstream', 'streambuf'
        ]);

        let html = '';

        while (i < n) {
            const ch = code[i];

            // Single line comment
            if (ch === '/' && code[i + 1] === '/') {
                let start = i;
                while (i < n && code[i] !== '\n') i++;
                html += `<span class="hl-comment">${this.escapeHTML(code.substring(start, i))}</span>`;
                continue;
            }

            // Multi line comment
            if (ch === '/' && code[i + 1] === '*') {
                let start = i;
                i += 2;
                while (i < n && !(code[i - 1] === '*' && code[i] === '/')) i++;
                if (i < n) i++;
                html += `<span class="hl-comment">${this.escapeHTML(code.substring(start, i))}</span>`;
                continue;
            }

            // Preprocessor
            if (ch === '#' && (i === 0 || code[i - 1] === '\n')) {
                let start = i;
                while (i < n && code[i] !== '\n') i++;
                html += `<span class="hl-preprocessor">${this.escapeHTML(code.substring(start, i))}</span>`;
                continue;
            }

            // String literal
            if (ch === '"' || ch === "'") {
                const quote = ch;
                let start = i;
                i++;
                while (i < n && code[i] !== quote) {
                    if (code[i] === '\\' && i + 1 < n) i += 2;
                    else i++;
                }
                if (i < n) i++; // closing quote
                html += `<span class="hl-string">${this.escapeHTML(code.substring(start, i))}</span>`;
                continue;
            }

            // Numbers
            if (/\d/.test(ch) && (i === 0 || !/[a-zA-Z0-9_]/.test(code[i - 1]))) {
                let start = i;
                while (i < n && /[0-9\.eExXa-fA-F]/.test(code[i])) i++;
                html += `<span class="hl-number">${this.escapeHTML(code.substring(start, i))}</span>`;
                continue;
            }

            // Identifiers / Keywords / Types
            if (/[a-zA-Z_]/.test(ch)) {
                let start = i;
                while (i < n && /[a-zA-Z0-9_]/.test(code[i])) i++;
                const word = code.substring(start, i);

                // Lookahead to check if it's a function call e.g. fn(...)
                let j = i;
                while (j < n && code[j] === ' ') j++;
                const isFn = (code[j] === '(' && !keywords.has(word));

                if (keywords.has(word)) {
                    html += `<span class="hl-keyword">${this.escapeHTML(word)}</span>`;
                } else if (types.has(word)) {
                    html += `<span class="hl-type">${this.escapeHTML(word)}</span>`;
                } else if (isFn) {
                    html += `<span class="hl-function">${this.escapeHTML(word)}</span>`;
                } else {
                    html += this.escapeHTML(word);
                }
                continue;
            }

            // Brackets
            if (['{', '}', '(', ')', '[', ']'].includes(ch)) {
                html += `<span class="hl-bracket">${this.escapeHTML(ch)}</span>`;
                i++;
                continue;
            }

            // Plain char
            html += this.escapeHTML(ch);
            i++;
        }

        return html;
    }
}
