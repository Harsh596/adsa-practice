import time
from api._util import BaseAPIHandler
from backend.app import save_user_data

class handler(BaseAPIHandler):
    def do_POST(self):
        initial = {
            "solved": [],
            "attempted": [],
            "submissions": [],
            "last_active": time.time(),
            "streak": 1
        }
        save_user_data(initial)
        self.send_json({"status": "success", "message": "Progress reset"})
