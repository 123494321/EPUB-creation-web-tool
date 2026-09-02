import http.server, socketserver, webbrowser, os, sys
PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=DIRECTORY, **kwargs)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
def run():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(('', PORT), Handler) as httpd:
        url = f'http://localhost:{PORT}'
        print(f'Server running at {url}')
        webbrowser.open(url)
        try: httpd.serve_forever()
        except KeyboardInterrupt: sys.exit(0)
if __name__ == '__main__': run()