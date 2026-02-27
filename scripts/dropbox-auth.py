#!/usr/bin/env python3
"""One-time Dropbox OAuth setup to store refresh and access tokens."""

import os

import requests


ENV_PATH = os.path.expanduser("~/.openclaw/workspace/.env")


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    with open(ENV_PATH, "r", encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def save_env_key(key: str, value: str) -> None:
    with open(ENV_PATH, "r", encoding="utf-8") as env_file:
        lines = env_file.readlines()

    found = False
    for idx, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[idx] = f"{key}={value}\n"
            found = True

    if not found:
        lines.append(f"{key}={value}\n")

    with open(ENV_PATH, "w", encoding="utf-8") as env_file:
        env_file.writelines(lines)


def main() -> None:
    env = load_env()
    app_key = env["DROPBOX_APP_KEY"]
    app_secret = env["DROPBOX_APP_SECRET"]

    auth_url = (
        "https://www.dropbox.com/oauth2/authorize"
        f"?client_id={app_key}"
        "&response_type=code"
        "&token_access_type=offline"
    )

    print(f"\nOpen this URL in your browser:\n\n{auth_url}\n")
    code = input("Paste the authorization code here: ").strip()

    response = requests.post(
        "https://api.dropbox.com/oauth2/token",
        data={
            "code": code,
            "grant_type": "authorization_code",
            "client_id": app_key,
            "client_secret": app_secret,
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()

    if "refresh_token" not in payload:
        print("Error:", payload)
        raise SystemExit(1)

    save_env_key("DROPBOX_REFRESH_TOKEN", payload["refresh_token"])
    save_env_key("DROPBOX_ACCESS_TOKEN", payload["access_token"])
    print("✅ Saved DROPBOX_REFRESH_TOKEN and DROPBOX_ACCESS_TOKEN to .env")


if __name__ == "__main__":
    main()
