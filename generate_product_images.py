#!/usr/bin/env python3
"""
Generate product images for Lagerverwaltung products missing images.
- Creates clean, professional product images using PIL
- Uploads to Supabase Storage (product-images bucket)
- Updates the artikel table bilder field
"""

import json
import os
import io
import sys
import time
import math
import hashlib
import urllib.request
import urllib.error
from PIL import Image, ImageDraw, ImageFont

# ── Supabase Config ──
SUPABASE_URL = "https://wetpcdsiaodnoeaekitu.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldHBjZHNpYW9kbm9lYWVraXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDc3NjksImV4cCI6MjA4Njk4Mzc2OX0.Rod__xCzdTYt7bnd77nYHJ6yNFwgArt1MACqSuQgSCg"
STORAGE_BUCKET = "product-images"

# ── Category-based styling ──
CATEGORY_STYLES = {
    "seafood": {
        "colors": [(0, 119, 182), (0, 180, 216)],
        "icon": "🦐",
        "keywords": ["garnelen", "shrimp", "tobiko", "wakame", "surimi", "crab", "unagi", "fisch", "lachs", "thunfisch", "softshell"]
    },
    "meat": {
        "colors": [(183, 28, 28), (244, 67, 54)],
        "icon": "🥩",
        "keywords": ["rind", "schwein", "hähnchen", "chicken", "hackfleisch", "nacken", "brust", "schenkel", "flügel", "bauch", "angus", "yakitori"]
    },
    "vegetables": {
        "colors": [(27, 94, 32), (76, 175, 80)],
        "icon": "🥬",
        "keywords": ["salat", "kohl", "rettich", "gurken", "zucchini", "spargel", "spinat", "rucola", "broccoli", "bimi", "paprika", "möhren", "zwiebeln", "lauch", "kresse", "sprossen", "avocado", "minze", "eichblatt", "eisberg", "rotkohl", "weisskraut", "weisskohl"]
    },
    "drinks": {
        "colors": [(74, 20, 140), (156, 39, 176)],
        "icon": "🍷",
        "keywords": ["wein", "sake", "gin", "vodka", "secco", "prosecco", "champagner", "lillet", "campari", "aperol", "bier", "sapporo", "kirin", "sirup", "saft", "tee", "milch", "sahne", "rubicon", "lychee", "mango"]
    },
    "sauce": {
        "colors": [(230, 81, 0), (255, 152, 0)],
        "icon": "🫙",
        "keywords": ["sauce", "soße", "soja", "curry", "paste", "essig", "miso", "dashi", "wasabi", "ingwer", "kikkoman", "fischsauce", "austernsauce", "vinegar"]
    },
    "packaging": {
        "colors": [(62, 39, 35), (121, 85, 72)],
        "icon": "📦",
        "keywords": ["box", "tüte", "becher", "deckel", "folie", "beutel", "schale", "papier", "dressing", "soup", "tusipack", "kraft"]
    },
    "cleaning": {
        "colors": [(0, 131, 143), (38, 198, 218)],
        "icon": "🧹",
        "keywords": ["putz", "reiniger", "handschuh", "rolle", "tuch", "müll", "toilet", "serviett", "zewa", "gefrier"]
    },
    "oil_flour": {
        "colors": [(245, 175, 25), (241, 196, 15)],
        "icon": "🛢️",
        "keywords": ["öl", "oel", "rapsöl", "mehl", "zucker", "honig", "backpulver", "kartoffelmehl", "stärke"]
    },
    "rice_noodle": {
        "colors": [(255, 235, 238), (188, 170, 164)],
        "icon": "🍚",
        "keywords": ["reis", "nori", "noodle", "nudel", "gyoza", "sushi ingwer"]
    },
    "dairy": {
        "colors": [(245, 245, 245), (189, 189, 189)],
        "icon": "🧀",
        "keywords": ["philadelphia", "käse", "cream", "butter"]
    },
    "default": {
        "colors": [(55, 71, 79), (96, 125, 139)],
        "icon": "📋",
        "keywords": []
    }
}

def get_category(product_name):
    """Determine product category based on name keywords."""
    name_lower = product_name.lower()
    for cat_key, cat_data in CATEGORY_STYLES.items():
        if cat_key == "default":
            continue
        for kw in cat_data["keywords"]:
            if kw in name_lower:
                return cat_key
    return "default"

def create_product_image(product_name, category, width=400, height=300):
    """Create a professional product image with gradient background."""
    style = CATEGORY_STYLES.get(category, CATEGORY_STYLES["default"])
    c1, c2 = style["colors"]
    icon = style["icon"]
    
    # Create image with gradient
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)
    
    # Draw gradient background
    for y in range(height):
        ratio = y / height
        r = int(c1[0] + (c2[0] - c1[0]) * ratio)
        g = int(c1[1] + (c2[1] - c1[1]) * ratio)
        b = int(c1[2] + (c2[2] - c1[2]) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    # Add subtle pattern overlay (diagonal lines)
    for i in range(-height, width + height, 20):
        draw.line([(i, 0), (i + height, height)], fill=(255, 255, 255, 8), width=1)
    
    # Add white rounded rectangle card in center
    card_margin = 20
    card_x1, card_y1 = card_margin, card_margin + 10
    card_x2, card_y2 = width - card_margin, height - card_margin - 10
    
    # Semi-transparent white card
    card_overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    card_draw = ImageDraw.Draw(card_overlay)
    card_draw.rounded_rectangle(
        [card_x1, card_y1, card_x2, card_y2],
        radius=16,
        fill=(255, 255, 255, 200)
    )
    img = Image.alpha_composite(img.convert("RGBA"), card_overlay).convert("RGB")
    draw = ImageDraw.Draw(img)
    
    # Try to load a good font
    font_large = None
    font_small = None
    font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
    ]
    
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                font_large = ImageFont.truetype(fp, 22)
                font_small = ImageFont.truetype(fp, 13)
                break
            except:
                continue
    
    if not font_large:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Draw icon large in center-top area
    try:
        icon_font = ImageFont.truetype("/System/Library/Fonts/Apple Color Emoji.ttc", 48)
    except:
        icon_font = font_large
    
    # Draw icon
    icon_bbox = draw.textbbox((0, 0), icon, font=icon_font)
    icon_w = icon_bbox[2] - icon_bbox[0]
    icon_x = (width - icon_w) // 2
    icon_y = card_y1 + 25
    try:
        draw.text((icon_x, icon_y), icon, font=icon_font, fill=(80, 80, 80))
    except:
        pass
    
    # Draw product name (word wrap)
    text_area_width = card_x2 - card_x1 - 30
    words = product_name.split()
    lines = []
    current_line = ""
    
    for word in words:
        test = f"{current_line} {word}".strip()
        bbox = draw.textbbox((0, 0), test, font=font_large)
        if bbox[2] - bbox[0] > text_area_width and current_line:
            lines.append(current_line)
            current_line = word
        else:
            current_line = test
    if current_line:
        lines.append(current_line)
    
    # Limit to 3 lines
    if len(lines) > 3:
        lines = lines[:3]
        lines[2] = lines[2][:20] + "..."
    
    text_y = icon_y + 70
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_large)
        line_w = bbox[2] - bbox[0]
        line_x = (width - line_w) // 2
        draw.text((line_x, text_y), line, font=font_large, fill=(33, 33, 33))
        text_y += 28
    
    # Draw category label at bottom
    cat_label = category.upper().replace("_", " ")
    bbox = draw.textbbox((0, 0), cat_label, font=font_small)
    label_w = bbox[2] - bbox[0]
    label_x = (width - label_w) // 2
    label_y = card_y2 - 30
    draw.text((label_x, label_y), cat_label, font=font_small, fill=(130, 130, 130))
    
    # Add bottom accent bar
    accent_color = tuple(int((c1[i] + c2[i]) / 2) for i in range(3))
    draw.rounded_rectangle(
        [card_x1 + 40, card_y2 - 8, card_x2 - 40, card_y2 - 4],
        radius=2,
        fill=accent_color
    )
    
    return img

def image_to_jpeg_bytes(img, quality=70):
    """Convert PIL Image to JPEG bytes."""
    buffer = io.BytesIO()
    img.convert("RGB").save(buffer, format="JPEG", quality=quality, optimize=True)
    return buffer.getvalue()

def upload_to_supabase(file_bytes, file_name):
    """Upload image bytes to Supabase Storage."""
    url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{file_name}"
    
    req = urllib.request.Request(url, data=file_bytes, method="POST")
    req.add_header("Authorization", f"Bearer {SUPABASE_ANON_KEY}")
    req.add_header("apikey", SUPABASE_ANON_KEY)
    req.add_header("Content-Type", "image/jpeg")
    req.add_header("x-upsert", "true")
    req.add_header("Cache-Control", "3600")
    
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read().decode())
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{file_name}"
        return public_url
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"  ❌ Upload error: {e.code} - {error_body}")
        return None

def update_artikel_bilder(artikel_id, image_url):
    """Update the bilder array in the artikel table."""
    url = f"{SUPABASE_URL}/rest/v1/artikel?id=eq.{artikel_id}"
    data = json.dumps({"bilder": [image_url]}).encode("utf-8")
    
    req = urllib.request.Request(url, data=data, method="PATCH")
    req.add_header("Authorization", f"Bearer {SUPABASE_ANON_KEY}")
    req.add_header("apikey", SUPABASE_ANON_KEY)
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    
    try:
        response = urllib.request.urlopen(req)
        return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"  ❌ DB update error: {e.code} - {error_body}")
        return False

def fetch_products_without_images():
    """Fetch all articles with empty bilder array."""
    url = f"{SUPABASE_URL}/rest/v1/artikel?select=id,name,sku,bilder&deleted_at=is.null&apikey={SUPABASE_ANON_KEY}"
    
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {SUPABASE_ANON_KEY}")
    req.add_header("apikey", SUPABASE_ANON_KEY)
    
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode())
    
    # Filter products with no images
    no_image = [a for a in data if not a.get("bilder") or len(a["bilder"]) == 0]
    return no_image

def safe_filename(name):
    """Create a safe filename from product name."""
    import re
    safe = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
    safe = re.sub(r'_+', '_', safe).strip('_')
    return safe[:50]

def main():
    print("=" * 60)
    print("🖼  PRODUCT IMAGE GENERATOR - Lagerverwaltung")
    print("=" * 60)
    
    # Fetch products without images
    print("\n📡 Fetching products without images from Supabase...")
    products = fetch_products_without_images()
    print(f"   Found {len(products)} products without images")
    
    if not products:
        print("✅ All products have images!")
        return
    
    # Process each product
    success_count = 0
    error_count = 0
    
    for i, product in enumerate(products, 1):
        name = product["name"]
        pid = product["id"]
        sku = product.get("sku", "")
        
        category = get_category(name)
        safe_name = safe_filename(name)
        file_name = f"SAIYA_{safe_name}_{int(time.time() * 1000)}.jpg"
        
        print(f"\n[{i:3d}/{len(products)}] {name}")
        print(f"         Category: {category} | ID: {pid}")
        
        # 1. Generate image
        try:
            img = create_product_image(name, category)
            jpeg_bytes = image_to_jpeg_bytes(img, quality=65)
            size_kb = len(jpeg_bytes) / 1024
            print(f"         📷 Generated image: {size_kb:.1f} KB")
        except Exception as e:
            print(f"         ❌ Image generation failed: {e}")
            error_count += 1
            continue
        
        # 2. Upload to Supabase Storage
        public_url = upload_to_supabase(jpeg_bytes, file_name)
        if not public_url:
            error_count += 1
            continue
        print(f"         ☁️  Uploaded: {file_name}")
        
        # 3. Update database
        if update_artikel_bilder(pid, public_url):
            print(f"         ✅ Database updated")
            success_count += 1
        else:
            error_count += 1
        
        # Small delay to avoid rate limiting
        time.sleep(0.15)
    
    print("\n" + "=" * 60)
    print(f"🏁 COMPLETE!")
    print(f"   ✅ Success: {success_count}")
    print(f"   ❌ Errors:  {error_count}")
    print(f"   Total:     {len(products)}")
    print("=" * 60)

if __name__ == "__main__":
    main()
