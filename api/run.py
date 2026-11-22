from api._util import BaseAPIHandler
from backend.app import get_problems_data, run_judge, solve

class handler(BaseAPIHandler):
    def do_POST(self):
        data = self.read_json()
        pid = data.get('problemId')
        code = data.get('code', '')
        custom_tcs = data.get('testcases')
        language = data.get('language', 'cpp')

        _, problems_dict = get_problems_data()
        if pid not in problems_dict:
            self.send_json({"error": "Unknown problem ID"}, status=400)
            return

        prob = problems_dict[pid]

        if custom_tcs and len(custom_tcs) > 0:
            testcases = []
            for tc in custom_tcs:
                expected = tc.get('expected')
                if not expected and expected != 0 and expected != False:
                    try:
                        expected = solve(pid, tc['input'])
                    except Exception as e:
                        expected = None
                testcases.append({
                    "input": tc['input'],
                    "expected": expected
                })
        else:
            testcases = prob.get('examples', [])

        res = run_judge(prob, code, testcases, language=language)
        self.send_json(res)
