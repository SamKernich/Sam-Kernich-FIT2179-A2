"""
This file parses through the 3 Regional SST .txt files and combines them into one usable csv file
that is used to create different visualizations. 

Claude AI was used to outline the process to parse txt files and merge them into a single csv file. 
The code was then written by hand to implement the outlined process.

Created: 20/5/2026 by Sam Kernich

"""

import csv
import os
import sys
from datetime import datetime

#Input files 
STATIONS = [
    ("Northern", "data/Northern_SSA.txt"),
    ("Central",  "data/Central_SSA.txt"),
    ("Southern", "data/Southern_SSA.txt"),
]

OUTPUT_FILE = "data/gbr-sst-anomaly.csv"
MISSING     = {"-999.0", "-999", "NaN", "nan", ""}

# Column indices in each data row 
# Format: YYYY MM DD SST_MIN SST_MAX SST@90th_HS SSTA@90th_HS 90th_HS DHW BAA
COL_YYYY = 0
COL_MM   = 1
COL_DD   = 2
COL_SST  = 5
COL_SSTA = 6
COL_HS   = 7
COL_DHW  = 8
COL_BAA  = 9

# Checks if a value exists and can be converted to a float
def safe_float(val):
    if val in MISSING:
        return ""
    try:
        return float(val)
    except ValueError:
        return ""


def parse_file(filepath, region):
    """
    Skip header lines until the 'YYYY MM DD ...' column header,
    then parse all data rows.
    """
    rows      = []
    in_data   = False
    bad_lines = 0

    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            stripped = line.strip()

            if not in_data:
                if stripped.startswith("YYYY"):
                    in_data = True
                continue

            if not stripped or stripped.startswith("#"):
                continue

            parts = stripped.split()
            if len(parts) < 9:
                bad_lines += 1
                continue

            try:
                date = datetime(
                    int(parts[COL_YYYY]),
                    int(parts[COL_MM]),
                    int(parts[COL_DD])
                ).strftime("%Y-%m-%d")
            except ValueError:
                bad_lines += 1
                continue

            rows.append({
                "date":        date,
                "region":      region,
                "sst":         safe_float(parts[COL_SST])  if len(parts) > COL_SST  else "",
                "sst_anomaly": safe_float(parts[COL_SSTA]) if len(parts) > COL_SSTA else "",
                "hotspot":     safe_float(parts[COL_HS])   if len(parts) > COL_HS   else "",
                "dhw":         safe_float(parts[COL_DHW])  if len(parts) > COL_DHW  else "",
                "baa":         safe_float(parts[COL_BAA])  if len(parts) > COL_BAA  else "",
            })

    print(f"  {region}: {len(rows):,} records  (bad lines skipped: {bad_lines})")
    return rows


def main():
    

    os.makedirs("data", exist_ok=True)

    all_rows = []
    print("\nParsing NOAA CRW GBR Virtual Station files...\n")

    for region, fname in STATIONS:
        rows = parse_file(fname, region)
        all_rows.extend(rows)

    # Sort by date then region
    all_rows.sort(key=lambda r: (r["date"], r["region"]))

    # Write CSV
    fieldnames = ["date", "region", "sst", "sst_anomaly", "hotspot", "dhw", "baa"]
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"\n✓  Written {len(all_rows):,} rows → {OUTPUT_FILE}\n")

if __name__ == "__main__":
    main()
