"""
Generate clean, flat, toon-style placeholder art as WebP.

Design rules (see AGENTS.md rule 5, no AI slop):
  - flat solid fills only, no gradients, no texture, no shading
  - one consistent dark outline colour and stroke width across every asset
  - restricted palette, so the whole set reads as one family
  - simple geometric construction, easy to eyeball and easy to replace later

Run:  python scripts/make-placeholder-assets.py
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "placeholder")

# --- Shared palette -------------------------------------------------------
INK = (38, 42, 51, 255)          # single outline colour for every asset
CREAM = (255, 246, 230, 255)     # page / background warm tint
WOOD = (214, 168, 116, 255)      # table wood
WOOD_DARK = (188, 140, 92, 255)  # table edge
PLATE = (252, 252, 250, 255)     # plate body
PLATE_SHADE = (222, 224, 228, 255)
ACCENT = (232, 106, 78, 255)     # tomato / warm accent
ACCENT_2 = (247, 183, 51, 255)   # warm yellow
LEAF = (104, 168, 96, 255)       # green
LEAF_DARK = (78, 134, 74, 255)
SKIN = (247, 214, 186, 255)
HAIR = (74, 60, 54, 255)

# Three customer colourways: body colour + hair colour differ, silhouette stays
# identical so the set reads as one family.
CUSTOMERS = [
    ("customer-1.webp", (86, 132, 214, 255), HAIR, (96, 168, 214, 255)),
    ("customer-2.webp", (214, 118, 96, 255), (58, 48, 44, 255), (240, 150, 120, 255)),
    ("customer-3.webp", (108, 172, 116, 255), (96, 62, 40, 255), (150, 200, 160, 255)),
]

STROKE = 6          # outline width used everywhere
SS = 4              # supersample factor, then downscale for clean edges


def canvas(w: int, h: int):
    """Create an RGBA image at SS-times resolution with transparent background."""
    return Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))


def save(img: Image.Image, name: str, w: int, h: int) -> None:
    out = img.resize((w, h), Image.LANCZOS)
    path = os.path.join(OUT_DIR, name)
    out.save(path, "WEBP", quality=92, method=6)
    size = os.path.getsize(path)
    print(f"  {name:<20} {w}x{h}  {size/1024:6.1f} KB")


def scaled(box):
    return [int(v * SS) for v in box]


# --- Background -----------------------------------------------------------
def make_bg():
    """Kitchen wall: two flat bands, a rail, and a few simple tiles. No detail noise."""
    W, H = 480, 270
    img = canvas(W, H)
    d = ImageDraw.Draw(img)

    d.rectangle(scaled([0, 0, W, H]), fill=CREAM)

    # lower wall band (wainscot)
    d.rectangle(scaled([0, 150, W, H]), fill=(238, 226, 208, 255))
    d.line(scaled([0, 150, W, 150]), fill=INK, width=STROKE * SS)

    # shelf rail
    d.rectangle(scaled([28, 58, 452, 70]), fill=WOOD)
    d.rectangle(scaled([28, 58, 452, 70]), outline=INK, width=STROKE * SS)

    # three jars on the shelf, same shape, different tone
    for x, tone in ((70, ACCENT_2), (150, LEAF), (230, ACCENT)):
        d.rectangle(scaled([x, 18, x + 56, 58]), fill=tone, outline=INK, width=STROKE * SS)
        d.rectangle(scaled([x + 16, 8, x + 40, 18]), fill=INK)

    # framed sign, deliberately blank so text can be added in the DOM later
    d.rounded_rectangle(
        scaled([320, 96, 452, 150]), radius=8 * SS, fill=PLATE, outline=INK, width=STROKE * SS
    )

    save(img, "bg.webp", W, H)


# --- Table ----------------------------------------------------------------
def make_table():
    """Simple counter top, seen straight on. Kept wide and short so it can sit
    under the play area on any phone width."""
    W, H = 480, 160
    img = canvas(W, H)
    d = ImageDraw.Draw(img)

    # top surface
    d.rectangle(scaled([0, 0, W, 96]), fill=WOOD)
    d.rectangle(scaled([0, 0, W, 96]), outline=INK, width=STROKE * SS)
    # front edge
    d.rectangle(scaled([0, 96, W, 118]), fill=WOOD_DARK, outline=INK, width=STROKE * SS)
    d.rectangle(scaled([0, 118, W, H]), fill=(240, 232, 220, 255))
    d.line(scaled([0, 118, W, 118]), fill=INK, width=STROKE * SS)

    # two plank seams on the top surface, keeps it from looking empty
    for x in (120, 300):
        d.line(scaled([x, 8, x, 88]), fill=WOOD_DARK, width=2 * SS)

    save(img, "table.webp", W, H)


# --- Plate ----------------------------------------------------------------
def make_plate():
    """Empty serving plate used as the drop target for the finished dish."""
    W, H = 200, 120
    img = canvas(W, H)
    d = ImageDraw.Draw(img)

    d.ellipse(scaled([8, 14, 192, 106]), fill=PLATE, outline=INK, width=STROKE * SS)
    d.ellipse(scaled([34, 30, 166, 90]), fill=PLATE_SHADE, outline=INK, width=2 * SS)

    save(img, "plate.webp", W, H)


# --- Chef hat -------------------------------------------------------------
def make_chef_hat():
    """Small icon used in the header."""
    W, H = 96, 96
    img = canvas(W, H)
    d = ImageDraw.Draw(img)

    d.ellipse(scaled([16, 20, 48, 56]), fill=PLATE, outline=INK, width=STROKE * SS)
    d.ellipse(scaled([40, 12, 76, 54]), fill=PLATE, outline=INK, width=STROKE * SS)
    d.ellipse(scaled([62, 22, 88, 56]), fill=PLATE, outline=INK, width=STROKE * SS)
    d.rounded_rectangle(
        scaled([22, 44, 82, 80]), radius=6 * SS, fill=PLATE, outline=INK, width=STROKE * SS
    )

    save(img, "chef-hat.webp", W, H)


# --- Customers ------------------------------------------------------------
def make_customer(name: str, body, hair, accent):
    """Three customers sharing one silhouette: round head, shoulders, simple
    hair shape. Only colour changes, so the set stays consistent."""
    W, H = 160, 190
    img = canvas(W, H)
    d = ImageDraw.Draw(img)

    # shoulders / body
    d.rounded_rectangle(
        scaled([16, 112, 144, 190]), radius=26 * SS, fill=body, outline=INK, width=STROKE * SS
    )
    # collar accent
    d.polygon(
        [tuple(scaled([62, 112])), tuple(scaled([98, 112])), tuple(scaled([80, 136]))],
        fill=accent,
        outline=INK,
    )

    # head
    d.ellipse(scaled([44, 30, 116, 102]), fill=SKIN, outline=INK, width=STROKE * SS)

    # hair: one flat cap shape sitting on the head
    d.pieslice(scaled([42, 26, 118, 78]), start=180, end=360, fill=hair, outline=INK, width=STROKE * SS)
    d.rectangle(scaled([42, 50, 52, 74]), fill=hair, outline=INK, width=STROKE * SS)
    d.rectangle(scaled([108, 50, 118, 74]), fill=hair, outline=INK, width=STROKE * SS)

    # eyes and smile, minimal and identical across all three
    d.ellipse(scaled([64, 60, 72, 72]), fill=INK)
    d.ellipse(scaled([88, 60, 96, 72]), fill=INK)
    d.arc(scaled([66, 68, 94, 90]), start=20, end=160, fill=INK, width=3 * SS)

    save(img, name, W, H)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"Writing placeholders to {OUT_DIR}")
    make_bg()
    make_table()
    make_plate()
    make_chef_hat()
    for name, body, hair, accent in CUSTOMERS:
        make_customer(name, body, hair, accent)
    print("Done. Flat fills only, one outline colour, no gradients.")


if __name__ == "__main__":
    main()
