import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

IDS = [
    "two-pointers", "sliding-window", "binary-search", "bfs",
    "dfs-backtracking", "dynamic-programming", "merge-sort", "quick-sort",
    "heap", "union-find", "dijkstra", "topological-sort",
]

errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

    page.goto("http://localhost:5173/#/")
    page.wait_for_load_state("networkidle")
    cards = page.locator(".algo-card").count()
    print(f"home: {cards} algorithm cards")
    page.screenshot(path="shot_home.png", full_page=True)

    for aid in IDS:
        page.goto(f"http://localhost:5173/#/algo/{aid}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(150)
        h1 = page.locator(".algo-head h1").inner_text()
        rows = page.locator(".problems tbody tr").count()
        # step through a few states to exercise the visualizer
        for _ in range(5):
            nxt = page.locator("button", has_text="Next")
            if nxt.is_enabled():
                nxt.click()
        narration = page.locator(".narration").inner_text()
        ok = rows >= 10 and len(narration) > 0
        print(f"{aid:22s} h1={h1!r:42s} problems={rows:2d} {'OK' if ok else 'FAIL'}")
        if not ok:
            errors.append(f"{aid}: rows={rows}")

    # screenshots of two representative pages
    for aid in ["bfs", "dijkstra"]:
        page.goto(f"http://localhost:5173/#/algo/{aid}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(200)
        page.screenshot(path=f"shot_{aid}.png", full_page=False)

    browser.close()

if errors:
    print("\nERRORS:")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("\nALL PAGES RENDER CLEAN")
