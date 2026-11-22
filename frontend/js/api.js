/**
 * API Client for GCC Code (LeetCode backend)
 */

const urlApiParam = (typeof window !== 'undefined' && window.location) ? new URLSearchParams(window.location.search).get('api') : null;
if (urlApiParam) {
    try { localStorage.setItem('gcc_api_base', urlApiParam); } catch (e) {}
}

const API_BASE = (typeof window !== 'undefined' && window.GCC_API_BASE) || 
    (typeof localStorage !== 'undefined' ? localStorage.getItem('gcc_api_base') : '') || '';

const API = {
    async getProblems() {
        const res = await fetch(`${API_BASE}/api/problems`);
        if (!res.ok) throw new Error('Failed to fetch problems');
        return await res.json();
    },

    async getProblem(id) {
        const res = await fetch(`${API_BASE}/api/problems/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error('Failed to fetch problem details');
        return await res.json();
    },

    async runCode(problemId, code, testcases = null, language = 'cpp') {
        const res = await fetch(`${API_BASE}/api/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: jsonStringifyWithBigInt({ problemId, code, testcases, language })
        });
        if (!res.ok) throw new Error('Server error running code');
        return await res.json();
    },

    async submitCode(problemId, code, language = 'cpp') {
        const res = await fetch(`${API_BASE}/api/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: jsonStringifyWithBigInt({ problemId, code, language })
        });
        if (!res.ok) throw new Error('Server error submitting solution');
        return await res.json();
    },

    async getSubmissions(problemId = null) {
        const url = problemId ? `${API_BASE}/api/submissions?problemId=${encodeURIComponent(problemId)}` : `${API_BASE}/api/submissions`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch submissions');
        return await res.json();
    },

    async getStats() {
        const res = await fetch(`${API_BASE}/api/stats`);
        if (!res.ok) throw new Error('Failed to fetch stats');
        return await res.json();
    },

    async resetProgress() {
        const res = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to reset progress');
        return await res.json();
    }
};

function jsonStringifyWithBigInt(obj) {
    return JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    );
}
