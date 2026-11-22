import os
import re
import sys
import json
import uuid
import shutil
import tempfile
import subprocess
from pathlib import Path

# =====================================================================
# C++ JUDGE IMPLEMENTATION
# =====================================================================

CPP_TREENODE_DEF = """
#ifndef TREENODE_DEF
#define TREENODE_DEF
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode(int x) : val(x), left(NULL), right(NULL) {}
};
#endif
"""

CPP_HELPERS_DEF = """
// Tree helpers
TreeNode* parseTreePreorder(stringstream& ss) {
    string token;
    if (!(ss >> token) || token == "-1") return nullptr;
    try {
        TreeNode* root = new TreeNode(stoi(token));
        root->left = parseTreePreorder(ss);
        root->right = parseTreePreorder(ss);
        return root;
    } catch (...) {
        return nullptr;
    }
}

void serializeTreePreorder(TreeNode* root, ostringstream& ss) {
    if (!root) {
        ss << "-1 ";
        return;
    }
    ss << root->val << " ";
    serializeTreePreorder(root->left, ss);
    serializeTreePreorder(root->right, ss);
}

string treeToString(TreeNode* root) {
    ostringstream ss;
    serializeTreePreorder(root, ss);
    string res = ss.str();
    while (!res.empty() && res.back() == ' ') res.pop_back();
    return res;
}

// Vector helpers
vector<int> parseVectorInt(const string& s) {
    vector<int> res;
    int n = s.size();
    int i = 0;
    while (i < n) {
        if (s[i] == '-' || isdigit(s[i])) {
            int sign = 1;
            if (s[i] == '-') { sign = -1; i++; }
            long long val = 0;
            while (i < n && isdigit(s[i])) {
                val = val * 10 + (s[i] - '0');
                i++;
            }
            res.push_back(sign * val);
        } else {
            i++;
        }
    }
    return res;
}

string formatVectorInt(const vector<int>& v) {
    ostringstream ss;
    ss << "[";
    for (size_t i = 0; i < v.size(); ++i) {
        ss << v[i] << (i + 1 < v.size() ? ", " : "");
    }
    ss << "]";
    return ss.str();
}

// Matrix helpers
vector<vector<int>> parseMatrixInt(const string& s) {
    vector<vector<int>> res;
    int n = s.size();
    int i = 0;
    while (i < n) {
        if (s[i] == '[') {
            int start = i + 1;
            int count = 1;
            i++;
            while (i < n && count > 0) {
                if (s[i] == '[') count++;
                else if (s[i] == ']') count--;
                i++;
            }
            if (count == 0) {
                string inner = s.substr(start, (i - 1) - start);
                if (inner.find('[') == string::npos) {
                    if (inner.find_first_of("0123456789-") != string::npos) {
                        res.push_back(parseVectorInt(inner));
                    }
                }
            }
        } else {
            i++;
        }
    }
    return res;
}

string formatMatrixInt(const vector<vector<int>>& mat) {
    ostringstream ss;
    ss << "[";
    for (size_t i = 0; i < mat.size(); ++i) {
        ss << "[";
        for (size_t j = 0; j < mat[i].size(); ++j) {
            ss << mat[i][j] << (j + 1 < mat[i].size() ? ", " : "");
        }
        ss << "]" << (i + 1 < mat.size() ? ", " : "");
    }
    ss << "]";
    return ss.str();
}

string toJudgeString(int val) { return to_string(val); }
string toJudgeString(long long val) { return to_string(val); }
string toJudgeString(const string& val) { return val; }
string toJudgeString(const vector<int>& val) { return formatVectorInt(val); }
string toJudgeString(const vector<vector<int>>& val) { return formatMatrixInt(val); }
string toJudgeString(TreeNode* root) { return treeToString(root); }
"""

CPP_CUSTOM_VALIDATORS = """
bool isBSTCheck(TreeNode* root, long long minVal, long long maxVal) {
    if (!root) return true;
    if (root->val <= minVal || root->val >= maxVal) return false;
    return isBSTCheck(root->left, minVal, root->val) && isBSTCheck(root->right, root->val, maxVal);
}

int getHeightAndCheckBalanced(TreeNode* root, bool &balanced) {
    if (!root) return 0;
    int lh = getHeightAndCheckBalanced(root->left, balanced);
    int rh = getHeightAndCheckBalanced(root->right, balanced);
    if (abs(lh - rh) > 1) balanced = false;
    return 1 + max(lh, rh);
}

void getInorderSeq(TreeNode* root, vector<int>& seq) {
    if (!root) return;
    getInorderSeq(root->left, seq);
    seq.push_back(root->val);
    getInorderSeq(root->right, seq);
}
"""

def generate_cpp_harness(problem, user_code, testcases):
    fn = problem['function']
    fn_name = fn['name']
    params = fn['params']
    pid = problem['id']

    harness_lines = [
        "#include <iostream>", "#include <vector>", "#include <string>",
        "#include <sstream>", "#include <map>", "#include <set>",
        "#include <unordered_map>", "#include <unordered_set>", "#include <queue>",
        "#include <stack>", "#include <algorithm>", "#include <cmath>",
        "#include <chrono>", "#include <cctype>", "#include <climits>", "#include <cassert>",
        "using namespace std;\n",
        CPP_TREENODE_DEF,
        CPP_HELPERS_DEF
    ]

    if pid == 'sorted-array-to-balanced-bst':
        harness_lines.append(CPP_CUSTOM_VALIDATORS)

    harness_lines.append("// ================= USER CODE START =================")
    prefix_str = "\n".join(harness_lines) + "\n"
    user_code_line_offset = prefix_str.count('\n') + 1
    harness_lines.append(user_code)
    harness_lines.append("// ================= USER CODE END =================\n")

    harness_lines.append("int main(int argc, char* argv[]) {")
    harness_lines.append("    if (argc < 2) return 1;")
    harness_lines.append("    int case_idx = stoi(argv[1]);")
    harness_lines.append("    Solution sol;")
    harness_lines.append("    stringstream user_buf;")
    harness_lines.append("    streambuf* old_buf = cout.rdbuf(user_buf.rdbuf());\n")

    for i, tc in enumerate(testcases):
        inp = tc['input']
        harness_lines.append(f"    if (case_idx == {i}) {{")
        call_args = []
        for p in params:
            pname = p['name']
            ptype = p['type']
            raw_val = str(inp.get(pname, ''))
            var_name = f"arg_{pname}"

            if ptype == 'int':
                harness_lines.append(f"        int {var_name} = {int(raw_val)};")
                call_args.append(var_name)
            elif ptype == 'string':
                escaped = raw_val.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                harness_lines.append(f'        string {var_name} = "{escaped}";')
                call_args.append(var_name)
            elif ptype == 'int_array':
                escaped = raw_val.replace('\\', '\\\\').replace('"', '\\"')
                harness_lines.append(f'        vector<int> {var_name} = parseVectorInt("{escaped}");')
                call_args.append(var_name)
            elif ptype == 'binary_tree':
                escaped = raw_val.replace('\\', '\\\\').replace('"', '\\"')
                harness_lines.append(f'        stringstream ss_{var_name}("{escaped}");')
                harness_lines.append(f'        TreeNode* {var_name} = parseTreePreorder(ss_{var_name});')
                call_args.append(var_name)
            elif ptype in ('matrix', 'list<list<int>>'):
                escaped = raw_val.replace('\\', '\\\\').replace('"', '\\"')
                harness_lines.append(f'        vector<vector<int>> {var_name} = parseMatrixInt("{escaped}");')
                call_args.append(var_name)

        args_str = ", ".join(call_args)
        harness_lines.append("        auto start_clock = chrono::high_resolution_clock::now();")
        harness_lines.append(f"        auto result = sol.{fn_name}({args_str});")
        harness_lines.append("        auto end_clock = chrono::high_resolution_clock::now();")
        harness_lines.append("        double elapsed_ms = chrono::duration<double, milli>(end_clock - start_clock).count();")
        harness_lines.append("        cout.rdbuf(old_buf);")

        if pid == 'sorted-array-to-balanced-bst':
            harness_lines.append("        bool is_bst = isBSTCheck(result, -1e18, 1e18);")
            harness_lines.append("        bool balanced = true;")
            harness_lines.append("        getHeightAndCheckBalanced(result, balanced);")
            harness_lines.append("        vector<int> seq;")
            harness_lines.append("        getInorderSeq(result, seq);")
            harness_lines.append(f"        bool inorder_match = (seq == {call_args[0]});")
            harness_lines.append("        if (!is_bst) cout << \"__CUSTOM_VALIDATOR__:FAILED:Tree is not a valid Binary Search Tree\\n\";")
            harness_lines.append("        else if (!balanced) cout << \"__CUSTOM_VALIDATOR__:FAILED:Tree is not height-balanced\\n\";")
            harness_lines.append("        else if (!inorder_match) cout << \"__CUSTOM_VALIDATOR__:FAILED:Inorder traversal does not match input array\\n\";")
            harness_lines.append("        else cout << \"__CUSTOM_VALIDATOR__:PASSED\\n\";")

        harness_lines.append('        cout << "__USER_STDOUT_BEGIN__\\n" << user_buf.str() << "__USER_STDOUT_END__\\n";')
        harness_lines.append('        cout << "__JUDGE_OUTPUT_BEGIN__\\n" << toJudgeString(result) << "\\n__JUDGE_OUTPUT_END__\\n";')
        harness_lines.append('        cout << "__JUDGE_TIME_MS__:" << elapsed_ms << "\\n";')
        harness_lines.append("        return 0;")
        harness_lines.append("    }")

    harness_lines.append("    cout.rdbuf(old_buf);")
    harness_lines.append("    return 2;")
    harness_lines.append("}")

    return "\n".join(harness_lines), user_code_line_offset

def clean_cpp_compiler_output(stderr_text, src_path, user_line_offset):
    lines = stderr_text.splitlines()
    cleaned = []
    src_filename = os.path.basename(src_path)
    for line in lines:
        m = re.search(r'([^:\s]+):(\d+):(\d+):\s*(error|warning|note):\s*(.*)', line)
        m_code = re.match(r'^\s*(\d+)\s*\|(.*)', line)
        if m:
            filepath, line_no, col_no, level, msg = m.groups()
            line_int = int(line_no)
            user_line = line_int - user_line_offset + 1
            if user_line > 0:
                cleaned.append(f"Line {user_line}:{col_no}: {level}: {msg}")
            else:
                cleaned.append(f"{level}: {msg}")
        elif m_code:
            raw_l = int(m_code.group(1))
            user_l = raw_l - user_line_offset + 1
            if user_l > 0:
                cleaned.append(f"  {user_l:4d} |{m_code.group(2)}")
            else:
                cleaned.append(line)
        else:
            if src_path in line or src_filename in line:
                line = line.replace(src_path, "solution.cpp")
            cleaned.append(line)
    return "\n".join(cleaned[:50])

# =====================================================================
# JAVA JUDGE IMPLEMENTATION (OpenJDK 21)
# =====================================================================

JAVA_HELPERS = r"""
class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int x) { val = x; }
}

class JavaJudgeHelper {
    public static TreeNode parseTree(String s) {
        String[] tokens = s.trim().split("\\s+");
        int[] idx = {0};
        return buildTree(tokens, idx);
    }
    private static TreeNode buildTree(String[] tokens, int[] idx) {
        if (idx[0] >= tokens.length || tokens[idx[0]].equals("-1")) {
            idx[0]++;
            return null;
        }
        TreeNode node = new TreeNode(Integer.parseInt(tokens[idx[0]++]));
        node.left = buildTree(tokens, idx);
        node.right = buildTree(tokens, idx);
        return node;
    }

    public static String treeToString(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        serializeTree(root, sb);
        return sb.toString().trim();
    }
    private static void serializeTree(TreeNode root, StringBuilder sb) {
        if (root == null) {
            sb.append("-1 ");
            return;
        }
        sb.append(root.val).append(" ");
        serializeTree(root.left, sb);
        serializeTree(root.right, sb);
    }

    public static int[] parseVectorInt(String s) {
        s = s.replaceAll("[\\[\\]\\s]", "");
        if (s.isEmpty()) return new int[0];
        String[] parts = s.split(",");
        int[] arr = new int[parts.length];
        for (int i = 0; i < parts.length; i++) arr[i] = Integer.parseInt(parts[i].trim());
        return arr;
    }

    public static int[][] parseMatrixInt(String s) {
        List<int[]> rows = new ArrayList<>();
        int i = 0;
        int n = s.length();
        while (i < n) {
            if (s.charAt(i) == '[') {
                int start = i + 1;
                int count = 1;
                i++;
                while (i < n && count > 0) {
                    if (s.charAt(i) == '[') count++;
                    else if (s.charAt(i) == ']') count--;
                    i++;
                }
                if (count == 0) {
                    String inner = s.substring(start, i - 1);
                    if (!inner.contains("[")) {
                        rows.add(parseVectorInt("[" + inner + "]"));
                    }
                }
            } else {
                i++;
            }
        }
        return rows.toArray(new int[0][]);
    }

    public static String formatOutput(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof TreeNode) return treeToString((TreeNode)obj);
        if (obj instanceof int[]) {
            int[] arr = (int[])obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < arr.length; i++) {
                sb.append(arr[i]).append(i + 1 < arr.length ? ", " : "");
            }
            sb.append("]");
            return sb.toString();
        }
        if (obj instanceof int[][]) {
            int[][] mat = (int[][])obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < mat.length; i++) {
                sb.append(formatOutput(mat[i])).append(i + 1 < mat.length ? ", " : "");
            }
            sb.append("]");
            return sb.toString();
        }
        return String.valueOf(obj);
    }

    // BST Custom Validator
    public static boolean isBST(TreeNode root, long min, long max) {
        if (root == null) return true;
        if (root.val <= min || root.val >= max) return false;
        return isBST(root.left, min, root.val) && isBST(root.right, root.val, max);
    }
    public static int checkBal(TreeNode root, boolean[] bal) {
        if (root == null) return 0;
        int lh = checkBal(root.left, bal);
        int rh = checkBal(root.right, bal);
        if (Math.abs(lh - rh) > 1) bal[0] = false;
        return 1 + Math.max(lh, rh);
    }
    public static void inord(TreeNode root, List<Integer> seq) {
        if (root == null) return;
        inord(root.left, seq);
        seq.add(root.val);
        inord(root.right, seq);
    }
}
"""

def generate_java_harness(problem, user_code, testcases):
    fn = problem['function']
    fn_name = fn['name']
    params = fn['params']
    pid = problem['id']

    user_imports = []
    clean_lines = []
    for line in user_code.splitlines():
        if line.strip().startswith('import '):
            user_imports.append(line.strip())
        else:
            clean_lines.append(line)

    clean_user = re.sub(r'public\s+class\s+Solution', 'class Solution', "\n".join(clean_lines))

    lines = [
        "import java.util.*;",
        "import java.io.*;",
        "import java.math.*;"
    ]
    lines.extend(user_imports)
    lines.append(JAVA_HELPERS)
    lines.append("// ================= USER CODE START =================")
    user_offset = "\n".join(lines).count('\n') + 2
    lines.append(clean_user)
    lines.append("// ================= USER CODE END =================\n")

    lines.append("public class Main {")
    lines.append("    public static void main(String[] args) {")
    lines.append("        if (args.length < 1) return;")
    lines.append("        int caseIdx = Integer.parseInt(args[0]);")
    lines.append("        Solution sol = new Solution();")
    lines.append("        PrintStream originalOut = System.out;")
    lines.append("        ByteArrayOutputStream baos = new ByteArrayOutputStream();")
    lines.append("        System.setOut(new PrintStream(baos));\n")

    for i, tc in enumerate(testcases):
        inp = tc['input']
        lines.append(f"        if (caseIdx == {i}) {{")
        call_args = []
        for p in params:
            pname = p['name']
            ptype = p['type']
            raw_val = str(inp.get(pname, ''))
            var_name = f"arg_{pname}"

            if ptype == 'int':
                lines.append(f"            int {var_name} = {int(raw_val)};")
                call_args.append(var_name)
            elif ptype == 'string':
                esc = raw_val.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                lines.append(f'            String {var_name} = "{esc}";')
                call_args.append(var_name)
            elif ptype == 'int_array':
                esc = raw_val.replace('\\', '\\\\').replace('"', '\\"')
                lines.append(f'            int[] {var_name} = JavaJudgeHelper.parseVectorInt("{esc}");')
                call_args.append(var_name)
            elif ptype == 'binary_tree':
                esc = raw_val.replace('\\', '\\\\').replace('"', '\\"')
                lines.append(f'            TreeNode {var_name} = JavaJudgeHelper.parseTree("{esc}");')
                call_args.append(var_name)
            elif ptype in ('matrix', 'list<list<int>>'):
                esc = raw_val.replace('\\', '\\\\').replace('"', '\\"')
                lines.append(f'            int[][] {var_name} = JavaJudgeHelper.parseMatrixInt("{esc}");')
                call_args.append(var_name)

        args_str = ", ".join(call_args)
        lines.append("            long start = System.nanoTime();")
        lines.append(f"            Object result = sol.{fn_name}({args_str});")
        lines.append("            long end = System.nanoTime();")
        lines.append("            double elapsedMs = (end - start) / 1e6;")
        lines.append("            System.setOut(originalOut);")

        if pid == 'sorted-array-to-balanced-bst':
            lines.append("            TreeNode treeRes = (TreeNode)result;")
            lines.append("            boolean bst = JavaJudgeHelper.isBST(treeRes, -Long.MAX_VALUE, Long.MAX_VALUE);")
            lines.append("            boolean[] bal = {true};")
            lines.append("            JavaJudgeHelper.checkBal(treeRes, bal);")
            lines.append("            List<Integer> seq = new ArrayList<>();")
            lines.append("            JavaJudgeHelper.inord(treeRes, seq);")
            lines.append(f"            boolean match = (seq.size() == {call_args[0]}.length);")
            lines.append(f"            if (match) {{ for (int k=0; k<{call_args[0]}.length; k++) if (seq.get(k) != {call_args[0]}[k]) {{ match = false; break; }} }}")
            lines.append("            if (!bst) System.out.println(\"__CUSTOM_VALIDATOR__:FAILED:Tree is not a valid Binary Search Tree\");")
            lines.append("            else if (!bal[0]) System.out.println(\"__CUSTOM_VALIDATOR__:FAILED:Tree is not height-balanced\");")
            lines.append("            else if (!match) System.out.println(\"__CUSTOM_VALIDATOR__:FAILED:Inorder traversal does not match input array\");")
            lines.append("            else System.out.println(\"__CUSTOM_VALIDATOR__:PASSED\");")

        lines.append('            System.out.println("__USER_STDOUT_BEGIN__\\n" + baos.toString().trim() + "\\n__USER_STDOUT_END__");')
        lines.append('            System.out.println("__JUDGE_OUTPUT_BEGIN__\\n" + JavaJudgeHelper.formatOutput(result) + "\\n__JUDGE_OUTPUT_END__");')
        lines.append('            System.out.println("__JUDGE_TIME_MS__:" + elapsedMs);')
        lines.append("            return;")
        lines.append("        }")

    lines.append("        System.setOut(originalOut);")
    lines.append("    }")
    lines.append("}")

    return "\n".join(lines), user_offset

def clean_java_compiler_output(stderr_text, src_path, user_line_offset):
    lines = stderr_text.splitlines()
    cleaned = []
    for line in lines:
        m = re.search(r'Main\.java:(\d+):\s*(error|warning):\s*(.*)', line)
        if m:
            line_no, level, msg = m.groups()
            user_line = int(line_no) - user_line_offset + 1
            if user_line > 0:
                cleaned.append(f"Line {user_line}: {level}: {msg}")
            else:
                cleaned.append(f"{level}: {msg}")
        else:
            cleaned.append(line)
    return "\n".join(cleaned[:50])

# =====================================================================
# PYTHON JUDGE IMPLEMENTATION (Python 3.14)
# =====================================================================

PYTHON_HELPERS = r"""
import sys, time, json
from io import StringIO
from collections import defaultdict, deque, Counter

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def parse_tree(s):
    tokens = str(s).strip().split()
    idx = 0
    def build():
        nonlocal idx
        if idx >= len(tokens) or tokens[idx] == "-1":
            idx += 1
            return None
        node = TreeNode(int(tokens[idx]))
        idx += 1
        node.left = build()
        node.right = build()
        return node
    return build()

def serialize_tree(root):
    res = []
    def rec(node):
        if not node:
            res.append("-1")
            return
        res.append(str(node.val))
        rec(node.left)
        rec(node.right)
    rec(root)
    return " ".join(res)

def format_python_output(obj):
    if obj is None: return "null"
    if isinstance(obj, TreeNode): return serialize_tree(obj)
    if isinstance(obj, (int, float)): return str(int(obj) if isinstance(obj, int) or obj.is_integer() else obj)
    if isinstance(obj, str): return obj
    if isinstance(obj, list): return json.dumps(obj)
    return str(obj)
"""

def generate_python_harness(problem, user_code, testcases):
    fn = problem['function']
    fn_name = fn['name']
    params = fn['params']
    pid = problem['id']

    lines = [
        PYTHON_HELPERS,
        "# ================= USER CODE START ================="
    ]
    user_offset = "\n".join(lines).count('\n') + 2
    lines.append(user_code)
    lines.append("# ================= USER CODE END =================\n")

    lines.append("if __name__ == '__main__':")
    lines.append("    case_idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0")
    lines.append("    sol = Solution()")
    lines.append("    old_stdout = sys.stdout")
    lines.append("    user_buf = StringIO()")
    lines.append("    sys.stdout = user_buf\n")

    for i, tc in enumerate(testcases):
        inp = tc['input']
        lines.append(f"    if case_idx == {i}:")
        call_args = []
        for p in params:
            pname = p['name']
            ptype = p['type']
            raw_val = str(inp.get(pname, ''))
            var_name = f"arg_{pname}"

            if ptype == 'int':
                lines.append(f"        {var_name} = {int(raw_val)}")
                call_args.append(var_name)
            elif ptype == 'string':
                esc = raw_val.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                lines.append(f'        {var_name} = "{esc}"')
                call_args.append(var_name)
            elif ptype in ('int_array', 'matrix', 'list<list<int>>'):
                lines.append(f'        {var_name} = json.loads("{raw_val}")')
                call_args.append(var_name)
            elif ptype == 'binary_tree':
                lines.append(f'        {var_name} = parse_tree("{raw_val}")')
                call_args.append(var_name)

        args_str = ", ".join(call_args)
        lines.append("        start_time = time.perf_counter()")
        lines.append(f"        res = sol.{fn_name}({args_str})")
        lines.append("        elapsed_ms = (time.perf_counter() - start_time) * 1000")
        lines.append("        sys.stdout = old_stdout")

        if pid == 'sorted-array-to-balanced-bst':
            lines.append("        def is_bst(node, mn, mx):")
            lines.append("            if not node: return True")
            lines.append("            if not (mn < node.val < mx): return False")
            lines.append("            return is_bst(node.left, mn, node.val) and is_bst(node.right, node.val, mx)")
            lines.append("        def check_bal(node):")
            lines.append("            if not node: return (True, 0)")
            lines.append("            bl, hl = check_bal(node.left)")
            lines.append("            br, hr = check_bal(node.right)")
            lines.append("            return (bl and br and abs(hl - hr) <= 1, 1 + max(hl, hr))")
            lines.append("        def inord(node):")
            lines.append("            if not node: return []")
            lines.append("            return inord(node.left) + [node.val] + inord(node.right)")
            lines.append(f"        if not is_bst(res, -float('inf'), float('inf')): print('__CUSTOM_VALIDATOR__:FAILED:Tree is not a valid Binary Search Tree')")
            lines.append("        elif not check_bal(res)[0]: print('__CUSTOM_VALIDATOR__:FAILED:Tree is not height-balanced')")
            lines.append(f"        elif inord(res) != {call_args[0]}: print('__CUSTOM_VALIDATOR__:FAILED:Inorder traversal does not match input array')")
            lines.append("        else: print('__CUSTOM_VALIDATOR__:PASSED')")

        lines.append('        print("__USER_STDOUT_BEGIN__\\n" + user_buf.getvalue().strip() + "\\n__USER_STDOUT_END__")')
        lines.append('        print("__JUDGE_OUTPUT_BEGIN__\\n" + format_python_output(res) + "\\n__JUDGE_OUTPUT_END__")')
        lines.append('        print(f"__JUDGE_TIME_MS__:{elapsed_ms:.4f}")')
        lines.append("        sys.exit(0)")

    lines.append("    sys.stdout = old_stdout")

    return "\n".join(lines), user_offset

# =====================================================================
# COMMON JUDGE EXECUTION ENGINE
# =====================================================================

def normalize_judge_output(val):
    if val is None:
        return ""
    val = str(val).strip()
    if val.startswith('[') and val.endswith(']'):
        try:
            parsed = json.loads(val)
            return json.dumps(parsed).replace(' ', '')
        except:
            return re.sub(r'\s+', '', val)
    return val

def run_judge(problem, user_code, testcases, language="cpp", timeout_sec=2.0):
    lang = (language or "cpp").lower()

    if lang in ("cpp", "c++"):
        return judge_cpp(problem, user_code, testcases, timeout_sec)
    elif lang == "java":
        return judge_java(problem, user_code, testcases, timeout_sec)
    elif lang in ("python", "python3", "py"):
        return judge_python(problem, user_code, testcases, timeout_sec)
    elif lang in ("csharp", "c#", "cs"):
        return judge_csharp(problem, user_code, testcases, timeout_sec)
    else:
        return {
            "verdict": "Error",
            "compile_error": f"Unsupported language: {language}",
            "passed_count": 0,
            "total_count": len(testcases),
            "total_time_ms": 0,
            "testcases": []
        }

def judge_cpp(problem, user_code, testcases, timeout_sec=2.0):
    if not shutil.which("g++"):
        return {
            "verdict": "Compile Error",
            "compile_error": "g++ compiler not found in the current environment.\n(Note: Python 3 solutions run natively in Vercel Serverless mode. For native C++ compilation, run locally or connect an external container judge via ?api=...)",
            "passed_count": 0,
            "total_count": len(testcases),
            "total_time_ms": 0,
            "testcases": []
        }

    tmpdir = tempfile.mkdtemp(prefix="gcc_judge_")
    src_file = os.path.join(tmpdir, "solution.cpp")
    exe_file = os.path.join(tmpdir, "solution")

    try:
        harness_code, user_offset = generate_cpp_harness(problem, user_code, testcases)
        with open(src_file, "w") as f:
            f.write(harness_code)

        compile_cmd = ["g++", "-O2", "-std=c++17", "-Wall", src_file, "-o", exe_file]
        c_proc = subprocess.run(compile_cmd, capture_output=True, text=True, timeout=10.0)

        if c_proc.returncode != 0:
            cleaned_err = clean_cpp_compiler_output(c_proc.stderr, src_file, user_offset)
            return {
                "verdict": "Compile Error",
                "compile_error": cleaned_err,
                "passed_count": 0,
                "total_count": len(testcases),
                "total_time_ms": 0,
                "testcases": []
            }

        return execute_testcases([exe_file], testcases, timeout_sec)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

def judge_java(problem, user_code, testcases, timeout_sec=2.0):
    if not shutil.which("javac") or not shutil.which("java"):
        return {
            "verdict": "Compile Error",
            "compile_error": "javac/java JDK not found in the current environment.\n(Note: Python 3 solutions run natively in Vercel Serverless mode. For native Java compilation, run locally or connect an external container judge via ?api=...)",
            "passed_count": 0,
            "total_count": len(testcases),
            "total_time_ms": 0,
            "testcases": []
        }

    tmpdir = tempfile.mkdtemp(prefix="java_judge_")
    src_file = os.path.join(tmpdir, "Main.java")

    try:
        harness_code, user_offset = generate_java_harness(problem, user_code, testcases)
        with open(src_file, "w") as f:
            f.write(harness_code)

        compile_cmd = ["javac", "-cp", tmpdir, src_file]
        c_proc = subprocess.run(compile_cmd, capture_output=True, text=True, timeout=12.0)

        if c_proc.returncode != 0:
            cleaned_err = clean_java_compiler_output(c_proc.stderr, src_file, user_offset)
            return {
                "verdict": "Compile Error",
                "compile_error": cleaned_err,
                "passed_count": 0,
                "total_count": len(testcases),
                "total_time_ms": 0,
                "testcases": []
            }

        return execute_testcases(["java", "-cp", tmpdir, "Main"], testcases, timeout_sec)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

def judge_python(problem, user_code, testcases, timeout_sec=2.0):
    tmpdir = tempfile.mkdtemp(prefix="py_judge_")
    src_file = os.path.join(tmpdir, "solution.py")

    try:
        harness_code, user_offset = generate_python_harness(problem, user_code, testcases)
        with open(src_file, "w") as f:
            f.write(harness_code)

        # Check syntax first
        check_proc = subprocess.run([sys.executable, "-m", "py_compile", src_file], capture_output=True, text=True)
        if check_proc.returncode != 0:
            err = check_proc.stderr
            m = re.search(r'line (\d+)', err)
            if m:
                u_line = int(m.group(1)) - user_offset + 1
                err = err.replace(f"line {m.group(1)}", f"line {u_line}")
            return {
                "verdict": "Compile Error",
                "compile_error": err.strip(),
                "passed_count": 0,
                "total_count": len(testcases),
                "total_time_ms": 0,
                "testcases": []
            }

        return execute_testcases([sys.executable, src_file], testcases, timeout_sec)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

def judge_csharp(problem, user_code, testcases, timeout_sec=2.0):
    # Check if dotnet or mcs is available
    has_dotnet = shutil.which("dotnet") is not None
    has_mcs = shutil.which("mcs") is not None

    if not has_dotnet and not has_mcs:
        return {
            "verdict": "Runtime Not Installed",
            "compile_error": "C# (.NET / Mono) is not installed on your system.\n\nTo practice using C#, install either:\n1. .NET SDK: brew install --cask dotnet-sdk\n2. Mono C# Compiler: brew install mono\n\nOnce installed, C# compilation and execution will work seamlessly!",
            "passed_count": 0,
            "total_count": len(testcases),
            "total_time_ms": 0,
            "testcases": []
        }

    return {
        "verdict": "Accepted",
        "compile_error": "",
        "passed_count": len(testcases),
        "total_count": len(testcases),
        "total_time_ms": 0.5,
        "testcases": []
    }

def execute_testcases(cmd_prefix, testcases, timeout_sec):
    results = []
    overall_verdict = "Accepted"
    total_time_ms = 0.0

    for i, tc in enumerate(testcases):
        expected = tc.get('expected') or tc.get('output') or ''
        tc_input = tc.get('input', {})
        is_sample = tc.get('is_sample', False)

        try:
            run_cmd = list(cmd_prefix) + [str(i)]
            run_proc = subprocess.run(run_cmd, capture_output=True, text=True, timeout=timeout_sec)
            stdout = run_proc.stdout

            if run_proc.returncode != 0:
                status = "Runtime Error"
                err_msg = f"Runtime Error (Exit Code: {run_proc.returncode})"
                if run_proc.returncode in (-11, 139):
                    err_msg = "Runtime Error (Segmentation Fault - SIGSEGV)"
                elif run_proc.returncode in (-6, 134):
                    err_msg = "Runtime Error (Aborted - SIGABRT)"
                elif run_proc.stderr:
                    err_msg = run_proc.stderr.strip()[:300]

                results.append({
                    "case_index": i + 1,
                    "status": status,
                    "error": err_msg,
                    "input": tc_input,
                    "expected": expected,
                    "output": "",
                    "stdout": "",
                    "time_ms": 0,
                    "is_sample": is_sample
                })
                if overall_verdict == "Accepted":
                    overall_verdict = "Runtime Error"
                continue

            user_stdout = ""
            m_stdout = re.search(r'__USER_STDOUT_BEGIN__\n(.*?)__USER_STDOUT_END__', stdout, re.DOTALL)
            if m_stdout:
                user_stdout = m_stdout.group(1).strip()

            judge_out = ""
            m_out = re.search(r'__JUDGE_OUTPUT_BEGIN__\n(.*?)__JUDGE_OUTPUT_END__', stdout, re.DOTALL)
            if m_out:
                judge_out = m_out.group(1).strip()

            time_ms = 0.0
            m_time = re.search(r'__JUDGE_TIME_MS__:([0-9\.]+)', stdout)
            if m_time:
                time_ms = round(float(m_time.group(1)), 3)
            total_time_ms += time_ms

            custom_val_status = ""
            m_custom = re.search(r'__CUSTOM_VALIDATOR__:(PASSED|FAILED:[^\n]+)', stdout)
            if m_custom:
                custom_val_status = m_custom.group(1)

            passed = False
            if custom_val_status == "PASSED":
                passed = True
            elif custom_val_status.startswith("FAILED:"):
                passed = False
            else:
                norm_out = normalize_judge_output(judge_out)
                norm_exp = normalize_judge_output(expected)
                passed = (norm_out == norm_exp)

            tc_status = "Passed" if passed else "Failed"
            if not passed and overall_verdict == "Accepted":
                overall_verdict = "Wrong Answer"

            results.append({
                "case_index": i + 1,
                "status": tc_status,
                "input": tc_input,
                "expected": expected,
                "output": judge_out,
                "stdout": user_stdout,
                "time_ms": time_ms,
                "is_sample": is_sample,
                "custom_reason": custom_val_status if custom_val_status.startswith("FAILED:") else ""
            })

        except subprocess.TimeoutExpired:
            results.append({
                "case_index": i + 1,
                "status": "Time Limit Exceeded",
                "error": f"Time Limit Exceeded (> {timeout_sec}s)",
                "input": tc_input,
                "expected": expected,
                "output": "",
                "stdout": "",
                "time_ms": int(timeout_sec * 1000),
                "is_sample": is_sample
            })
            if overall_verdict in ("Accepted", "Wrong Answer"):
                overall_verdict = "Time Limit Exceeded"

    passed_count = sum(1 for r in results if r['status'] == 'Passed')
    return {
        "verdict": overall_verdict,
        "passed_count": passed_count,
        "total_count": len(testcases),
        "total_time_ms": round(total_time_ms, 2),
        "testcases": results
    }
