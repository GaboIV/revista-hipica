# Extrae la programación del Excel oficial del INH a JSON para el seed de Fase 0.
# Uso: python extract_xlsx.py repProgramacion28.xlsx > ../prisma/seed-data/reunion.json
import sys, json, re
import openpyxl

wb = openpyxl.load_workbook(sys.argv[1])
ws = wb.worksheets[0]
rows = [[str(c).strip() if c is not None else "" for c in r] for r in ws.iter_rows(values_only=True)]

def val(cell, label):
    # celdas tipo "Reunión:\n28" -> "28"
    return cell.replace(label, "").replace(":", "").strip()

carreras = []
cur = None
reunion = {"nroReunion": None, "fecha": None, "carreras": carreras}
i = 0
while i < len(rows):
    r = rows[i]
    if r[0].startswith("Reunión"):
        # fila cabecera de carrera
        m = {}
        for c in r:
            if ":" in c:
                k, _, v = c.partition(":")
                m[k.strip()] = v.strip().lstrip("\n").strip()
        reunion["nroReunion"] = int(m.get("Reunión") or reunion["nroReunion"] or 0)
        fch = m.get("Fecha")  # 19/07/2026
        if fch:
            d, mo, y = fch.split("/")
            reunion["fecha"] = f"{y}-{mo}-{d}"
        hora = m.get("Hora", "")
        dist = re.sub(r"[^\d]", "", m.get("Distancia", "")) or None
        cur = {
            "nroCarrera": int(m.get("Carrera Nro") or 0),
            "nroLlamado": int(m.get("Llamado") or 0) or None,
            "nroAnual": int(m.get("Carrera Anual Nro.") or 0) or None,
            "hora": hora or None,
            "distancia": int(dist) if dist else None,
            "condicion": None,
            "premioBs": None,
            "premioUsd": None,
            "inscritos": [],
        }
        carreras.append(cur)
    elif r[0].startswith("Condición") and cur:
        cur["condicion"] = r[0].partition(":")[2].strip()
    elif r[0].startswith("Premio") and cur:
        def num(s):
            s = s.replace(".", "").replace(",", ".")
            try: return float(s)
            except ValueError: return None
        # Formato A: montos inline en la propia celda ("Premio Bs.:\n2200" ... "Bono $:\n27040")
        for c in r:
            if c.startswith("Premio Bs") and "\n" in c:
                cur["premioBs"] = num(c.split("\n")[-1])
            if c.startswith("Bono $") and "\n" in c:
                cur["premioUsd"] = num(c.split("\n")[-1])
        # Formato B: montos en la fila siguiente (col 0 = Bs, col 17 = Bono $)
        if cur["premioBs"] is None:
            nxt = rows[i + 1]
            cur["premioBs"] = num(nxt[0])
            cur["premioUsd"] = num(nxt[17]) if len(nxt) > 17 else None
            i += 1
    elif r[0].isdigit() and cur:
        nombre_full = r[1]
        precio = None
        pm = re.search(r"Precio \$:\s*([\d.]+)", nombre_full)
        if pm:
            precio = float(pm.group(1))
        nombre = nombre_full.split("\n")[0].strip()
        kilos_raw = r[8].replace(",", ".")
        descargo = None
        if "-" in kilos_raw:  # "57-3" = 57 kg con 3 kg de descargo (aprendiz)
            kilos_raw, _, dsc = kilos_raw.partition("-")
            descargo = int(dsc) if dsc.isdigit() else None
        cur["inscritos"].append({
            "nroPuesto": int(r[0]),
            "ejemplar": nombre,
            "precioUsd": precio,
            "medicacion": r[5] or None,
            "kilos": float(kilos_raw) if kilos_raw else None,
            "descargo": descargo,
            "jinete": r[9] or None,
            "implementos": r[13] or None,
            "entrenador": r[15] or None,
            "pp": int(r[18]) if r[18].isdigit() else None,
        })
    i += 1

print(json.dumps(reunion, ensure_ascii=False, indent=2))
