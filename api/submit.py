import time
from api._util import BaseAPIHandler
from backend.app import get_problems_data, get_test_suites, load_user_data, save_user_data, run_judge

class handler(BaseAPIHandler):
    def do_POST(self):
        data = self.read_json()
        pid = data.get('problemId')
        code = data.get('code', '')
        language = data.get('language', 'cpp')

        problems_data, problems_dict = get_problems_data()
        test_suites = get_test_suites()

        if pid not in problems_dict:
            self.send_json({"error": "Unknown problem ID"}, status=400)
            return

        prob = problems_dict[pid]
        tcs = test_suites.get(pid, prob.get('examples', []))

        res = run_judge(prob, code, tcs, language=language)

        user_data = load_user_data()
        verdict = res.get('verdict', 'Error')

        submission_record = {
            "id": f"sub_{int(time.time()*1000)}",
            "problem_id": pid,
            "problem_title": prob['title'],
            "verdict": verdict,
            "passed_count": res.get('passed_count', 0),
            "total_count": res.get('total_count', len(tcs)),
            "runtime_ms": res.get('total_time_ms', 0),
            "language": language,
            "timestamp": time.time(),
            "code": code
        }

        user_data['submissions'].append(submission_record)

        if verdict == 'Accepted':
            if pid not in user_data['solved']:
                user_data['solved'].append(pid)
        else:
            if pid not in user_data['attempted'] and pid not in user_data['solved']:
                user_data['attempted'].append(pid)

        save_user_data(user_data)
        self.send_json(res)
