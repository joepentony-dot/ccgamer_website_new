"""Download quiz spreadsheet CSV exports.

This helper fetches two sheets ("Sheet1" and "Quiz Sets") from the
public spreadsheet and writes them into the local ``data`` directory.
"""
from __future__ import annotations

import urllib.parse
import urllib.request
from pathlib import Path

SPREADSHEET_ID = "1jGCrMptdiGx3CZKJJVYSY4uqfnshWYp8C-eH0pAclk0"
SHEETS = {
    "questions": "Sheet1",
    "quiz_sets": "Quiz Sets",
}


def _sheet_url(sheet_name: str) -> str:
    encoded_sheet = urllib.parse.quote(sheet_name)
    return (
        "https://docs.google.com/spreadsheets/d/"
        f"{SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet={encoded_sheet}"
    )


def download_sheet(sheet_name: str, output_path: Path) -> None:
    """Download a sheet to ``output_path``.

    Parameters
    ----------
    sheet_name: str
        Name of the sheet within the spreadsheet.
    output_path: Path
        Destination path for the downloaded CSV file.
    """

    url = _sheet_url(sheet_name)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {sheet_name!r} -> {output_path}")
    try:
        with urllib.request.urlopen(url) as response:
            content = response.read()
    except Exception as exc:  # noqa: BLE001 - provide context for download errors
        raise SystemExit(f"Failed to download {sheet_name!r}: {exc}") from exc

    output_path.write_bytes(content)


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    data_dir = repo_root / "data"

    for filename, sheet_name in SHEETS.items():
        output_path = data_dir / f"{filename}.csv"
        download_sheet(sheet_name, output_path)


if __name__ == "__main__":
    main()
