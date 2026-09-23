# Cloud ledger

GitHub Issues stay the issue tracker (`issue-tracker.md`). A cloud agent
records completion in a milestone ledger so a human or a local agent can close
the GitHub issue. The spec stays on the GitHub issue: the ledger stores the
issue number, title, pull request link, and status.

Publishing a new ticket still means `gh issue create` from a token that can
write. The ledger is the completion checklist for issues that already exist.

## When to read this

- Starting work on a GitHub milestone from a cloud agent.
- Updating a ledger row after a pull request exists.
- Closing GitHub issues a cloud agent marked ready.

## Files

One file per milestone: `docs/agents/milestones/phase-<n>.md`. Create it when
the first issue in that milestone is picked up. Row order is the working
sequence. Columns:

| Issue | Title | PR | Status |

## Status

| Status           | Meaning                                                                                       | Who sets it                   |
| ---------------- | --------------------------------------------------------------------------------------------- | ----------------------------- |
| `open`           | Not started                                                                                   | Created with the file         |
| `in-progress`    | Branch exists; acceptance criteria are still open                                             | Cloud agent, when work starts |
| `pr-open`        | Pull request URL is in the row; acceptance criteria are still open                            | Cloud agent                   |
| `ready-to-close` | Every acceptance criterion on the GitHub issue is met, and the pull request URL is in the row | Cloud agent                   |
| `closed`         | GitHub issue is closed                                                                        | Human or local agent          |

## Cloud agent

1. Read the milestone file. Work the next `open` row, or the row the human named.
2. Set that row to `in-progress` on the branch that does the work.
3. Put the pull request URL in the row when the pull request exists. Use `pr-open` while any acceptance criterion is still open. Use `ready-to-close` only when every acceptance criterion on the GitHub issue is met.
4. When the issue is fully done, include `Closes #<n>` in the pull request body so merging closes the GitHub issue.
5. Record the claim in the ledger. The GitHub issue stays open until a human or local agent closes it, or until that merge closes it.

Done when the row status matches the pull request, and `ready-to-close` appears only after the issue's acceptance criteria are met.

## Local agent or human

1. List rows in `ready-to-close`.
2. For each row, confirm the pull request exists and the acceptance criteria on the GitHub issue hold.
3. Merge when the review is accepted. A body that contains `Closes #<n>` closes the issue on merge.
4. If the issue is still open after merge, close it: `gh issue close <n> --comment "Shipped in <pr-url>"`.
5. Set the ledger row to `closed`.

Done when every `ready-to-close` row is either still waiting on an unmerged pull request, or the GitHub issue is closed and the row says `closed`.
