# Speak Tablet — 3D Modeling Spec Sheet
_Built from the verified BOM in `DEVICE_BUILD_SHEET.md`. Purpose: hand this to a 3D modeler (or Fusion) so the enclosure + component layout is accurate. Dimensions are VERIFIED from manufacturer datasheets where noted; ⚠️ = MEASURE the actual purchased unit before final model (vendor-variable)._
_Rev A — Jul 5 2026._

---

## 0. PARTS — LOCKED (Full Gaze SGD build, ~$340)
| # | Part | Model / spec | Verified dims (mm) | Source |
|---|------|--------------|--------------------|--------|
| 1 | SBC | **Raspberry Pi 5** (4GB or 8GB) | **85 × 56 × ~16** (16 = tallest port, USB/RJ45) | datasheet ✅ |
| 2 | Cooler | Pi 5 **Active Cooler** (fan+heatsink, clips to board) | adds **~18–20 tall above board** → Pi+cooler stack ≈ **32–36 tall** ⚠️ measure | — |
| 3 | Screen | **10.1" 1280×800 HDMI cap-touch** (Hosyond-class) | module **239.4 × 157.4 × 12.3** · active **216.6 × 135.4** | datasheet ✅ |
| 4 | Camera | **Pi Global Shutter Camera** | board **38 × 38 × 19.8** (w/ adapter+cap) | datasheet ✅ |
| 5 | Lens | 6mm CS-mount | ~**Ø30 × 34 protrusion** ⚠️ | — |
| 6 | IR ring | 850nm illuminator ring (concentric w/ lens) | ⚠️ **Ø48–60 OD typical — MEASURE** | vendor-variable |
| 7 | Speaker | ≥3W driver, front-firing | ⚠️ **Ø40–50 — MEASURE** | vendor-variable |
| 8 | Switch jacks | 2× 3.5mm mono panel jack | Ø ~9 thread, ~15 deep | standard |
| 9 | PSU in | USB-C (27W) — connector only in enclosure | USB-C port | — |
| 10 | Mount | **VESA 75** pattern on back | **75 × 75 centers, M4** | VESA MIS-D ✅ |
| Opt | Hailo-8L + M.2 HAT+ | stacks on Pi (adds ~12 height) | HAT footprint 65×56 | skip for v1 |

**Pi 5 mounting holes** (for internal boss placement): 4 holes on an 85×56 board at **(5.5, 5.5), (5.5, 50.5), (79.5, 5.5), (79.5, 50.5)** mm from board corner. **M2.5**, clearance Ø2.8–3.0.

---

## 1. ENCLOSURE — outer shell ✅ LOCKED (Rev A, Jul 5 2026)
- **Outer: 260 W × 210 H × 50 D mm** · **20 mm corner fillets** · integrated thermal chimney.
  *(Revised from the original Fusion 260×180×40 to resolve the two fit conflicts below.)*
- **Wall thickness:** 3 mm (PETG). **Bezel lip over screen:** 2–3 mm.
- **Material:** PETG (heat/impact). Rounded, overlapping, wipeable seams. Captive screws for service.

### ✅ CONFLICTS RESOLVED
1. **HEIGHT → 210 mm** (was 180). Vertical budget: **8 mm top bezel + 157.4 screen + 44.6 mm gaze chin = 210.** The 44.6 mm chin properly fits the camera (38) + IR ring (Ø48–60) on a 15°-up bracket with correct gaze geometry. ✅
2. **DEPTH → 50 mm** (was 40). Front-to-back budget: **3 rear wall + Pi+Active-Cooler ~35 + 4 gap + screen 12.3 ≈ 50** (Pi mounted directly behind screen; chimney above). ✅
- **Width 260** vs screen 239.4 → **~10 mm side bezels.** ✅

**➡️ These three (260 × 210 × 50) are the numbers to model to. Only §5 measured parts can still shift internal detail, not the outer shell.**

---

## 2. FRONT FACE LAYOUT (face = 260 W × 210 H; origin = face center)
- **Screen:** centered L-R (~10 mm side bezels). **Top edge 8 mm below enclosure top.** Active area 216.6 × 135.4 visible; module 239.4 × 157.4 recessed behind 2–3 mm bezel lip, flush.
- **Gaze chin (below screen, 44.6 mm tall):**
  - **Camera + lens:** centered L-R, on a mount **angled up ~15°** toward the user's eyes. Face shows only a **Ø~32 lens aperture**.
  - **IR ring:** **concentric around the lens** (⚠️ Ø48–60). Face shows a ring aperture / IR-transmissive window.
  - **Speaker grille:** **front-firing** (aimed at people). Place in the chin beside the camera, or as a slot row. ⚠️ size to driver.
- **Keyguard mounting:** standoff/lip pattern framing the active area so a clip-on laser-cut acrylic keyguard registers.

---

## 3. BACK + SIDES
- **VESA 75:** 75 × 75 mm M4 boss pattern, centered on back, reinforced (carries wheelchair-mount load).
- **Thermal chimney:** passive convection channel over the Active Cooler — **intake vents low, exhaust vents high** (top + bottom louvers). Chimney sits behind screen, above the Pi.
- **Side/edge port cutouts (recessed so cables can't be yanked):**
  - USB-C power in
  - 1–2× USB-A
  - 2× 3.5mm switch jacks
  - (micro-HDMI is internal Pi→screen — no external cutout)
  - microSD access slot (serviceable)
- **Feet / stand lip** if it'll also sit on a table.

---

## 4. INTERNAL STACK (for the modeler's internal volume check)
1. **Front:** screen module (12.3 deep) against the bezel.
2. **Mid:** ~4 mm air gap / standoffs.
3. **Rear:** Pi 5 on M2.5 bosses (85×56 footprint), Active Cooler on top (fan clearance ≥ its height), micro-HDMI + USB cables routed to screen + side ports.
4. **Chin:** camera board (38×38) on its 15° bracket + IR ring, ribbon cable back to Pi CAM port.
5. **Speaker** + small amp near its grille.
6. Confirm **total internal depth** vs the depth decision in §1.

---

## 5. ⚠️ MEASURE-ONCE-BUILT CHECKLIST (do before finalizing the model)
Vendor-variable — measure YOUR actual purchased units:
- [ ] Active Cooler exact height above board (→ sets depth)
- [ ] IR ring OD + ID + thickness (→ sets chin aperture)
- [ ] Speaker driver Ø + depth (→ grille + internal volume)
- [ ] Exact screen module (confirm 239.4×157.4×12.3 on the unit you buy — brands vary ±)
- [ ] Lens length once focused (protrusion → chin depth)
- [ ] Port positions on YOUR Pi 5 + screen driver board (→ cutout coordinates)
- [ ] Final enclosure H + D after resolving the two §1 conflicts

---

## 6. DELIVERABLE FOR MODELING
Once §1 conflicts are resolved + §5 measured, the modeler needs:
- Final **outer**: W × H × D + fillet R (20) + wall (3)
- **Screen aperture** + recess (active 216.6×135.4, module pocket 239.4×157.4×12.3)
- **Chin** geometry + 15° camera bracket + lens/IR apertures
- **Port cutout** coordinates (from §5 measurements)
- **VESA 75** boss pattern on back
- Export target: **.glb / .gltf** (for the web 3D landing page) + **.step** (for manufacture)
