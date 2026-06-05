#!/usr/bin/env python3
import os


def main():
    print("✏️ Replacing placeholders in markdown files...")
    replacements = {
        "<repo>": "https://github.com/edycutjong/escrowa",
        "<vercel-url>": "https://escrowa.edycu.dev",
        "<link>": "https://youtu.be/escrowa-demo",
        "<ref>": "tx_0x334155aef4",
        "<explorer-link>": "https://api.terminal3.io/v1/explorer/tx_0x334155aef4",
    }

    files = [
        "README.md",
        "SUBMISSION.md",
        "PRODUCTION_PLAN.md",
        "SPONSOR_DEFENSE.md",
        "PRD.md",
        "ARCHITECTURE.md",
        "BUILD_PLAN.md",
        "SEED_DATA.md",
        "UI.md",
    ]

    for file_name in files:
        if not os.path.exists(file_name):
            continue

        try:
            with open(file_name, "r") as f:
                content = f.read()

            original_content = content
            for placeholder, value in replacements.items():
                content = content.replace(placeholder, value)

            if content != original_content:
                with open(file_name, "w") as f:
                    f.write(content)
                print(f"✅ Replaced placeholders in '{file_name}'")
        except Exception as e:
            print(f"⚠️ Error updating '{file_name}': {e}")


if __name__ == "__main__":
    main()
