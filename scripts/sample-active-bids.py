#!/usr/bin/env python3
import json
import os
import re
import time
from pathlib import Path

import requests

from dropbox_client import get_token

LIST_FOLDER_URL = "https://api.dropboxapi.com/2/files/list_folder"
LIST_FOLDER_CONTINUE_URL = "https://api.dropboxapi.com/2/files/list_folder/continue"
ROOT_PATH = "/West Crow Estimators"
OUTPUT_PATH = Path(os.path.expanduser("~/.openclaw/workspace/dropbox-cache/active-bids-sample.json"))



def dropbox_post(url: str, headers: dict, payload: dict) -> dict:
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    time.sleep(0.5)
    response.raise_for_status()
    return response.json()


def list_folder_all(token: str, path: str) -> list:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    result = dropbox_post(
        LIST_FOLDER_URL,
        headers,
        {"path": path, "recursive": False, "include_media_info": False, "include_deleted": False},
    )
    entries = result.get("entries", [])

    while result.get("has_more"):
        result = dropbox_post(
            LIST_FOLDER_CONTINUE_URL,
            headers,
            {"cursor": result["cursor"]},
        )
        entries.extend(result.get("entries", []))

    return entries


def parse_folder(folder_name: str) -> tuple[str | None, str | None, str]:
    match = re.match(r"^(\d+)\s*-\s*(.+)$", folder_name)
    if not match:
        return None, None, folder_name

    number = match.group(1)
    rest = match.group(2)
    parts = [p.strip() for p in rest.split(" - ") if p.strip()]

    if len(parts) >= 2:
        client = parts[0]
        project = " - ".join(parts[1:])
    else:
        client = None
        project = parts[0] if parts else rest

    return number, client, project


def main() -> None:
    token = get_token()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    root_entries = list_folder_all(token, ROOT_PATH)
    folders = [e for e in root_entries if e.get(".tag") == "folder"]

    candidates = []
    for folder in folders:
        name = folder.get("name", "")
        if name == "1111 COMPLETED" or name.startswith("0") or name.startswith("_"):
            continue
        number, client, project = parse_folder(name)
        if number is None:
            continue
        candidates.append((int(number), folder, client, project))

    candidates.sort(key=lambda item: item[0], reverse=True)
    sample = candidates[:150]

    results = []
    for folder_number, folder, client, project_name in sample:
        folder_name = folder["name"]
        print(f"Processing folder: {folder_name}")

        has_data_file = False
        file_size_kb = 0
        try:
            entries = list_folder_all(token, folder["path_lower"])
            xlsx_files = [
                e for e in entries if e.get(".tag") == "file" and e.get("name", "").lower().endswith(".xlsx")
            ]
            if xlsx_files:
                largest = max(xlsx_files, key=lambda x: x.get("size", 0))
                file_size_kb = int(round(largest.get("size", 0) / 1024))
                has_data_file = largest.get("size", 0) > 15 * 1024
        except Exception:
            has_data_file = False
            file_size_kb = 0

        results.append(
            {
                "folder": folder_name,
                "folder_number": str(folder_number),
                "client": client,
                "project_name": project_name,
                "has_data_file": has_data_file,
                "file_size_kb": file_size_kb,
            }
        )

    OUTPUT_PATH.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Wrote {len(results)} records to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
