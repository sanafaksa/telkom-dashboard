"""
Ekstraksi rekap Koreksi & Jurbal PSAK (Witel Solo Jateng Timur) dari 4 file Excel mentah.

Pemakaian:
    python psak_extract.py <file1.xlsx> <file2.xlsx> <file3.xlsx> <file4.xlsx>

Jenis file dikenali dari nama sheet-nya, jadi urutan file bebas. Keluaran: JSON ke stdout:
    {"period": {"reverse": "Q2-26", "correction": "Q3-26"}, "rows": [...], "sources": {...}}

Aturan (sudah dicocokkan dengan rekap Excel referensi, lihat rows contoh di psakData):
  Reverse    = Jurbal (pembalikan) yang dibukukan di bulan 202609 (= reverse dari koreksi Q2-26)
  Correction = Koreksi yang dibukukan di bulan 202609 (Q3-26)
  Net        = Reverse + Correction (dihitung dari nilai tidak dibulatkan, lalu dibulatkan)
  PSAK Type  = rincian Correction per jenis: AGENT, AMORTISASI, EDK (termasuk EDK K2),
               POPULASI, SPLITBILL (termasuk KRITERIA KB), TIMING, LOW CR
"""

import json
import re
import sys
from collections import defaultdict

import openpyxl

PERIOD_MONTH = "09"          # 202609
PERIOD_YEAR_MONTH = "202609"
PERIOD = {"reverse": "Q2-26", "correction": "Q3-26"}
PSAK_KEYS = ["agent", "amortisasi", "edk", "populasi", "splitbill", "timing", "lowCr"]
SEGMEN_ORDER = ["DGS", "DPS", "DSS", "RBS"]


class ExtractError(Exception):
    pass


def psak_key(label):
    """Nama item / tipe koreksi -> kunci kolom PSAK Type. None jika tidak dikenali."""
    s = str(label or "").upper()
    if "AGENT" in s:
        return "agent"
    if "AMORTISASI" in s:
        return "amortisasi"
    if "EDK" in s:  # EDK K2 digabung ke EDK
        return "edk"
    if "POPULASI" in s:
        return "populasi"
    if "SPLIT" in s or "KRITERIA KB" in s:
        return "splitbill"
    if "TIMING" in s:
        return "timing"
    if "LOW CR" in s:
        return "lowCr"
    return None


def num(v):
    if v is None or v == "":
        return 0.0
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def add_psak(bucket, label, amount, unmapped):
    key = psak_key(label)
    if key is None:
        if abs(amount) > 0.5:
            unmapped.append((label, amount))
        return
    bucket[key] += amount


def empty_psak():
    return {k: 0.0 for k in PSAK_KEYS}


def read_rows(ws):
    return ws.iter_rows(values_only=True)


# ---------------------------------------------------------------- DGS (sheet flagging)
def extract_dgs(wb):
    ws = wb["Flagging Tipe Koreksi"]
    rows = read_rows(ws)
    header = None
    for r in rows:
        if r and "F_TIPE KOREKSI PSAK" in r:
            header = list(r)
            break
    if header is None:
        raise ExtractError("DGS: header 'F_TIPE KOREKSI PSAK' tidak ditemukan")
    ix = {h: i for i, h in enumerate(header) if h is not None}
    reverse = 0.0
    correction = 0.0
    psak = empty_psak()
    unmapped = []
    for r in rows:
        if not r or r[ix["MONTH"]] is None:
            continue
        if str(r[ix["MONTH"]]).zfill(2) != PERIOD_MONTH:
            continue
        desc = str(r[ix["DESC2"]] or "").upper()
        amount = num(r[ix["REVENUE"]])
        if desc.startswith("JURBAL"):
            reverse += amount
        elif desc.startswith("KOREKSI"):
            correction += amount
            add_psak(psak, r[ix["F_TIPE KOREKSI PSAK"]], amount, unmapped)
    return {"reverse": reverse, "correction": correction, "psak": psak, "unmapped": unmapped}


# ---------------------------------------------------------------- DPS (sheet H1 + H2 raw)
def extract_dps(wb):
    reverse = 0.0
    correction = 0.0
    psak = empty_psak()
    unmapped = []
    excluded = []
    for name in ("H1", "H2"):
        ws = wb[name]
        it = read_rows(ws)
        header = list(next(it))
        ix = {h: i for i, h in enumerate(header) if h is not None}
        for r in it:
            if not r or r[ix["PERIODE"]] is None:
                continue
            if str(r[ix["REGIONAL"]]) != "TREG-3" or str(r[ix["WITEL"]]) != "SOLO JATENG TIMUR":
                continue
            if str(r[ix["PERIODE"]]) != PERIOD_YEAR_MONTH:
                continue
            src = str(r[ix["SOURCE_DATA"]] or "").upper()
            amount = num(r[ix["REV_BILL"]])
            if src.startswith("JURBAL KOREKSI"):
                reverse += amount
            elif src.startswith("ADJ KOREKSI"):
                # Hanya koreksi yang punya jenis PSAK (sama seperti pivot C di file DPS)
                # Nama koreksi ada di KETERANGAN (catatan pivot DPS: "cek kolom KETERANGAN")
                label = r[ix["KETERANGAN"]]
                key = psak_key(label)
                if key is None:
                    excluded.append((str(label), amount))
                    continue
                correction += amount
                psak[key] += amount
    return {"reverse": reverse, "correction": correction, "psak": psak, "unmapped": unmapped, "excluded": excluded}


# ---------------------------------------------------------------- pivot helpers (sheet berisi pivot)
def find_pivot_blocks(ws, max_row=None):
    """
    Cari blok pivot: sel 'Row Labels' di kolom c, dengan header periode di kolom c+1..c+3.
    Mengembalikan list {label_col, value_col, rows: {label: value}, grand: value}.
    """
    grid = [list(r) for r in ws.iter_rows(max_row=max_row, values_only=True)]
    blocks = []
    for ri, row in enumerate(grid):
        for c, v in enumerate(row):
            if str(v).strip() != "Row Labels":
                continue
            # kolom header periode yang dicari
            headers = {}
            for k in range(c + 1, min(c + 4, len(row))):
                if row[k] is not None:
                    headers[str(row[k]).strip()] = k
            blocks.append((ri, c, headers))
    result = []
    for ri, c, headers in blocks:
        data = {}
        grand = None
        for rj in range(ri + 1, len(grid)):
            lab = grid[rj][c] if c < len(grid[rj]) else None
            if lab is None:
                if data or grand is not None:
                    break
                continue
            if str(lab).strip() == "Grand Total":
                grand = grid[rj]
                break
            data[str(lab).strip()] = grid[rj]
        result.append({"row_index": ri, "label_col": c, "headers": headers, "items": data, "grand_row": grand})
    return result


def block_value(block, header, col_from_grand=True, grand_row=None):
    k = block["headers"].get(header)
    if k is None or block["grand_row"] is None:
        raise ExtractError(f"kolom periode {header} tidak ditemukan di blok pivot")
    return num(block["grand_row"][k])


# ---------------------------------------------------------------- DSS (sheet 'FA (2)' pivot)
def extract_dss(wb):
    ws = wb["FA (2)"]
    blocks = find_pivot_blocks(ws, max_row=80)
    # Pivot B (Koreksi/Jurbal Q2'26): kolom periode '09' = Jurbal Q2 di Q3'26
    # Pivot C (Q3'26): kolom periode '09' = koreksi Q3'26 per item
    b_block = next((b for b in blocks if "09" in b["headers"] and "06" in b["headers"]), None)
    c_block = next((b for b in blocks if "09" in b["headers"] and "06" not in b["headers"]), None)
    if b_block is None or c_block is None:
        raise ExtractError("DSS: blok pivot Q2/Q3 tidak ditemukan")
    reverse = block_value(b_block, "09")
    correction = block_value(c_block, "09")
    psak = empty_psak()
    unmapped = []
    for label, row in c_block["items"].items():
        add_psak(psak, label, num(row[c_block["headers"]["09"]]), unmapped)
    return {"reverse": reverse, "correction": correction, "psak": psak, "unmapped": unmapped}


# ---------------------------------------------------------------- RBS (sheet 'Pivot Table' SME)
def extract_rbs(wb):
    name = next(n for n in wb.sheetnames if n == "Pivot Table")
    ws = wb[name]
    blocks = find_pivot_blocks(ws, max_row=60)
    # Pivot A (Reverse Q2) -> kolom 202609; Pivot B (Koreksi) -> kolom 202609; Tipe Koreksi -> kolom 202609
    a_block = next((b for b in blocks if "202609" in b["headers"] and b["label_col"] == 8), None)
    b_block = next((b for b in blocks if "202609" in b["headers"] and b["label_col"] == 14), None)
    if a_block is None or b_block is None:
        raise ExtractError("RBS: blok pivot A/B tidak ditemukan")
    reverse = block_value(a_block, "202609")
    correction = block_value(b_block, "202609")
    # Tipe Koreksi (label 'Tipe Koreksi' di kolom 14): item AGENT..LOW CR
    psak = empty_psak()
    unmapped = []
    tipe_row = next(i for i, r in enumerate(ws.iter_rows(max_row=60, values_only=True), 1)
                    if r and len(r) > 14 and str(r[14]).strip() == "Tipe Koreksi")
    col = None
    rows = list(ws.iter_rows(min_row=tipe_row, max_row=tipe_row + 12, values_only=True))
    header = rows[0]
    for k, v in enumerate(header):
        if str(v).strip() == "202609":
            col = k
    if col is None:
        raise ExtractError("RBS: kolom 202609 pada 'Tipe Koreksi' tidak ditemukan")
    for r in rows[1:]:
        lab = r[14] if len(r) > 14 else None
        if lab is None:
            continue
        if str(lab).strip() == "Grand Total":
            break
        add_psak(psak, lab, num(r[col]), unmapped)
    return {"reverse": reverse, "correction": correction, "psak": psak, "unmapped": unmapped}


# ---------------------------------------------------------------- deteksi & orkestrasi
def detect(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    names = wb.sheetnames
    wb.close()
    if "Flagging Tipe Koreksi" in names:
        return "DGS"
    if "FA (2)" in names:
        return "DSS"
    if any(n.startswith("detail_bges") for n in names) and "Pivot Table" in names:
        return "RBS"
    if "H1" in names and "H2" in names:
        return "DPS"
    raise ExtractError(f"jenis file tidak dikenali: {path}")


EXTRACTORS = {"DGS": extract_dgs, "DPS": extract_dps, "DSS": extract_dss, "RBS": extract_rbs}


def extract(paths):
    results = {}
    for path in paths:
        seg = detect(path)
        if seg in results:
            raise ExtractError(f"file jenis {seg} dikirim lebih dari sekali")
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        try:
            results[seg] = EXTRACTORS[seg](wb)
        finally:
            wb.close()
        results[seg]["file"] = path.replace("\\", "/").split("/")[-1]
    missing = [s for s in SEGMEN_ORDER if s not in results]
    if missing:
        raise ExtractError("file belum lengkap, kurang: " + ", ".join(missing))

    rows = []
    sources = {}
    excluded = {}
    for seg in SEGMEN_ORDER:
        r = results[seg]
        if r["unmapped"]:
            names = ", ".join(f"{lab} ({round(v)})" for lab, v in r["unmapped"][:5])
            raise ExtractError(f"{seg}: item koreksi tidak dikenali jenis PSAK-nya: {names}")
        excluded[seg] = {"count": len(r.get("excluded", [])), "amount": round(sum(v for _, v in r.get("excluded", [])))}
        net = r["reverse"] + r["correction"]
        rows.append({
            "segmen": seg,
            "reverse": round(r["reverse"]),
            "correction": round(r["correction"]),
            "net": round(net),
            "psak": {k: round(r["psak"][k]) for k in PSAK_KEYS},
        })
        sources[seg] = r["file"]
    return {"period": PERIOD, "rows": rows, "sources": sources, "excluded": excluded}


def main(argv):
    if len(argv) != 4:
        raise ExtractError("butuh tepat 4 file: DGS, DPS, DSS, RBS")
    print(json.dumps(extract(argv), ensure_ascii=False))


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except ExtractError as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(2)
