#!/usr/bin/env python3
import json
import os
import re
import time
from pathlib import Path

import pdfplumber
import requests

LIST_FOLDER_URL = "https://api.dropboxapi.com/2/files/list_folder"
LIST_FOLDER_CONTINUE_URL = "https://api.dropboxapi.com/2/files/list_folder/continue"
DOWNLOAD_URL = "https://content.dropboxapi.com/2/files/download"
COMPLETED_PATH = "/West Crow Estimators/1111 COMPLETED"
ENV_PATH = os.path.expanduser("~/.openclaw/workspace/.env")
CACHE_DIR = Path(os.path.expanduser("~/.openclaw/workspace/dropbox-cache/completed-pdfs"))
OUTPUT_PATH = Path(os.path.expanduser("~/.openclaw/workspace/dropbox-cache/completed-bids-parsed.json"))


def load_dropbox_token() -> str:
    token = open(os.path.expanduser("~/.openclaw/workspace/.env"), "r", encoding="utf-8").read()
    for line in token.splitlines():
        if line.strip().startswith("DROPBOX_TOKEN="):
            value = line.split("=", 1)[1].strip().strip('"').strip("'")
            if value:
                return value
    raise RuntimeError(f"DROPBOX_TOKEN not found in {ENV_PATH}")


def dropbox_post(url: str, headers: dict, payload: dict) -> dict:
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    time.sleep(0.5)
    response.raise_for_status()
    return response.json()


def list_folder_all(token: str, path: str) -> list:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    data = {"path": path, "recursive": False, "include_media_info": False, "include_deleted": False}
    result = dropbox_post(LIST_FOLDER_URL, headers, data)
    entries = result.get("entries", [])

    while result.get("has_more"):
        result = dropbox_post(
            LIST_FOLDER_CONTINUE_URL,
            headers,
            {"cursor": result["cursor"]},
        )
        entries.extend(result.get("entries", []))

    return entries


def download_file(token: str, dropbox_path: str, local_path: Path) -> None:
    headers = {
        "Authorization": f"Bearer {token}",
        "Dropbox-API-Arg": json.dumps({"path": dropbox_path}),
    }
    response = requests.post(DOWNLOAD_URL, headers=headers, timeout=120)
    time.sleep(0.5)
    response.raise_for_status()
    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(response.content)


def parse_folder_name(folder_name: str) -> tuple[str | None, str]:
    parts = [p.strip() for p in folder_name.split(" - ")]
    if len(parts) >= 3:
        return parts[1], " - ".join(parts[2:])
    if len(parts) == 2:
        return None, parts[1]
    return None, folder_name


def extract_text(pdf_path: Path) -> str:
    text_parts = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            text_parts.append(page.extract_text() or "")
    return "\n".join(text_parts).strip()


def parse_total_bid(text: str) -> tuple[float | None, str | None]:
    if not text:
        return None, "No text extracted from PDF"

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    tail = lines[-30:] if len(lines) > 30 else lines
    if not tail:
        return None, "No non-empty lines in extracted text"

    keyword_pattern = re.compile(r"(grand\s*total|total|bid\s*price|contract\s*price)", re.IGNORECASE)
    amount_pattern = re.compile(r"\$\s*([\d,]+(?:\.\d{1,2})?)")

    for idx, line in enumerate(tail):
        if keyword_pattern.search(line):
            window = [line]
            if idx > 0:
                window.append(tail[idx - 1])
            if idx + 1 < len(tail):
                window.append(tail[idx + 1])
            joined = " ".join(window)
            matches = amount_pattern.findall(joined)
            if matches:
                amount = float(matches[-1].replace(",", ""))
                return amount, None

    joined_tail = " ".join(tail)
    all_amounts = amount_pattern.findall(joined_tail)
    if all_amounts:
        return float(all_amounts[-1].replace(",", "")), None

    return None, "Could not find bid total in last 30 lines"


def main() -> None:
    token = load_dropbox_token()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    entries = list_folder_all(token, COMPLETED_PATH)
    folders = [e for e in entries if e.get(".tag") == "folder"]
    folders.sort(key=lambda f: f.get("name", ""))

    results = []

    for folder in folders:
        folder_name = folder["name"]
        print(f"Processing folder: {folder_name}")
        client, project_name = parse_folder_name(folder_name)

        try:
            folder_entries = list_folder_all(token, folder["path_lower"])
        except Exception as exc:
            results.append(
                {
                    "folder": folder_name,
                    "project_name": project_name,
                    "client": client,
                    "total_bid": None,
                    "source": "pdf",
                    "error": f"Failed to list folder contents: {exc}",
                }
            )
            continue

        candidate_pdfs = [
            e
            for e in folder_entries
            if e.get(".tag") == "file"
            and e.get("name", "").lower().endswith(".pdf")
            and ("quote" in e.get("name", "").lower() or "estimate" in e.get("name", "").lower())
        ]

        if not candidate_pdfs:
            results.append(
                {
                    "folder": folder_name,
                    "project_name": project_name,
                    "client": client,
                    "total_bid": None,
                    "source": "pdf",
                    "error": "No PDF with 'quote' or 'estimate' in filename",
                }
            )
            continue

        pdf_entry = sorted(candidate_pdfs, key=lambda e: e.get("name", ""))[0]
        safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", folder_name)
        local_pdf = CACHE_DIR / f"{safe_name}.pdf"

        try:
            download_file(token, pdf_entry["path_lower"], local_pdf)
            text = extract_text(local_pdf)
            total_bid, error = parse_total_bid(text)
            record = {
                "folder": folder_name,
                "project_name": project_name,
                "client": client,
                "total_bid": total_bid,
                "source": "pdf",
                "raw_snippet": text[:300],
            }
            if error:
                record["error"] = error
            results.append(record)
        except Exception as exc:
            results.append(
                {
                    "folder": folder_name,
                    "project_name": project_name,
                    "client": client,
                    "total_bid": None,
                    "source": "pdf",
                    "error": f"Failed to download/parse PDF: {exc}",
                }
            )

    OUTPUT_PATH.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Wrote {len(results)} records to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
