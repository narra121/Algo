import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

IDS = [
    "two-pointers", "sliding-window", "binary-search", "bfs",
    "dfs-backtracking", "dynamic-programming", "merge-sort", "quick-sort",
    "heap", "union-find", "dijkstra", "topological-sort",
]

BOXES = """() => {
    const out = {};
    [...document.querySelectorAll('.controls .ctl')].forEach((b, i) => {
        const r = b.getBoundingClientRect();
        out['btn' + i] = [
            Math.round((r.x + window.scrollX) * 10) / 10,
            Math.round((r.y + window.scrollY) * 10) / 10,
            Math.round(r.width * 10) / 10,
        ];
    });
    return out;
}"""

failed = False
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    for aid in IDS:
        page.goto(f"http://localhost:5173/#/algo/{aid}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(900)  # let the 0.6s entrance animation finish
        base = page.evaluate(BOXES)
        # toggle play/pause (label swap), then step through everything
        page.locator(".ctl.play").click()
        page.locator(".ctl.play").click()
        moves = []
        if page.evaluate(BOXES) != base:
            moves.append("play-toggle")
        nxt = page.locator(".controls button", has_text="Next")
        step = 0
        while nxt.is_enabled() and step < 60:
            nxt.click()
            step += 1
            cur = page.evaluate(BOXES)
            if cur != base:
                moves.append(f"step{step}")
                base = cur  # report each distinct shift once
        if moves:
            failed = True
            print(f"{aid:22s} MOVED at: {', '.join(moves[:8])}")
        else:
            print(f"{aid:22s} stable across play toggle + {step} steps")
    browser.close()
sys.exit(1 if failed else 0)
