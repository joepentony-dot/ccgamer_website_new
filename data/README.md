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
