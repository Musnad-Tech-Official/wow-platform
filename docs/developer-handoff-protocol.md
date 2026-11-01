# MUSNAD-WOW — Developer Conversation Handoff Protocol

**Status:** Accepted process, **no developer assignments or task branches yet**.

## 1. Authority and roles

The project owner approves the complete allocation of existing W00–W09 work packages to exactly three developers in the parent conversation. The official package boundaries remain `docs/ui-workstreams.md` and Issues #10–#19, even when a package involves several applications. This file does not assign owners.

Each developer begins a separate ChatGPT conversation **branched from the parent discussion** after allocation. The assistant's first reply must be self-contained and follow this order:

1. Developer identifier, assigned W## package IDs, boundaries and other owners' protected paths.
2. Full map of that developer's tasks **in dependency order**, milestones, upstream/downstream interfaces and acceptance/definition-of-done.
3. Links to approved UI and technical contracts, GitHub issues and relevant current `main` commit; dependencies on W00, staging and shared contracts.
4. Branch/PR naming and test commands; when to stop, request a review and integrate after owner approval.
5. **Only the first concrete executable command for the first task**. Do not dump all future commands in the opening reply.

## 2. Incremental task cycle

After the developer returns command output, inspect it; diagnose any failure before progressing. Work in small, verifiable increments. Validate a working, accessible RTL/light/dark page and its backend contract, not a placeholder claiming success. Record changes and tests in a scoped PR referencing its W## issue. Completion of a task is not inferred from optimistic terminal output alone: require changed files/commit/CI and manual acceptance where applicable.

When a dependency or shared component is missing, propose a dedicated coordinated change. Never edit a fellow developer's assigned feature scope without coordination. No silent main merges, no uncontrolled force pushes, and no branch squashing that loses ownership evidence. Rebase or merge latest main only after inspecting conflicting file edits.

## 3. Cross-conversation integration

Separate ChatGPT conversations are not shared state. Every completed task is summarized back into the parent conversation, with PR URL, commit SHA, tests, open issues and changed contracts. The parent discussion maintains the integration sequence and authorizes the next shared merge or assignment adjustment.

`W00` database security checks can run in parallel with mock-based UI work but **must pass before real private data or release**. `W09` navigation/acceptance wiring follows primary feature route readiness; it has exclusive coordinated access to shared app navigation layouts.

## 4. Gate to open developer conversations

- Owner approves three-person allocation and package dependency order.
- Repo-wide CI confirmed (or explicitly flagged not yet running) and branch/review governance agreed.
- Original SQL migration evidence and the intended staging environment are identified; if not, W00 operates under a documented blocker and mock-only development constraints.
- Each developer receives the same approved baseline, current `main` and links to source documents, not unstated recollections.

No developer conversation is created by adding this document. This is a procedural contract for the subsequent owner-approved allocation.
