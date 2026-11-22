import json
import math
from collections import Counter, defaultdict

class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def parse_tree(s):
    if isinstance(s, dict) or not s:
        return None
    tokens = str(s).strip().split()
    idx = 0
    def build():
        nonlocal idx
        if idx >= len(tokens) or tokens[idx] == "-1":
            idx += 1
            return None
        val = int(tokens[idx])
        idx += 1
        node = TreeNode(val)
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

def normalize_output(val):
    if val is None:
        return ""
    if isinstance(val, (int, float)):
        return str(int(val))
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, list):
        return json.dumps(val).replace(" ", "")
    return str(val)

# Problem 1: findLeaves
def ref_findLeaves(A_str):
    root = parse_tree(A_str)
    levels = defaultdict(list)
    def dfs(node):
        if not node:
            return -1
        h = 1 + max(dfs(node.left), dfs(node.right))
        levels[h].append(node.val)
        return h
    dfs(root)
    res = []
    for h in sorted(levels.keys()):
        res.append(sorted(levels[h]))
    return res

# Problem 2: towerOfHanoi
def ref_towerOfHanoi(A):
    moves = []
    def hanoi(n, f, t, a):
        if n == 0:
            return
        hanoi(n - 1, f, a, t)
        moves.append([n, f, t])
        hanoi(n - 1, a, t, f)
    hanoi(A, 1, 3, 2)
    return moves

# Problem 3: isPalindrome
def ref_isPalindrome(A):
    return 1 if A == A[::-1] else 0

# Problem 4: countGoodSubsequences
def ref_countGoodSubsequences(A):
    MOD = 10**9 + 7
    freq = Counter(A)
    max_f = max(freq.values())
    fact = [1] * (max_f + 1)
    for i in range(1, max_f + 1):
        fact[i] = (fact[i - 1] * i) % MOD
    inv = [1] * (max_f + 1)
    inv[max_f] = pow(fact[max_f], MOD - 2, MOD)
    for i in range(max_f - 1, -1, -1):
        inv[i] = (inv[i + 1] * (i + 1)) % MOD
    def nCr(n, r):
        if r < 0 or r > n:
            return 0
        return fact[n] * inv[r] % MOD * inv[n - r] % MOD
    total = 0
    freq_counts = Counter(freq.values())
    for k in range(1, max_f + 1):
        prod = 1
        for f, cnt in freq_counts.items():
            if f >= k:
                term = (1 + nCr(f, k)) % MOD
                prod = (prod * pow(term, cnt, MOD)) % MOD
        total = (total + prod - 1) % MOD
    return total

# Problem 5: ncr-mod-m
def ref_ncr_mod_m(A, B, C):
    dp = [0] * (B + 1)
    dp[0] = 1 % C
    for i in range(1, A + 1):
        for j in range(min(i, B), 0, -1):
            dp[j] = (dp[j] + dp[j - 1]) % C
    return dp[B]

# Problem 6: gridUniquePaths
def ref_gridUniquePaths(A, B):
    return math.comb(A + B - 2, A - 1)

# Problem 7: pascalTriangle
def ref_pascalTriangle(A):
    res = []
    for i in range(A):
        row = [0] * A
        for j in range(i + 1):
            row[j] = math.comb(i, j)
        res.append(row)
    return res

# Problem 8: consecutiveNumbersSum
def ref_consecutiveNumbersSum(A):
    count = 0
    k = 1
    while k * (k - 1) // 2 < A:
        rem = A - k * (k - 1) // 2
        if rem % k == 0 and rem // k > 0:
            count += 1
        k += 1
    return count

# Problem 9: sortedPermutationRank
def ref_sortedPermutationRank(A):
    MOD = 1000003
    n = len(A)
    fact = [1] * (n + 1)
    for i in range(1, n + 1):
        fact[i] = (fact[i - 1] * i) % MOD
    rank = 1
    for i in range(n):
        cnt = sum(1 for j in range(i + 1, n) if A[j] < A[i])
        rank = (rank + cnt * fact[n - 1 - i]) % MOD
    return rank

# Problem 10: combinations
def ref_combinations(A, B):
    if B > A:
        return []
    res = []
    def backtrack(start, cur):
        if len(cur) == B:
            res.append(list(cur))
            return
        for i in range(start, A + 1):
            cur.append(i)
            backtrack(i + 1, cur)
            cur.pop()
    backtrack(1, [])
    return res

# Problem 11: excelColumnTitle
def ref_excelColumnTitle(A):
    chars = []
    while A > 0:
        A -= 1
        chars.append(chr(ord('A') + (A % 26)))
        A //= 26
    return ''.join(reversed(chars))

# Problem 12: veryLargePower
def ref_veryLargePower(A, B):
    MOD = 10**9 + 7
    MOD_E = MOD - 1
    fact_b = 1
    for i in range(1, B + 1):
        fact_b = (fact_b * i) % MOD_E
    return pow(A, fact_b, MOD)

# Problem 13: ncr-mod-p
def ref_ncr_mod_p(A, B, C):
    if C == 1:
        return 0
    if C == A:
        return 1 % C if (B == 0 or B == A) else 0
    fact_a = 1
    for i in range(1, A + 1):
        fact_a = (fact_a * i) % C
    fact_b = 1
    for i in range(1, B + 1):
        fact_b = (fact_b * i) % C
    fact_amb = 1
    for i in range(1, A - B + 1):
        fact_amb = (fact_amb * i) % C
    inv_b = pow(fact_b, C - 2, C)
    inv_amb = pow(fact_amb, C - 2, C)
    return fact_a * inv_b % C * inv_amb % C

# Problem 14: primeModuloInverse
def ref_primeModuloInverse(A, B):
    return pow(A, B - 2, B)

# Problem 15: yetAnotherMatrixQuestion
def ref_yetAnotherMatrixQuestion(A, B):
    if A % 2 != 0:
        return 0
    MOD = 10**9 + 7
    ways = math.comb(A, A // 2) % MOD
    return pow(ways, B, MOD)

# Problem 16: excelColumnNumber
def ref_excelColumnNumber(A):
    res = 0
    for c in A:
        res = res * 26 + (ord(c) - ord('A') + 1)
    return res

# Problem 17: sortedPermutationRankWithRepeats
def ref_sortedPermutationRankWithRepeats(A):
    MOD = 1000003
    n = len(A)
    fact = [1] * (n + 1)
    for i in range(1, n + 1):
        fact[i] = (fact[i - 1] * i) % MOD
    inv = [1] * (n + 1)
    for i in range(n + 1):
        inv[i] = pow(fact[i], MOD - 2, MOD)
    counts = Counter(A)
    rank = 1
    for i in range(n):
        char_i = A[i]
        for c in sorted(counts.keys()):
            if c >= char_i:
                break
            if counts[c] > 0:
                counts[c] -= 1
                denom = 1
                for cnt in counts.values():
                    denom = (denom * inv[cnt]) % MOD
                num = fact[n - 1 - i]
                rank = (rank + num * denom) % MOD
                counts[c] += 1
        counts[char_i] -= 1
        if counts[char_i] == 0:
            del counts[char_i]
    return rank

# Problem 18: athMagicalNumber
def ref_athMagicalNumber(A, B, C):
    MOD = 10**9 + 7
    L = (B * C) // math.gcd(B, C)
    low, high = 1, A * min(B, C)
    ans = high
    while low <= high:
        mid = (low + high) // 2
        cnt = mid // B + mid // C - mid // L
        if cnt >= A:
            ans = mid
            high = mid - 1
        else:
            low = mid + 1
    return ans % MOD

# Problem 19: sortedArrayToBST
def ref_sortedArrayToBST(A):
    def build(l, r):
        if l > r:
            return None
        mid = (l + r) // 2
        node = TreeNode(A[mid])
        node.left = build(l, mid - 1)
        node.right = build(mid + 1, r)
        return node
    return build(0, len(A) - 1)

# Problem 20: checkForBSTWithOneChild
def ref_checkForBSTWithOneChild(A):
    min_val, max_val = -float('inf'), float('inf')
    for i in range(len(A) - 1):
        cur = A[i]
        nxt = A[i + 1]
        if nxt < cur:
            max_val = cur
        else:
            min_val = cur
        for j in range(i + 1, len(A)):
            if not (min_val <= A[j] <= max_val):
                return "NO"
    return "YES"

# Problem 21: searchInBST
def ref_searchInBST(A_str, B):
    root = parse_tree(A_str)
    cur = root
    while cur:
        if cur.val == B:
            return 1
        elif B < cur.val:
            cur = cur.left
        else:
            cur = cur.right
    return 0

# Problem 22: validBST
def ref_validBST(A_str):
    root = parse_tree(A_str)
    def check(node, min_val, max_val):
        if not node:
            return True
        if not (min_val < node.val < max_val):
            return False
        return check(node.left, min_val, node.val) and check(node.right, node.val, max_val)
    return 1 if check(root, -float('inf'), float('inf')) else 0

# Problem 23: largestBSTSubtree
def ref_largestBSTSubtree(A_str):
    root = parse_tree(A_str)
    max_size = 0
    def dfs(node):
        nonlocal max_size
        if not node:
            return (True, 0, float('inf'), -float('inf'))
        is_l, sz_l, min_l, max_l = dfs(node.left)
        is_r, sz_r, min_r, max_r = dfs(node.right)
        if is_l and is_r and max_l < node.val < min_r:
            sz = sz_l + sz_r + 1
            max_size = max(max_size, sz)
            return (True, sz, min(min_l, node.val), max(max_r, node.val))
        return (False, 0, 0, 0)
    dfs(root)
    return max_size

# Problem 24: deleteNodeInBST
def ref_deleteNodeInBST(A_str, B):
    root = parse_tree(A_str)
    def delete(node, val):
        if not node:
            return None
        if val < node.val:
            node.left = delete(node.left, val)
        elif val > node.val:
            node.right = delete(node.right, val)
        else:
            if not node.left:
                return node.right
            if not node.right:
                return node.left
            pred = node.left
            while pred.right:
                pred = pred.right
            node.val = pred.val
            node.left = delete(node.left, pred.val)
        return node
    root = delete(root, B)
    return serialize_tree(root)

# Problem 25: kthSmallestInBST
def ref_kthSmallestInBST(A_str, B):
    root = parse_tree(A_str)
    stack = []
    cur = root
    while stack or cur:
        while cur:
            stack.append(cur)
            cur = cur.left
        cur = stack.pop()
        B -= 1
        if B == 0:
            return cur.val
        cur = cur.right
    return -1

# Problem 26: pathToGivenNode
def ref_pathToGivenNode(A_str, B):
    root = parse_tree(A_str)
    path = []
    def dfs(node):
        if not node:
            return False
        path.append(node.val)
        if node.val == B:
            return True
        if dfs(node.left) or dfs(node.right):
            return True
        path.pop()
        return False
    dfs(root)
    return path

# Problem 27: morrisInorderTraversal
def ref_morrisInorderTraversal(A_str):
    root = parse_tree(A_str)
    res = []
    cur = root
    while cur:
        if not cur.left:
            res.append(cur.val)
            cur = cur.right
        else:
            pre = cur.left
            while pre.right and pre.right != cur:
                pre = pre.right
            if not pre.right:
                pre.right = cur
                cur = cur.left
            else:
                pre.right = None
                res.append(cur.val)
                cur = cur.right
    return res

# Problem 28: twoSumBST
def ref_twoSumBST(A_str, B):
    root = parse_tree(A_str)
    seen = set()
    found = False
    def dfs(node):
        nonlocal found
        if not node or found:
            return
        if (B - node.val) in seen:
            found = True
            return
        seen.add(node.val)
        dfs(node.left)
        dfs(node.right)
    dfs(root)
    return 1 if found else 0

# Problem 29: commonNodesInTwoBST
def ref_commonNodesInTwoBST(A_str, B_str):
    rootA = parse_tree(A_str)
    rootB = parse_tree(B_str)
    MOD = 1000000007
    valsA = set()
    def get_vals(node, s):
        if not node:
            return
        get_vals(node.left, s)
        s.add(node.val)
        get_vals(node.right, s)
    get_vals(rootA, valsA)
    total = 0
    def check_and_sum(node):
        nonlocal total
        if not node:
            return
        check_and_sum(node.left)
        if node.val in valsA:
            total = (total + node.val) % MOD
        check_and_sum(node.right)
    check_and_sum(rootB)
    return total

# Problem 30: bstNodesInRange
def ref_bstNodesInRange(A_str, B, C):
    root = parse_tree(A_str)
    count = 0
    def dfs(node):
        nonlocal count
        if not node:
            return
        if B <= node.val <= C:
            count += 1
        if node.val > B:
            dfs(node.left)
        if node.val < C:
            dfs(node.right)
    dfs(root)
    return count

# Problem 31: distanceBetweenNodesOfBST
def ref_distanceBetweenNodesOfBST(A_str, B, C):
    root = parse_tree(A_str)
    if not root:
        return 0
    if B > C:
        B, C = C, B
    curr = root
    while curr:
        if curr.val > C:
            curr = curr.left
        elif curr.val < B:
            curr = curr.right
        else:
            break
    lca = curr
    if not lca:
        return 0
    def dist_from(node, target):
        d = 0
        while node and node.val != target:
            d += 1
            if target < node.val:
                node = node.left
            else:
                node = node.right
        return d
    return dist_from(lca, B) + dist_from(lca, C)

SOLVERS = {
    'find-leaves-of-binary-tree': lambda inp: ref_findLeaves(inp['A']),
    'tower-of-hanoi': lambda inp: ref_towerOfHanoi(int(inp['A'])),
    'check-palindrome-recursion': lambda inp: ref_isPalindrome(inp['A']),
    'count-good-subsequences': lambda inp: ref_countGoodSubsequences(json.loads(inp['A']) if isinstance(inp['A'], str) else inp['A']),
    'ncr-mod-m': lambda inp: ref_ncr_mod_m(int(inp['A']), int(inp['B']), int(inp['C'])),
    'grid-unique-paths': lambda inp: ref_gridUniquePaths(int(inp['A']), int(inp['B'])),
    'pascal-triangle': lambda inp: ref_pascalTriangle(int(inp['A'])),
    'consecutive-numbers-sum': lambda inp: ref_consecutiveNumbersSum(int(inp['A'])),
    'sorted-permutation-rank': lambda inp: ref_sortedPermutationRank(inp['A']),
    'combinations': lambda inp: ref_combinations(int(inp['A']), int(inp['B'])),
    'excel-column-title': lambda inp: ref_excelColumnTitle(int(inp['A'])),
    'very-large-power': lambda inp: ref_veryLargePower(int(inp['A']), int(inp['B'])),
    'ncr-mod-p': lambda inp: ref_ncr_mod_p(int(inp['A']), int(inp['B']), int(inp['C'])),
    'prime-modulo-inverse': lambda inp: ref_primeModuloInverse(int(inp['A']), int(inp['B'])),
    'yet-another-matrix-question': lambda inp: ref_yetAnotherMatrixQuestion(int(inp['A']), int(inp['B'])),
    'excel-column-number': lambda inp: ref_excelColumnNumber(inp['A']),
    'sorted-permutation-rank-with-repeats': lambda inp: ref_sortedPermutationRankWithRepeats(inp['A']),
    'ath-magical-number': lambda inp: ref_athMagicalNumber(int(inp['A']), int(inp['B']), int(inp['C'])),
    'sorted-array-to-balanced-bst': lambda inp: serialize_tree(ref_sortedArrayToBST(json.loads(inp['A']) if isinstance(inp['A'], str) else inp['A'])),
    'check-for-bst-with-one-child': lambda inp: ref_checkForBSTWithOneChild(json.loads(inp['A']) if isinstance(inp['A'], str) else inp['A']),
    'search-in-bst': lambda inp: ref_searchInBST(inp['A'], int(inp['B'])),
    'valid-binary-search-tree': lambda inp: ref_validBST(inp['A']),
    'largest-bst-subtree': lambda inp: ref_largestBSTSubtree(inp['A']),
    'delete-a-node-in-bst': lambda inp: ref_deleteNodeInBST(inp['A'], int(inp['B'])),
    'kth-smallest-element-in-bst': lambda inp: ref_kthSmallestInBST(inp['A'], int(inp['B'])),
    'path-to-given-node': lambda inp: ref_pathToGivenNode(inp['A'], int(inp['B'])),
    'morris-inorder-traversal': lambda inp: ref_morrisInorderTraversal(inp['A']),
    'two-sum-bst': lambda inp: ref_twoSumBST(inp['A'], int(inp['B'])),
    'common-nodes-in-two-bst': lambda inp: ref_commonNodesInTwoBST(inp['A'], inp['B']),
    'bst-nodes-in-a-range': lambda inp: ref_bstNodesInRange(inp['A'], int(inp['B']), int(inp['C'])),
    'distance-between-nodes-of-bst': lambda inp: ref_distanceBetweenNodesOfBST(inp['A'], int(inp['B']), int(inp['C']))
}

def solve(problem_id, input_dict):
    if problem_id not in SOLVERS:
        raise ValueError(f"Unknown problem ID: {problem_id}")
    raw_res = SOLVERS[problem_id](input_dict)
    return normalize_output(raw_res)

def validate_custom(problem_id, input_dict, user_output):
    if problem_id == "sorted-array-to-balanced-bst":
        A = json.loads(input_dict["A"]) if isinstance(input_dict["A"], str) else input_dict["A"]
        tree = parse_tree(user_output)
        if not tree and len(A) > 0:
            return False, "Returned tree is null but input is non-empty."
        
        def is_bst(node, mn, mx):
            if not node:
                return True
            if not (mn < node.val < mx):
                return False
            return is_bst(node.left, mn, node.val) and is_bst(node.right, node.val, mx)
        
        def check_bal(node):
            if not node:
                return True, 0
            bl, hl = check_bal(node.left)
            br, hr = check_bal(node.right)
            return (bl and br and abs(hl - hr) <= 1, 1 + max(hl, hr))
        
        def inord(node):
            if not node:
                return []
            return inord(node.left) + [node.val] + inord(node.right)
        
        if not is_bst(tree, -float('inf'), float('inf')):
            return False, "Returned tree is not a valid Binary Search Tree (BST violation)."
        bal, _ = check_bal(tree)
        if not bal:
            return False, "Returned tree is not height-balanced."
        seq = inord(tree)
        if seq != A:
            return False, f"Inorder traversal of returned tree ({seq}) does not match input array ({A})."
        return True, "Valid height-balanced BST matching input."
    
    return True, "Passed"
