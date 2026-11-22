from api._util import BaseAPIHandler
from backend.app import get_problems_data, load_user_data

class handler(BaseAPIHandler):
    def do_GET(self):
        problems_data, _ = get_problems_data()
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
