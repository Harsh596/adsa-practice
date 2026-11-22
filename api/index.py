from api._util import BaseAPIHandler

class handler(BaseAPIHandler):
    def do_GET(self):
        self.send_json({
            "status": "online",
            "service": "GCC Code API",
            "endpoints": [
                "/api/problems",
                "/api/problems/[id]",
                "/api/stats",
                "/api/submissions",
                "/api/run",
                "/api/submit"
            ]
        })
