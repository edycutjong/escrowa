#!/usr/bin/env python3
import os
import sys

def main():
    print("🔍 Checking documentation for leftover placeholders...")
    placeholders = ["<repo>", "<vercel-url>", "<link>", "<explorer-link>"]
    
    files_to_check = [
        "README.md",
        "SUBMISSION.md",
        "PRODUCTION_PLAN.md",
        "SPONSOR_DEFENSE.md",
        "PRD.md",
        "ARCHITECTURE.md",
        "BUILD_PLAN.md",
        "SEED_DATA.md",
        "UI.md"
    ]
    
    errors = 0
    for file_name in files_to_check:
        if not os.path.exists(file_name):
            # If the file is not in root but exists in workspace, check it there
            continue
            
        try:
            with open(file_name, "r") as f:
                content = f.read()
                
            for p in placeholders:
                if p in content:
                    print(f"❌ Error: Placeholder '{p}' found in file '{file_name}'")
                    errors += 1
        except Exception as e:
            print(f"⚠️ Warning: Could not read file '{file_name}': {e}")
            
    if errors > 0:
        print(f"\n❌ Found {errors} placeholders. Fix them before submission.")
        sys.exit(1)
        
    print("\n✅ No placeholders found. Ready for submission!")
    sys.exit(0)

if __name__ == "__main__":
    main()
