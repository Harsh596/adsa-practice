import json
import os

DIFFICULTIES = {
    'find-leaves-of-binary-tree': 'Medium',
    'tower-of-hanoi': 'Easy',
    'check-palindrome-recursion': 'Easy',
    'count-good-subsequences': 'Hard',
    'ncr-mod-m': 'Medium',
    'grid-unique-paths': 'Medium',
    'pascal-triangle': 'Easy',
    'consecutive-numbers-sum': 'Hard',
    'sorted-permutation-rank': 'Medium',
    'combinations': 'Medium',
    'excel-column-title': 'Easy',
    'very-large-power': 'Medium',
    'ncr-mod-p': 'Hard',
    'prime-modulo-inverse': 'Medium',
    'yet-another-matrix-question': 'Medium',
    'excel-column-number': 'Easy',
    'sorted-permutation-rank-with-repeats': 'Hard',
    'ath-magical-number': 'Hard',
    'sorted-array-to-balanced-bst': 'Easy',
    'check-for-bst-with-one-child': 'Medium',
    'search-in-bst': 'Easy',
    'valid-binary-search-tree': 'Medium',
    'largest-bst-subtree': 'Medium',
    'delete-a-node-in-bst': 'Medium',
    'kth-smallest-element-in-bst': 'Medium',
    'path-to-given-node': 'Easy',
    'morris-inorder-traversal': 'Hard',
    'two-sum-bst': 'Medium',
    'common-nodes-in-two-bst': 'Medium',
    'bst-nodes-in-a-range': 'Easy',
    'distance-between-nodes-of-bst': 'Medium'
}

TYPE_MAP = {
    'int': 'int',
    'string': 'string',
    'int_array': 'vector<int>',
    'binary_tree': 'TreeNode*',
    'matrix': 'vector<vector<int>>',
    'list<list<int>>': 'vector<vector<int>>'
}

TREENODE_COMMENT = """/**
 * Definition for binary tree
 * struct TreeNode {
 *     int val;
 *     TreeNode *left;
 *     TreeNode *right;
 *     TreeNode(int x) : val(x), left(NULL), right(NULL) {}
 * };
 */
"""

HINTS_MAP = {
    'find-leaves-of-binary-tree': [
        "Think about what pass a node is removed in. A leaf with no children is removed in pass 0.",
        "A parent of two leaves can only be removed after both its children are removed.",
        "Therefore, the pass number for any node equals its height from the leaves: 1 + max(height(left), height(right))."
    ],
    'tower-of-hanoi': [
        "To move n disks from source to target using auxiliary:",
        "1. Recursively move top n-1 disks from source to auxiliary.",
        "2. Move disk n directly from source to target.",
        "3. Recursively move the n-1 disks from auxiliary to target."
    ],
    'check-palindrome-recursion': [
        "Compare the first and last characters of the string.",
        "If they match, recurse on the substring between them (left + 1, right - 1).",
        "Base cases: when left >= right, all characters matched, return 1."
    ],
    'count-good-subsequences': [
        "In a good subsequence, every distinct value chosen must appear the exact same number of times k (1 <= k <= max_freq).",
        "For a fixed frequency k, for each distinct value with count c >= k, we can either not pick it (1 way) or pick k occurrences (C(c, k) ways).",
        "Total ways for frequency k is product over distinct values of (1 + C(c, k)) - 1. Sum this over all k."
    ],
    'ncr-mod-m': [
        "Since m is not guaranteed to be prime, Fermat's Little Theorem / modular inverse does NOT work.",
        "Notice the constraint A * B <= 10^6. This strongly hints at Pascal's identity: C(n, r) = (C(n-1, r-1) + C(n-1, r)) % m.",
        "Compute row by row using a 1D DP table of size B+1."
    ],
    'grid-unique-paths': [
        "To reach (A-1, B-1) from (0, 0), the robot must make exactly (A - 1) down moves and (B - 1) right moves.",
        "The total number of moves is (A + B - 2).",
        "Any path is uniquely determined by choosing which (A - 1) of the total moves are downward: C(A + B - 2, A - 1)."
    ],
    'pascal-triangle': [
        "Row 0 is [1], Row 1 is [1, 1], Row 2 is [1, 2, 1], etc.",
        "Each row has size A, padded with zeros at the end.",
        "C(n, r) = C(n, r-1) * (n - r + 1) / r, or use dynamic programming."
    ],
    'consecutive-numbers-sum': [
        "A sum of k consecutive integers starting at x is: x + (x+1) + ... + (x+k-1) = k*x + k*(k-1)/2 = A.",
        "Rearranging: k*x = A - k*(k-1)/2.",
        "For positive integer x >= 1, we need (A - k*(k-1)/2) > 0 and divisible by k. Loop k starting from 1."
    ],
    'sorted-permutation-rank': [
        "For each character at index i, count how many characters to its right are strictly smaller.",
        "If there are c such characters, there are c * (n - 1 - i)! permutations that come before this character.",
        "Add all these counts modulo 1000003, and add 1 at the end for 1-based indexing."
    ],
    'combinations': [
        "Use standard backtracking or recursion.",
        "At step k, pick numbers strictly greater than the previous number up to A.",
        "If B > A, no combinations are possible, return an empty list."
    ],
    'excel-column-title': [
        "This is bijective base-26 numbering (1-indexed without a zero symbol).",
        "At each step: subtract 1 from A, take the remainder modulo 26 to get the character ('A' + rem), then divide A by 26.",
        "Reverse the result at the end."
    ],
    'very-large-power': [
        "Since p = 10^9 + 7 is prime, by Fermat's Little Theorem: A^(p-1) = 1 (mod p).",
        "Therefore, the exponent B! can be computed modulo (p - 1) = 10^9 + 6.",
        "Once E = B! % (p - 1) is found, compute A^E % p using fast modular exponentiation."
    ],
    'ncr-mod-p': [
        "Boundary case: If C == A where C is prime, for 0 < B < A, C divides n! so nCr % C is 0. If B == A, nCr % C is 1.",
        "When C > A and C is prime: C(n, r) = n! * inv(r!) * inv((n-r)!) % C.",
        "Use Fermat's Little Theorem: inv(x) = x^(C-2) % C."
    ],
    'prime-modulo-inverse': [
        "Since B is prime and gcd(A, B) = 1, by Fermat's Little Theorem: A^(B-1) = 1 (mod B).",
        "Multiplying both sides by A^-1: A^-1 = A^(B-2) (mod B).",
        "Compute A^(B-2) % B using fast modular exponentiation in O(log B) time."
    ],
    'yet-another-matrix-question': [
        "For each column, the initial sum is A (since every cell is 1). Flipping a cell from 1 to -1 changes column sum by -2.",
        "To reach sum 0, we must flip exactly A / 2 cells. If A is odd, this is impossible, return 0.",
        "If A is even, number of ways to choose A/2 cells in each column is C(A, A/2). For B independent columns, answer is C(A, A/2)^B % (10^9+7)."
    ],
    'excel-column-number': [
        "Iterate through the string from left to right.",
        "Accumulate: result = result * 26 + (c - 'A' + 1)."
    ],
    'sorted-permutation-rank-with-repeats': [
        "Similar to permutation rank without repeats, but we must divide by factorials of character frequencies.",
        "For position i, for every character c < A[i]:",
        "Count of valid suffixes = (rem_len - 1)! / (count[c1]! * count[c2]! * ... * (count[c]-1)! * ...).",
        "Use modular inverse modulo 1000003."
    ],
    'ath-magical-number': [
        "A number is magical if it is divisible by B or C.",
        "By Inclusion-Exclusion, the number of magical numbers <= X is: X/B + X/C - X/lcm(B, C).",
        "Binary search for the smallest X where count(X) >= A, then return X % (10^9 + 7)."
    ],
    'sorted-array-to-balanced-bst': [
        "To ensure height balance, pick the middle element as the root.",
        "Recursively build the left subtree from the left subarray, and right subtree from the right subarray.",
        "Base case: if left > right, return nullptr."
    ],
    'check-for-bst-with-one-child': [
        "In a BST where every internal node has 1 child, each node must fall into the valid interval established by all previous nodes.",
        "If node[i+1] > node[i], node[i+1] is a right child, updating the lower bound to node[i].",
        "If node[i+1] < node[i], node[i+1] is a left child, updating the upper bound to node[i]. Check if any subsequent element violates the bounds."
    ],
    'search-in-bst': [
        "Start at the root. If current node is null, return 0.",
        "If current node value == B, return 1.",
        "If B < current->val, search left. If B > current->val, search right."
    ],
    'valid-binary-search-tree': [
        "Each node's value must be strictly between a minimum and maximum valid bound: minVal < node->val < maxVal.",
        "For the left child, update maxVal = node->val.",
        "For the right child, update minVal = node->val. Use 64-bit integers (long long) for bounds."
    ],
    'largest-bst-subtree': [
        "Perform a postorder traversal (bottom-up DFS).",
        "Each node returns: (isBST, size, min_value, max_value).",
        "A node is a BST if both its left and right subtrees are BSTs and max_left < node->val < min_right."
    ],
    'delete-a-node-in-bst': [
        "Find the node with value B recursively.",
        "If the node has 0 or 1 child, replace it directly with its child (or null).",
        "If it has 2 children, find its in-order predecessor (the rightmost node of its left subtree), copy its value, and delete that predecessor from the left subtree."
    ],
    'kth-smallest-element-in-bst': [
        "An in-order traversal (Left, Root, Right) of a BST visits nodes in strictly increasing order.",
        "Use an iterative in-order traversal with a stack.",
        "Decrement B each time a node is popped; when B reaches 0, return that node's value."
    ],
    'path-to-given-node': [
        "Use a recursive DFS / backtracking function.",
        "Add current node to the path vector.",
        "If current node value == B, return true. Otherwise recurse left and right. If neither contains B, pop the node and return false."
    ],
    'morris-inorder-traversal': [
        "Morris traversal uses threaded binary trees to achieve O(1) extra space.",
        "If current node has no left child: visit current and go to right child.",
        "If current has a left child: find its in-order predecessor (rightmost node in left subtree).",
        "If predecessor's right is null, make it point to current (thread) and go left.",
        "If predecessor's right points to current, remove the thread, visit current, and go right."
    ],
    'two-sum-bst': [
        "An in-order traversal of a BST yields elements in strictly increasing sorted order.",
        "You can store elements in a hash set as you traverse, checking if (B - current.val) was already seen.",
        "Alternatively, collect elements into a sorted array and use two pointers (left and right) or two BST iterators for O(h) space."
    ],
    'common-nodes-in-two-bst': [
        "Both trees are Binary Search Trees, so their in-order traversals are strictly sorted.",
        "You can traverse tree A to store its values in a hash set, then traverse tree B and add values present in the set modulo 10^9+7.",
        "For O(h1 + h2) space, simulate two in-order iterators simultaneously using stacks, advancing the smaller element like merging two sorted arrays."
    ],
    'bst-nodes-in-a-range': [
        "Take advantage of the BST property to prune subtrees that cannot contain elements in [B, C].",
        "If current node value >= B, the left subtree might contain valid nodes.",
        "If current node value <= C, the right subtree might contain valid nodes. If B <= value <= C, increment count."
    ],
    'distance-between-nodes-of-bst': [
        "The distance between nodes B and C in a tree is: dist(root, B) + dist(root, C) - 2 * dist(root, LCA(B, C)).",
        "Equivalently, find the Lowest Common Ancestor (LCA) first: the first node where one key is <= node.val and the other is >= node.val.",
        "The distance is then dist(LCA, B) + dist(LCA, C), which can each be computed by simple BST descent."
    ]
}

JAVA_TYPE_MAP = {
    'int': 'int',
    'string': 'String',
    'int_array': 'int[]',
    'binary_tree': 'TreeNode',
    'matrix': 'int[][]',
    'list<list<int>>': 'List<List<Integer>>'
}

PYTHON_TYPE_MAP = {
    'int': 'int',
    'string': 'str',
    'int_array': 'List[int]',
    'binary_tree': 'Optional[TreeNode]',
    'matrix': 'List[List[int]]',
    'list<list<int>>': 'List[List[int]]'
}

CSHARP_TYPE_MAP = {
    'int': 'int',
    'string': 'string',
    'int_array': 'int[]',
    'binary_tree': 'TreeNode',
    'matrix': 'int[][]',
    'list<list<int>>': 'IList<IList<int>>'
}

def generate_java_starter(p):
    fn = p['function']
    fn_name = fn['name']
    params = fn['params']
    ret = JAVA_TYPE_MAP.get(fn['returns'], 'Object')
    param_strs = [f"{JAVA_TYPE_MAP.get(pr['type'], 'Object')} {pr['name']}" for pr in params]
    sig = f"public {ret} {fn_name}({', '.join(param_strs)})"

    needs_tree = any(pr['type'] == 'binary_tree' for pr in params) or fn['returns'] == 'binary_tree'
    code = "import java.util.*;\nimport java.io.*;\n\n"
    if needs_tree:
        code += "/**\n * Definition for binary tree\n * class TreeNode {\n *     int val;\n *     TreeNode left;\n *     TreeNode right;\n *     TreeNode(int x) { val = x; }\n * }\n */\n\n"
    code += "class Solution {\n"
    code += f"    {sig} {{\n"
    code += "        // Write your solution here\n"
    code += "        \n"
    code += "    }\n"
    code += "}\n"
    return code

def generate_python_starter(p):
    fn = p['function']
    fn_name = fn['name']
    params = fn['params']
    ret = PYTHON_TYPE_MAP.get(fn['returns'], 'Any')
    param_strs = ["self"] + [f"{pr['name']}: {PYTHON_TYPE_MAP.get(pr['type'], 'Any')}" for pr in params]
    sig = f"def {fn_name}({', '.join(param_strs)}) -> {ret}:"

    needs_tree = any(pr['type'] == 'binary_tree' for pr in params) or fn['returns'] == 'binary_tree'
    code = "from typing import List, Optional\nimport math\nfrom collections import defaultdict, deque, Counter\n\n"
    if needs_tree:
        code += "# Definition for a binary tree node.\n# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\n\n"
    code += "class Solution:\n"
    code += f"    {sig}\n"
    code += "        # Write your solution here\n"
    code += "        pass\n"
    return code

def generate_csharp_starter(p):
    fn = p['function']
    fn_name = fn['name'][:1].upper() + fn['name'][1:]
    params = fn['params']
    ret = CSHARP_TYPE_MAP.get(fn['returns'], 'object')
    param_strs = [f"{CSHARP_TYPE_MAP.get(pr['type'], 'object')} {pr['name']}" for pr in params]
    sig = f"public {ret} {fn_name}({', '.join(param_strs)})"

    needs_tree = any(pr['type'] == 'binary_tree' for pr in params) or fn['returns'] == 'binary_tree'
    code = "using System;\nusing System.Collections.Generic;\n\n"
    if needs_tree:
        code += "/**\n * Definition for a binary tree node.\n * public class TreeNode {\n *     public int val;\n *     public TreeNode left;\n *     public TreeNode right;\n *     public TreeNode(int x) { val = x; }\n * }\n */\n\n"
    code += "public class Solution {\n"
    code += f"    {sig} {{\n"
    code += "        // Write your solution here\n"
    code += "        \n"
    code += "    }\n"
    code += "}\n"
    return code

def generate_starter_code(p):
    fn = p['function']
    fn_name = fn['name']
    params = fn['params']
    ret = TYPE_MAP[fn['returns']]
    param_strs = [f"{TYPE_MAP[pr['type']]} {pr['name']}" for pr in params]
    sig = f"{ret} {fn_name}({', '.join(param_strs)})"

    needs_tree = any(pr['type'] == 'binary_tree' for pr in params) or fn['returns'] == 'binary_tree'

    code = ""
    if needs_tree:
        code += TREENODE_COMMENT + "\n"

    code += "class Solution {\n"
    code += "public:\n"
    code += f"    {sig} {{\n"
    code += "        // Write your solution here\n"
    code += "        \n"
    code += "    }\n"
    code += "};\n"
    return code

def enrich_problems():
    with open('practice_problems.json') as f:
        data = json.load(f)

    with open('backend/test_suites.json') as f:
        test_suites = json.load(f)

    existing_starter_codes = {}
    if os.path.exists('backend/problems_enriched.json'):
        with open('backend/problems_enriched.json') as f:
            for p in json.load(f).get('problems', []):
                if 'starter_codes' in p:
                    existing_starter_codes[p['id']] = p['starter_codes']

    enriched = []
    for p in data['problems']:
        pid = p['id']
        p_copy = dict(p)
        p_copy['difficulty'] = DIFFICULTIES.get(pid, 'Medium')
        starter_map = dict(existing_starter_codes.get(pid, {}))
        if 'cpp' not in starter_map:
            starter_map['cpp'] = generate_starter_code(p)
        if 'java' not in starter_map:
            starter_map['java'] = generate_java_starter(p)
        if 'python' not in starter_map:
            starter_map['python'] = generate_python_starter(p)
        if 'csharp' not in starter_map:
            starter_map['csharp'] = generate_csharp_starter(p)
        p_copy['starter_code'] = starter_map['cpp']
        p_copy['starter_codes'] = starter_map
        p_copy['hints'] = HINTS_MAP.get(pid, [f"Think about using {p.get('topic', 'DSA')} principles."])
        p_copy['sample_testcases'] = test_suites.get(pid, [])[:2]
        p_copy['total_testcases_count'] = len(test_suites.get(pid, []))
        enriched.append(p_copy)

    with open('backend/problems_enriched.json', 'w') as f:
        json.dump({'problems': enriched, 'meta': data['meta']}, f, indent=2)

    print(f"Enriched {len(enriched)} problems saved to backend/problems_enriched.json")

if __name__ == '__main__':
    enrich_problems()
