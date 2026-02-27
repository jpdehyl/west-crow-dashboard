#!/usr/bin/env python3
"""Shared Dropbox token helper with refresh-token support."""

import os
import time

import requests

ENV_PATH = os.path.expanduser("~/.openclaw/workspace/.env")

_cached_token: str | None = None
_token_expiry = 0.0


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


def get_token() -> str:
    global _cached_token, _token_expiry

    if _cached_token and time.time() < _token_expiry - 60:
        return _cached_token

    env = load_env()
    refresh_token = env.get("DROPBOX_REFRESH_TOKEN")
    app_key = env.get("DROPBOX_APP_KEY")
    app_secret = env.get("DROPBOX_APP_SECRET")

    if not refresh_token:
        fallback = env.get("DROPBOX_TOKEN") or env.get("DROPBOX_ACCESS_TOKEN")
        if not fallback:
            raise RuntimeError("No Dropbox token found. Configure DROPBOX_REFRESH_TOKEN or DROPBOX_TOKEN.")
        return fallback

    response = requests.post(
        "https://api.dropbox.com/oauth2/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": app_key,
            "client_secret": app_secret,
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    _cached_token = payload["access_token"]
    _token_expiry = time.time() + payload.get("expires_in", 14400)
    save_env_key("DROPBOX_ACCESS_TOKEN", _cached_token)
    return _cached_token
