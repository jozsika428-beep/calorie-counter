#!/usr/bin/env python3
"""Generate simple PNG app icons (requires Pillow: pip install pillow)."""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "icons")
os.makedirs(OUT, exist_ok=True)
GREEN, BLUE, AMBER, PINK, WHITE = (22, 163, 74), (37, 99, 235), (245, 158, 11), (219, 39, 119), (255, 255, 255)

def icon(size, maskable=False, rounded=True):
    S = size * 4  # supersample for smooth edges
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable or not rounded:
        d.rectangle([0, 0, S, S], fill=GREEN)
    else:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=GREEN)
    pad = S * (0.26 if maskable else 0.17)
    box = [pad, pad, S - pad, S - pad]
    w = int(S * (0.085 if maskable else 0.1))
    d.ellipse(box, outline=(255, 255, 255, 70), width=w)          # track
    d.arc(box, start=-90, end=60, fill=BLUE, width=w)              # protein
    d.arc(box, start=60, end=170, fill=AMBER, width=w)             # carbs
    d.arc(box, start=170, end=235, fill=PINK, width=w)             # fat
    c, r = S / 2, S * (0.09 if maskable else 0.11)                 # centre dot
    d.ellipse([c - r, c - r, c + r, c + r], fill=WHITE)
    return img.resize((size, size), Image.LANCZOS)

icon(192).save(os.path.join(OUT, "icon-192.png"))
icon(512).save(os.path.join(OUT, "icon-512.png"))
icon(512, maskable=True).save(os.path.join(OUT, "icon-maskable-512.png"))
icon(180, rounded=False).convert("RGB").save(os.path.join(OUT, "apple-touch-icon.png"))
icon(32).save(os.path.join(OUT, "favicon-32.png"))
print("icons written to", OUT)
