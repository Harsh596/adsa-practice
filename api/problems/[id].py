import urllib.parse
from api._util import BaseAPIHandler
from backend.app import get_problems_data, load_user_data

class handler(BaseAPIHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        pid = query.get('id', [None])[0]
        if not pid:
            parts = parsed.path.strip('/').split('/')
            if len(parts) >= 3 and parts[0] == 'api' and parts[1] == 'problems':
                pid = parts[2]
            elif parts:
                pid = parts[-1]

        _, problems_dict = get_problems_data()
        if not pid or pid not in problems_dict:
            self.send_json({"error": "Problem not found"}, status=404)
            return

        prob = problems_dict[pid]
        user_data = load_user_data()
        user_submissions = [s for s in user_data.get('submissions', []) if s.get('problem_id') == pid]

        self.send_json({
            "problem": prob,
            "submissions": list(reversed(user_submissions))[:20]
        })
