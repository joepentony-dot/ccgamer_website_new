# Quiz data downloads

This folder stores CSV exports from the Google Sheet at
`https://docs.google.com/spreadsheets/d/1jGCrMptdiGx3CZKJJVYSY4uqfnshWYp8C-eH0pAclk0`.

Use `scripts/download_quiz_sheets.py` to pull the two sheets referenced by
stakeholders:

- `Sheet1` (Questions)
- `Quiz Sets`

The script writes the files as `data/questions.csv` and `data/quiz_sets.csv`.

> Note: the current execution environment does not allow outbound HTTPS
> connections, so the files could not be downloaded here. Run the script in an
> environment with network access to fetch the CSVs.

## Building quiz-data.json

Once the CSV exports are present, run `scripts/build_quiz_data.py` to combine
them into the JSON payload used by the quiz UI:

```bash
python scripts/build_quiz_data.py --data-dir data --output quiz/quiz-data.json
```

The script parses quiz sets (ID, name, optional icon, question count, and
difficulty/description if present) and builds questions grouped by set ID.
Each question is assigned a stable ID of `<setId>-<n>` with trimmed options and
a zero-based `correctIndex` derived from the spreadsheet's answer index.

### Quick checklist

1. Run `python scripts/download_quiz_sheets.py` in a networked environment to
   pull the latest "Sheet1" and "Quiz Sets" CSV exports into `data/`.
   - The questions sheet column that links to a set can be named **Set ID**,
     **Quiz Set ID**, **set_id**, or **Quiz Set** — the builder accepts all of
     them.
2. Run `python scripts/build_quiz_data.py --data-dir data --output quiz/quiz-data.json`
   to regenerate the bundled quiz payload consumed by `quiz-loader.js`.
3. Copy the refreshed `quiz/quiz-data.json` alongside the deployed `/quiz/`
   folder so the quiz page can load without hitting the old Apps Script URL.

The leaderboard view remains separate from this data pipeline; it reads from
local storage only and does not rely on the spreadsheet or API responses.
