
from playwright.sync_api import Page, expect, sync_playwright

def verify_profile_tooltip(page: Page):
    # Navigate to the app (using the preview server port)
    # The app starts in guest mode by default or we can force it.
    # The memory says "?guest=1" allows creating a new project.
    # We need to get to the main dashboard where the header is visible.

    # Wait for the app to load
    page.goto("http://localhost:4173?guest=1")

    # Wait for the "Create Project" modal or the main UI.
    # If in guest mode, it might show a modal.
    # Let's see if we can close any modal or if the header is visible.

    # Try to find the profile button in the header.
    # It has aria-label="Open profile drawer"
    profile_button = page.get_by_label("Open profile drawer")

    # Wait for it to be visible
    expect(profile_button).to_be_visible(timeout=10000)

    # Check if the title attribute exists and has the correct value
    title_value = profile_button.get_attribute("title")
    print(f"Title attribute value: {title_value}")

    if title_value != "Open profile drawer":
        raise AssertionError(f"Expected title 'Open profile drawer', but got '{title_value}'")

    # Take a screenshot
    page.screenshot(path="/home/jules/verification/header_tooltip.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_profile_tooltip(page)
        finally:
            browser.close()
