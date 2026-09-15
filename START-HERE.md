# START HERE

1. Extract this pack as the root of the new `lemdiklat-lms` repository.
2. Open that root folder in VS Code/Codex.
3. Do not ask Codex to build the whole LMS. Start only with TASK-000.
4. Use this first prompt:

```
Read AGENTS.md first.
Then read tasks/MASTER-CHECKLIST.md and tasks/TASK-000-foundation.md, plus every architecture document referenced by TASK-000.
Inspect the repository and provide a concise plan.
Implement TASK-000 only.
Run the required lint, typecheck, tests and builds.
Update TASK-000 and MASTER-CHECKLIST only from verified results; set the task to REVIEW, never DONE.
Do not implement TASK-001 or any LMS business feature.
Report the results and stop.
```

5. After Codex reaches REVIEW, have the implementation reviewed before marking DONE or starting TASK-001.
6. For future sessions after the workflow has been established, the standard command can be:

```
Read AGENTS.md and continue the project.
```

That command means Codex must read `AGENTS.md` and `tasks/MASTER-CHECKLIST.md`, determine the next eligible unfinished task from checklist status/order/dependencies/architecture prerequisites, execute one task only, verify it, update documentation/checklist evidence, move the task to REVIEW, and stop.
