from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
WATCH_PATTERNS = ("*.py", "*.js", "*.css", "*.html")
IGNORED_DIRS = {".git", "__pycache__", "outputs", "data", "artifacts"}
POLL_SECONDS = 0.75


def source_snapshot() -> dict[Path, int]:
    snapshot: dict[Path, int] = {}
    for pattern in WATCH_PATTERNS:
        for path in BASE_DIR.rglob(pattern):
            if any(part in IGNORED_DIRS for part in path.relative_to(BASE_DIR).parts):
                continue
            try:
                snapshot[path] = path.stat().st_mtime_ns
            except OSError:
                continue
    return snapshot


def stop_process(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=3)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()


def main() -> None:
    port = sys.argv[1] if len(sys.argv) > 1 else "8001"
    host = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"
    command = [sys.executable, "-u", str(BASE_DIR / "server.py"), port, host]
    snapshot = source_snapshot()
    process: subprocess.Popen[bytes] | None = None

    print("Development auto-reload enabled.")
    try:
        while True:
            if process is None or process.poll() is not None:
                process = subprocess.Popen(command, cwd=BASE_DIR)

            time.sleep(POLL_SECONDS)
            next_snapshot = source_snapshot()
            if next_snapshot == snapshot:
                continue

            changed = sorted(
                path.relative_to(BASE_DIR).as_posix()
                for path in set(snapshot) | set(next_snapshot)
                if snapshot.get(path) != next_snapshot.get(path)
            )
            snapshot = next_snapshot
            print(f"Code changed ({', '.join(changed)}). Restarting server...")
            stop_process(process)
            process = None
    except KeyboardInterrupt:
        pass
    finally:
        if process is not None:
            stop_process(process)


if __name__ == "__main__":
    main()
