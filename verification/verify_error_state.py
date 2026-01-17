
from playwright.sync_api import sync_playwright, expect

def verify_error_state():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173?guest=1")

            try:
                page.wait_for_selector("#create-project-form", timeout=5000)
            except:
                start_btn = page.get_by_role("button", name="Start a new world")
                if start_btn.is_visible():
                    start_btn.click()
                else:
                    page.get_by_title("Create New Project").click()
                page.wait_for_selector("#create-project-form")

            create_btn = page.get_by_role("button", name="Create Project")
            create_btn.click()

            page.screenshot(path="verification/error_state.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_error_state()
