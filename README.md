# ⚡ GCC Code - Multi-Language LeetCode Practice Platform

A full-featured, high-performance coding practice platform modeled after **LeetCode**, supporting **C++ (GCC/Clang)**, **Java (OpenJDK 21)**, **Python 3 (Python 3.14)**, and **C# (.NET / Mono)** for practicing all 27 questions from [`practice_problems.json`](./practice_problems.json).

---

## 🌟 Supported Compilers & Runtimes

| Language | Engine / Compiler | Status | Command |
|---|---|---|---|
| **C++** | Apple Clang / GCC 14 (`-O2 -std=c++17`) | ✅ Installed & Ready | `g++ -O2 -std=c++17 -Wall` |
| **Java** | OpenJDK 21.0.11 | ✅ Installed & Ready | `javac Main.java && java Main` |
| **Python 3** | Python 3.14.7 | ✅ Installed & Ready | `python3 solution.py` |
| **C#** | .NET SDK / Mono | 📦 Optional (`brew install --cask dotnet-sdk`) | `dotnet` / `mcs` |

---

## 🌟 Key Features

### 1. 🖥️ Authentic LeetCode Dark Theme & UI
- **Multi-Language Selector**: Seamlessly switch between **C++**, **Java**, **Python 3**, and **C#** from the editor toolbar.
- **Language-Specific Starter Code**: Each question includes tailored starter templates for all 4 languages.
- **Independent Auto-Save**: Your code for each problem and each language is saved independently to `localStorage` so switching languages never overwrites your progress.
- **Resizable Split Workspace**: Draggable horizontal and vertical dividers.
- **Problem Set Explorer**: Filter by topic, difficulty (*Easy, Medium, Hard*), and status (*Solved, Attempted, Todo*).
- **Navigation Controls**: Prev / Next buttons and **"🔀 Pick Random"** dropdown picker:
  - **All Questions**: Pick a random problem from the entire 27-question catalog.
  - **Unsolved Only**: Pick only from your remaining unsolved questions (automatically hidden when all questions are solved!).
  - **Quick Shortcut**: Press `⌥R` (Mac) or `Alt+R` (Windows) to instantly pick without opening the menu.

### 2. ⚡ Multi-Language Judge Engine
- **Accurate Profiler**: Measures sub-millisecond execution runtime using high-resolution native timers.
- **`stdout` Debugger Capture**: Any debug print statements (`std::cout`, `System.out.println`, `print()`) are captured and displayed in the console's STDOUT panel.
- **Custom In-Memory Tree & Container Deserializers**: Automatically converts preorder `-1` representations to `TreeNode` objects in C++, Java, and Python.
- **Custom Validator**: Validates BST invariants, height-balance, and inorder traversal for `sorted-array-to-balanced-bst` across all languages.
- **Line-Mapped Compiler Diagnostics**: Compiler error line numbers in C++, Java, and Python are remapped to match your editor directly.

### 3. 📝 Interactive Code Editor
- **Multi-Language Syntax Highlighting**: Specialized highlighters for C++, Java, Python, and C#.
- **Line Numbers with Active Line Tracking**: Synchronized gutter line numbers with active cursor illumination.
- **Smart Indentation**: Auto-indents 4 spaces on `Enter` after `{`, `:`, etc.
- **Bracket Auto-Closing**: Automatically pairs `()`, `{}`, `[]`, `""`, and `''`.
- **Keyboard Shortcuts (VS Code & LeetCode style)**:
  - `Option + ↑` / `Alt + ↑`: Move current line or selected lines **UP**
  - `Option + ↓` / `Alt + ↓`: Move current line or selected lines **DOWN**
  - `Shift + Option + ↑` / `Shift + Alt + ↑`: Duplicate current line(s) **UP**
  - `Shift + Option + ↓` / `Shift + Alt + ↓`: Duplicate current line(s) **DOWN**
  - `Cmd + /` / `Ctrl + /`: Toggle line comment (`//` in C++/Java/C#, `#` in Python)
  - `Cmd + D` / `Ctrl + D`: Select word / next occurrence
  - `Cmd + Shift + K` / `Ctrl + Shift + K`: Delete current line
  - `Cmd + C` / `Ctrl + C`: Copy selection (or **entire line** when nothing is selected)
  - `Cmd + X` / `Ctrl + X`: Cut selection (or **entire line** when nothing is selected)
  - `Cmd + V` / `Ctrl + V`: Paste
  - `Cmd + Z` / `Ctrl + Z`: Undo
  - `Cmd + Shift + Z` / `Cmd + Y`: Redo
  - `Tab` / `Shift + Tab`: Multi-line indent / outdent
  - `Ctrl + Enter` (or `Cmd + Enter`): **Run Code** on test cases
  - `Ctrl + Alt + Enter` (or `Cmd + Alt + Enter`): **Submit** to judge
  - `Alt + R` (or `Option + R`): **Pick Random Question** (uses preferred pool: unsolved / all)

### 4. 🧪 Testcase Console & Test Suite
- **Interactive Testcase Editor**: Switch between Case 1, Case 2, or click **"+ Custom"** to add custom inputs.
- **Automatic Reference Solver**: For custom testcases, the platform computes the expected output using verified reference solutions.
- **163 Comprehensive Test Cases**: Hidden edge cases (minimal constraints, zero, primes, large values, skewed trees) for thorough evaluation upon submission.

---

## 🚀 Getting Started

### Run the Server
Simply execute:
```bash
./run.sh
```
You can also specify a custom port:
```bash
./run.sh 8085
# or
./run.sh 3000
```
Or start directly with Python:
```bash
python3 backend/app.py 8085
```

Open your browser and navigate to:
👉 **`http://localhost:8085`**
*(Note: If the requested port is in use, the server automatically switches to the next available free port!)*

---

## 📊 Problem Set Summary (27 Questions)

| # | Title | Topic | Difficulty | Parameters |
|---|---|---|---|---|
| 1 | Find Leaves of Binary Tree | Trees | Medium | `findLeaves(TreeNode A)` |
| 2 | Tower of Hanoi | Recursion | Easy | `towerOfHanoi(int A)` |
| 3 | Check Palindrome using Recursion | Recursion | Easy | `isPalindrome(String A)` |
| 4 | Count Good Subsequences | Math / Combinatorics | Hard | `countGoodSubsequences(A)` |
| 5 | Compute nCr % m | Math / Combinatorics | Medium | `solve(int A, int B, int C)` |
| 6 | Grid Unique Paths | Math / Combinatorics | Medium | `uniquePaths(int A, int B)` |
| 7 | Pascal Triangle | Math / Combinatorics | Easy | `solve(int A)` |
| 8 | Consecutive Numbers Sum | Math | Hard | `solve(int A)` |
| 9 | Sorted Permutation Rank | Math / Combinatorics | Medium | `findRank(String A)` |
| 10 | Combinations | Recursion / Backtracking | Medium | `combine(int A, int B)` |
| 11 | Excel Column Title | Math / Strings | Easy | `convertToTitle(int A)` |
| 12 | Very Large Power | Math / Modular Arithmetic | Medium | `solve(int A, int B)` |
| 13 | Compute nCr % p | Math / Combinatorics | Hard | `solve(int A, int B, int C)` |
| 14 | Prime Modulo Inverse | Math / Modular Arithmetic | Medium | `solve(int A, int B)` |
| 15 | Yet another MATRIX question !! | Math / Combinatorics | Medium | `solve(int A, int B)` |
| 16 | Excel Column Number | Math / Strings | Easy | `titleToNumber(String A)` |
| 17 | Sorted Permutation Rank with Repeats | Math / Combinatorics | Hard | `findRank(String A)` |
| 18 | Ath Magical Number | Binary Search / Math | Hard | `solve(int A, int B, int C)` |
| 19 | Sorted Array To Balanced BST | Trees / BST | Easy | `sortedArrayToBST(A)` *(Custom Validator)* |
| 20 | Check for BST with One Child | Trees / BST | Medium | `solve(A)` |
| 21 | Search in BST | Trees / BST | Easy | `solve(TreeNode A, int B)` |
| 22 | Valid Binary Search Tree | Trees / BST | Medium | `isValidBST(TreeNode A)` |
| 23 | Largest BST Subtree | Trees / BST | Medium | `solve(TreeNode A)` |
| 24 | Delete a node in BST | Trees / BST | Medium | `deleteNode(TreeNode A, int B)` |
| 25 | Kth Smallest Element In BST | Trees / BST | Medium | `kthsmallest(TreeNode A, int B)` |
| 26 | Path to Given Node | Trees | Easy | `solve(TreeNode A, int B)` |
| 27 | Morris Inorder Traversal | Trees | Hard | `inorderTraversal(TreeNode A)` |
