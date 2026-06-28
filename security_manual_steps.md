# Windows Sandbox Authorization Manual Steps

Use these steps when Codex tool calls fail on Windows with authorization or process launch errors such as:

- `windows sandbox: runner error: CreateProcessAsUserW failed: 5`
- `Access is denied`
- repeated file-read failures that succeed only after `sandbox_permissions: "require_escalated"`

## What Happened Here

In this OEE workspace, the issue was not Supabase authentication and not an app bug. The Windows sandbox blocked process creation for normal tool calls. Escalated/approved reads worked, so authorization was worked around for the session, but the underlying Windows permission condition may still need local settings changes if it repeats.

## Manual Windows Checks

1. Restart the terminal, IDE, or Codex host app as a normal user first.
2. If the same failure repeats, run the terminal, IDE, or Codex host app once as Administrator and retry the same read/search command.
3. Open Windows Security -> Virus & threat protection -> Ransomware protection -> Controlled folder access.
4. If Controlled folder access is on, allow the Codex host app, terminal, PowerShell, Node, Python, and any project runtime that Codex launches.
5. Open Windows Security -> App & browser control -> Exploit protection -> Program settings.
6. Check whether the Codex host app, PowerShell, Node, or Python has custom mitigations that block child processes. Remove unusual overrides or add a clean allow rule.
7. Check third-party antivirus or endpoint protection quarantine/block logs for Codex, PowerShell, Node, Python, and the project folder.
8. Confirm the project folder permissions allow the current Windows user to read and write:
   - Right-click the project folder -> Properties -> Security.
   - Ensure the current user has Read, Write, and Modify permissions.
9. Avoid placing active Codex workspaces inside heavily protected folders such as `C:\Windows`, `C:\Program Files`, synced enterprise folders with strict policies, or ransomware-protected document folders.
10. Reboot Windows after changing security or endpoint protection rules, then retry the exact command that failed.

## Codex Behavior To Use Next Time

When this failure appears again:

1. State that the Windows sandbox authorization is not fully solved unless the same command works without escalation.
2. Retry important commands with `sandbox_permissions: "require_escalated"` and a concise justification.
3. If escalation succeeds, explain that the session is unblocked but the local Windows permission issue may remain.
4. Provide the manual steps above instead of repeatedly retrying the same failing sandboxed command.
