import os
import sys
import json
import time
import socket
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

# Support serverless read-only environments (e.g. Vercel / AWS Lambda)
if os.environ.get('VERCEL') or not os.access(BASE_DIR, os.W_OK):
    DATA_DIR = '/tmp/data'
else:
    DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

sys.path.append(BACKEND_DIR)
from judge import run_judge
from reference_solutions import solve, validate_custom

# Load problems and test suites
ENRICHED_PROBLEMS_FILE = os.path.join(BACKEND_DIR, 'problems_enriched.json')
TEST_SUITES_FILE = os.path.join(BACKEND_DIR, 'test_suites.json')
USER_DATA_FILE = os.path.join(DATA_DIR, 'user_data.json')

_CACHED_PROBLEMS_DATA = None
_CACHED_PROBLEMS_DICT = None
_PROBLEMS_MTIME = 0

_CACHED_TEST_SUITES = None
_TEST_SUITES_MTIME = 0

def get_problems_data():
    global _CACHED_PROBLEMS_DATA, _CACHED_PROBLEMS_DICT, _PROBLEMS_MTIME
    try:
        mtime = os.path.getmtime(ENRICHED_PROBLEMS_FILE)
        if _CACHED_PROBLEMS_DATA is None or mtime > _PROBLEMS_MTIME:
            with open(ENRICHED_PROBLEMS_FILE) as f:
                _CACHED_PROBLEMS_DATA = json.load(f)['problems']
                _CACHED_PROBLEMS_DICT = {p['id']: p for p in _CACHED_PROBLEMS_DATA}
                _PROBLEMS_MTIME = mtime
    except Exception as e:
        print(f"Error loading problems: {e}")
    return _CACHED_PROBLEMS_DATA or [], _CACHED_PROBLEMS_DICT or {}

def get_test_suites():
    global _CACHED_TEST_SUITES, _TEST_SUITES_MTIME
    try:
        mtime = os.path.getmtime(TEST_SUITES_FILE)
        if _CACHED_TEST_SUITES is None or mtime > _TEST_SUITES_MTIME:
            with open(TEST_SUITES_FILE) as f:
                _CACHED_TEST_SUITES = json.load(f)
                _TEST_SUITES_MTIME = mtime
    except Exception as e:
        print(f"Error loading test suites: {e}")
    return _CACHED_TEST_SUITES or {}

def load_user_data():
    if not os.path.exists(USER_DATA_FILE):
        initial = {
            "solved": [],
            "attempted": [],
            "submissions": [],
            "last_active": time.time(),
            "streak": 1
        }
        with open(USER_DATA_FILE, 'w') as f:
            json.dump(initial, f, indent=2)
        return initial
    try:
        with open(USER_DATA_FILE) as f:
            return json.load(f)
    except:
        return {"solved": [], "attempted": [], "submissions": [], "streak": 1}

def save_user_data(data):
    with open(USER_DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

class LeetCodeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        raw = self.rfile.read(content_length).decode('utf-8')
        try:
            return json.loads(raw)
        except:
            return {}

    def do_GET(self):
        raw_path = self.headers.get('x-forwarded-uri') or self.headers.get('x-matched-path') or self.path
        parsed = urllib.parse.urlparse(raw_path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        problems_data, problems_dict = get_problems_data()

        # API: List all problems
        if path == '/api/problems':
            user_data = load_user_data()
            solved_set = set(user_data.get('solved', []))
            attempted_set = set(user_data.get('attempted', []))

            results = []
            for p in problems_data:
                pid = p['id']
                status = 'unsolved'
                if pid in solved_set:
                    status = 'solved'
                elif pid in attempted_set:
                    status = 'attempted'

                results.append({
                    "id": p['id'],
                    "title": p['title'],
                    "topic": p.get('topic', ''),
                    "tags": p.get('tags', []),
                    "difficulty": p.get('difficulty', 'Medium'),
                    "status": status,
                    "grader": p.get('grader', 'exact'),
                    "total_testcases": p.get('total_testcases_count', len(p.get('examples', [])))
                })
            self.send_json({"problems": results})
            return

        # API: Get single problem details
        if path.startswith('/api/problems/'):
            pid = path[len('/api/problems/'):].strip('/')
            if pid not in problems_dict:
                self.send_json({"error": "Problem not found"}, status=404)
                return

            prob = problems_dict[pid]
            user_data = load_user_data()
            user_submissions = [s for s in user_data.get('submissions', []) if s.get('problem_id') == pid]

            self.send_json({
                "problem": prob,
                "submissions": list(reversed(user_submissions))[:20]
            })
            return

        # API: Submissions history
        if path == '/api/submissions':
            user_data = load_user_data()
            subs = user_data.get('submissions', [])
            pid = query.get('problemId', [None])[0]
            if pid:
                subs = [s for s in subs if s.get('problem_id') == pid]
            self.send_json({"submissions": list(reversed(subs))[:50]})
            return

        # API: User stats
        if path == '/api/stats':
            user_data = load_user_data()
            solved = set(user_data.get('solved', []))
            attempted = set(user_data.get('attempted', []))

            # Breakdown by difficulty
            diff_counts = {"Easy": {"solved": 0, "total": 0}, "Medium": {"solved": 0, "total": 0}, "Hard": {"solved": 0, "total": 0}}
            topic_counts = {}

            for p in problems_data:
                d = p.get('difficulty', 'Medium')
                t = p.get('topic', 'Other')
                diff_counts[d]["total"] += 1
                if t not in topic_counts:
                    topic_counts[t] = {"solved": 0, "total": 0}
                topic_counts[t]["total"] += 1

                if p['id'] in solved:
                    diff_counts[d]["solved"] += 1
                    topic_counts[t]["solved"] += 1

            self.send_json({
                "total_problems": len(problems_data),
                "total_solved": len(solved),
                "total_attempted": len(attempted),
                "streak": user_data.get('streak', 1),
                "by_difficulty": diff_counts,
                "by_topic": topic_counts
            })
            return

        # Static files or SPA fallback
        filepath = os.path.join(FRONTEND_DIR, path.lstrip('/'))
        if os.path.exists(filepath) and not os.path.isdir(filepath):
            return super().do_GET()
        else:
            # Fallback to index.html for SPA routes
            self.path = '/index.html'
            return super().do_GET()

    def do_POST(self):
        raw_path = self.headers.get('x-forwarded-uri') or self.headers.get('x-matched-path') or self.path
        parsed = urllib.parse.urlparse(raw_path)
        path = parsed.path

        problems_data, problems_dict = get_problems_data()
        test_suites = get_test_suites()

        # API: Run Code (Sample or custom testcases)
        if path == '/api/run':
            data = self.read_json_body()
            pid = data.get('problemId')
            code = data.get('code', '')
            custom_tcs = data.get('testcases')
            language = data.get('language', 'cpp')

            if pid not in problems_dict:
                self.send_json({"error": "Unknown problem ID"}, status=400)
                return

            prob = problems_dict[pid]

            # If user provided testcases, ensure expected output is generated via reference solution if missing
            if custom_tcs and isinstance(custom_tcs, list) and len(custom_tcs) > 0:
                tcs_to_run = []
                for tc in custom_tcs:
                    inp = tc.get('input', {})
                    exp = tc.get('expected')
                    if not exp and prob.get('grader') != 'custom_validator':
                        try:
                            exp = solve(pid, inp)
                        except Exception as e:
                            exp = ""
                    tcs_to_run.append({
                        "input": inp,
                        "expected": exp,
                        "is_sample": True
                    })
            else:
                tcs_to_run = prob.get('sample_testcases', prob.get('examples', []))

            result = run_judge(prob, code, tcs_to_run, language=language, timeout_sec=2.0)
            self.send_json(result)
            return

        # API: Submit Solution (Runs against full test suite)
        if path == '/api/submit':
            data = self.read_json_body()
            pid = data.get('problemId')
            code = data.get('code', '')
            language = data.get('language', 'cpp')

            if pid not in problems_dict:
                self.send_json({"error": "Unknown problem ID"}, status=400)
                return

            prob = problems_dict[pid]
            all_tcs = test_suites.get(pid, prob.get('examples', []))

            result = run_judge(prob, code, all_tcs, language=language, timeout_sec=2.0)

            user_data = load_user_data()
            if pid not in user_data.get('attempted', []):
                user_data.setdefault('attempted', []).append(pid)

            is_accepted = (result.get('verdict') == 'Accepted')
            if is_accepted and pid not in user_data.get('solved', []):
                user_data.setdefault('solved', []).append(pid)

            # Record submission
            submission_entry = {
                "id": str(int(time.time() * 1000)),
                "problem_id": pid,
                "problem_title": prob['title'],
                "status": result.get('verdict', 'Unknown'),
                "runtime_ms": result.get('total_time_ms', 0),
                "passed_count": result.get('passed_count', 0),
                "total_count": result.get('total_count', len(all_tcs)),
                "timestamp": int(time.time()),
                "language": language,
                "code": code
            }
            user_data.setdefault('submissions', []).append(submission_entry)
            save_user_data(user_data)

            self.send_json({
                **result,
                "submission_id": submission_entry["id"],
                "is_solved": (pid in user_data["solved"])
            })
            return

        # API: Reset progress
        if path == '/api/reset':
            save_user_data({"solved": [], "attempted": [], "submissions": [], "streak": 1})
            self.send_json({"message": "Progress reset successfully"})
            return

        self.send_json({"error": "Not found"}, status=404)

def find_free_port(start_port=8085):
    candidate = start_port
    for _ in range(100):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind(('', candidate))
            s.close()
            return candidate
        except OSError:
            candidate += 1
    return start_port

def run_server(port=8085):
    actual_port = find_free_port(port)
    if actual_port != port:
        print(f"⚠️ Port {port} is occupied. Automatically switched to free port: {actual_port}")
    server_address = ('', actual_port)
    httpd = ThreadedHTTPServer(server_address, LeetCodeHandler)
    print(f"==========================================================")
    print(f"⚡ GCC Code server is LIVE at: http://localhost:{actual_port}")
    print(f"==========================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8085))
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    run_server(port)
