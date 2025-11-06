## Bug Report

**File:** `code/App.tsx`

**Line Number:** 478

**Description:** The "World Builder" achievement is described as "Create your first project," but the unlocking condition was `projects.length > 2`, meaning a user would have to create three projects to unlock it. This is a logical error that misaligns the game's achievements with the user's actions.

**Proposed Fix:** Change the condition to `projects.length >= 1` so that the achievement unlocks after the user creates their first project, as the description implies.
