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
        has_problem = page.locator(".problem-card .pstatement").count() == 1
        aha_len = len(page.locator(".aha-text").inner_text()) if page.locator(".aha-text").count() else 0
        naive_lines = page.locator(".naive-card .code-line").count()
        naive_chips = page.locator(".naive-card .chip.bad").count()
        # step through a few states to exercise the visualizer
        for _ in range(5):
            nxt = page.locator("button", has_text="Next")
            if nxt.is_enabled():
                nxt.click()
        narration = page.locator(".narration").inner_text()
        ok = (rows >= 10 and len(narration) > 0 and has_problem and aha_len > 40
              and naive_lines >= 4 and naive_chips == 2)
        print(f"{aid:22s} problems={rows:2d} problemCard={has_problem} ahaChars={aha_len:3d} "
              f"naiveLines={naive_lines} naiveChips={naive_chips} {'OK' if ok else 'FAIL'}")
        if not ok:
            errors.append(f"{aid}: rows={rows} problemCard={has_problem} ahaChars={aha_len} naive={naive_lines}/{naive_chips}")

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
