---
name: git-for-tools
description: Safely stage and commit changes, then optionally push and create a pull request. Use when a user asks to run git add/git commit and wants interactive control over whether unexpected extra files are included, plus optional prompts to push and open a PR with conventional commit style.
---

# Git Stage Commit Push PR

## Workflow

1. Establish expected scope before staging.
2. Stage only expected files by default.
3. If extra staged files appear, pause and ask whether to include them.
4. Create a conventional commit message from the staged diff.
5. After user confirms, add the commit message as a new entry in `changes.rss` and stage it.
6. Commit (includes `changes.rss`).
7. Ask whether to push.
8. Ask whether to create a PR; if yes, create it with a title/body aligned to conventional commit style.

Use the AskUserQuestion tool to ask the user questions. 

## Step 1: Confirm Expected Files

Use the AskUserQuestion tool to ask the user what should be included in this commit if it is not already explicit.

Use:

```bash
git status --short
```

Treat the user-requested files as the expected set. Any other modified/untracked files are unexpected extras.

## Step 2: Stage Carefully

Prefer explicit staging over broad `git add .`.

- If expected files are known, stage only those paths.
- If expected files are unknown and user asked for all current work, stage all and then validate.

Use:

```bash
git add <expected-path-1> <expected-path-2>
git diff --cached --name-only
```

If `git diff --cached --name-only` contains files not expected in this session, ask:

- Include these extra files in this commit?
- Or unstage them and continue with only expected files?

If the user excludes extras, unstage only those files:

```bash
git restore --staged <extra-path>
```

## Step 3: Build Commit Message (Conventional Commit Style)

Use the repository's conventional commit conventions. Default format:

```text
type(scope): subject
```

Rules:

- Keep `type` lowercase and valid (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`, etc.).
- Keep `subject` lowercase, imperative, and without trailing period.
- Add body/footer only when useful.

Before committing:

1. Summarize staged files.
2. Propose the commit message.
3. Ask for confirmation or edits.

Commit only after confirmation — but first, update the changelog (Step 4).

## Step 4: Update changes.rss

After the user confirms the commit message but **before** running `git commit`:

1. Read `changes.rss` at the repository root.
2. Insert a new `<item>` at the top of the `<channel>` element (after the channel metadata like `<lastBuildDate>`, before any existing `<item>` elements):

```xml
<item>
  <title>type(scope): subject</title>
  <description>Commit body if present, otherwise same as title</description>
  <pubDate>RFC 822 date, e.g. Thu, 19 Feb 2026 12:00:00 +0000</pubDate>
</item>
```

3. Update the `<lastBuildDate>` in the channel to the current date in RFC 822 format.
4. Write the updated file.
5. Stage it:

```bash
git add changes.rss
```

Then commit all staged files (including `changes.rss`):

```bash
git commit -m "type(scope): subject"
```

## Step 6: Ask Before Push

Always use the AskUserQuestion tool to  ask whether to push after a successful commit.

If yes, push current branch:

```bash
git push
```

If upstream is missing, set it and push:

```bash
git push --set-upstream origin "$(git branch --show-current)"
```

## Step 7: Ask Before PR Creation

Always use the AskUserQuestion tool to ask whether to create a PR after push decision.

If yes:

1. Draft PR title/body from committed changes using conventional commit style language.
2. Confirm target base branch if needed.
3. Create PR with `gh`.

Example:

```bash
gh pr create --title "type(scope): subject" --body "<summary, testing, context>"
```

If `gh` is not authenticated or unavailable, report it and provide the exact `gh pr create` command for the user.
