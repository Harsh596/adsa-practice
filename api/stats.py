from api._util import BaseAPIHandler
from backend.app import get_problems_data, load_user_data

class handler(BaseAPIHandler):
    def do_GET(self):
        problems_data, _ = get_problems_data()
        user_data = load_user_data()
        solved = set(user_data.get('solved', []))
        attempted = set(user_data.get('attempted', []))

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
