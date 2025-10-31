
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:5173/")

    # Wait for the project to load by waiting for the project title to be visible
    page.wait_for_selector("h1", timeout=60000)

    # Scroll to the bottom of the page to ensure the template gallery is in view
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")

    # The Template Gallery starts expanded. We'll find the section that contains the text "Template Library"
    # and then find the "Hide library" button within it.
    template_library_section = page.locator("section", has=page.locator("div:has-text('Template Library')")).first
    hide_library_button = template_library_section.locator('button:has-text("Hide library")')
    hide_library_button.wait_for(state="visible", timeout=30000)

    # Now that we know the library is open, click on a specific template.
    magic_system_template = page.locator('button:has-text("MagicSystem")').first
    magic_system_template.wait_for(state="visible", timeout=15000)
    magic_system_template.click()

    # After clicking, a new artifact should be created and selected.
    # Wait for the ArtifactDetail component to appear with the new title.
    artifact_detail_title = page.locator('h2:has-text("MagicSystem")')
    artifact_detail_title.wait_for(state="visible", timeout=15000)

    # Take a screenshot showing the newly created artifact.
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
