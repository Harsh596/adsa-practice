import urllib.parse
from api._util import BaseAPIHandler
from backend.app import load_user_data

class handler(BaseAPIHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        user_data = load_user_data()
        subs = user_data.get('submissions', [])
        pid = query.get('problemId', [None])[0]
        if pid:
            subs = [s for s in subs if s.get('problem_id') == pid]
        self.send_json({"submissions": list(reversed(subs))[:50]})
