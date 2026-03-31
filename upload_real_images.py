#!/usr/bin/env python3
"""
Upload AI-generated product images to Supabase Storage and update DB.
Maps generated image files to their corresponding product IDs.
"""

import json
import os
import io
import time
import urllib.request
import urllib.error
from PIL import Image

SUPABASE_URL = "https://wetpcdsiaodnoeaekitu.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldHBjZHNpYW9kbm9lYWVraXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDc3NjksImV4cCI6MjA4Njk4Mzc2OX0.Rod__xCzdTYt7bnd77nYHJ6yNFwgArt1MACqSuQgSCg"
STORAGE_BUCKET = "product-images"

# Artifacts directory where generated images are saved
ARTIFACTS_DIR = "/Users/nguyenchilinh/.gemini/antigravity/brain/aa699646-12fa-45cf-b3b5-59e91390c38e"

# Mapping: image filename prefix → product ID in database
IMAGE_TO_PRODUCT = {
    "leon_gold_weissburgunder": "a37",
    "black_tobiko": "mnbxiyj4lwjhv",
    "yakitori_sushi": "mn8wn28bal9rn",
    "topfreiniger_draht": "mtr37",
    "leon_gold_steingrueble": "mn8xs26v6ufua",
    "rubicon_lychee_drink": "frv09",
    "paper_soup_container": "a19",
    "dressing_box_500ml": "a4",
    "cock_gelbe_curry": "frv11",
    "yuzusaft": "mn8yuabeezbhj",
    "wohrwag_grauburgunder": "mn8yvbg7wygth",
    "gyoza_chicken_vegetable": "mn8wpif79uyx6",
    "rapsoel_aro": "mnbvkp1107lig",
    "red_tobiko_shirakiku": "mnbxkt02kdo52",
    "chinakohl": "mtr09",
    "garnelen_26_30": "frv02",
    "wasabi_sprossen": "stg05",
    "gurken_12er": "stg09",
    "radieschensprossen": "mtr23",
    "haehnchenschenkel": "mnbw0syba49bx",
    # Batch 5+
    "kraft_suppenbecher": "a35",
    "glutenfrei_soja": "mnbvpg6r5l0uf",
    "sushi_ingwer": "mn8wt1z7rknrr",
    "garnelen_black_tiger": "frv06",
    "huehnerbrustfilet": "frv07",
    "haehnchenflugel": "frv08",
    "tafelessig": "frv14",
    "mae_krua_austernsauce": "frv16",
    "reis_papier": "frv17",
    "angus_rinderhufte": "frv01",
    "garnelen_13_15": "frv03",
    "dressing_box_30ml": "a2",
    "frozen_lime_leaves": "mnbx44hsco0gj",
    "cock_rote_curry": "frv10",
    "fischsauce_squid": "frv12",
    "mangopueree": "frv13",
    "garnelen_21_25_hlso": "frv04",
    "garnelen_21_25_pd": "frv05",
    "wakame_seealgen": "frv15",
    "weisser_rettich": "mtr14",
    "siegelrandbeutel": "mtr34",
    "ott_fass_4": "a52",
    "weisskraut": "stg15",
    "zwiebeln_metzger": "stg16",
    "hendricks_gin": "mnbvrbuzdpbfu",
    "chicken_brust_filet": "mnbx6p67uoh6h",
    "avocados_14er": "stg01",
    "avocados_16er": "stg02",
    "bimi_broccoli": "stg03",
    "bio_radieschen_sprossen": "stg04",
    "bio_knoblauch_sprossen": "stg06",
    "kresse_affilla": "stg10",
    "jasmin_tee": "mn8z269hlvhm2",
    "haltbare_landmilch": "mn8w15x5sblox",
    "rucola": "stg14",
    "suehiro_vinegar": "mn8wza5uiqmtx",
    "mc_avocado": "mtr15",
    "eissalat": "stg08",
    "kresse_shiso_purple": "stg11",
    "minze_bund": "stg12",
    "ryoriten_akamiso": "jfc04",
    "gruenen_tee": "mn8yy9akhaqd7",
    "eichblatt_hell": "stg07",
    "le_freak_vodka": "mn8z324c5g49p",
    "indien_vannamei_garnelen": "mnbx8z87dz9f5",
    "matcha_ice": "jfc06",
    "shimaya_dashi": "jfc03",
    "wasabi_powder": "mn8x2yqnt6z34",
    "fremd_gaenger_secco": "a24",
    "rettich_weiss_gross": "stg13",
    "su_suehiro": "jfc01",
    "kikkoman_spicy_chili": "jfc02",
    "kikkoman_soy_sauce": "mnbvu1joaqnry",
    "j_basket_unagi": "jfc05",
    "sw_nacken": "mtr02",
    "sojabohnenpaste": "mnbxb9eb9271d",
    "r_brust_ohne_knochen": "mtr03",
    "rindernackenknochen": "mtr05",
    "schweinehackfleisch": "mtr06",
    "hackfleisch_gemischt": "mtr07",
    "spargel_gruen": "mtr08",
    "haehnchenschenkel_2500g": "mtr01",
    "regio_sw_bauch": "mtr04",
    "handschuhe_m": "a27",
    "mercator_vinylex_l": "a42",
    "hakutsuru_sake": "mnahngucwv6gy",
    "holunder_sirup": "mn8y5iumo8atg",
    "putztuchrolle_weiss": "a59",
    "mc_paprika_rot": "mtr12",
    "gefrierbeutel": "mnbwuiogr856l",
    "lauchzwiebeln": "mtr11",
    "yaki_nori": "mnahyasecjyfn",
    "zucchini": "mtr13",
    "nori_algen": "mn8weyuxtjbty",
    "ottella_lugana_creete": "a54",
    "lycheesaft_rubicon": "mn8ydhtikpwno",
    "soto_sake": "a71",
    "mc_zitronen": "mtr16",
    "limetten": "mtr17",
    "aro_rapsoel_10l": "mtr24",
    "aro_frittieroel": "mtr25",
    "aro_weizenmehl": "mtr26",
    "kirin_ichiban": "mn8yiafrvuprh",
    "aro_waldhonig": "mtr28",
    "aro_kartoffelmehl": "mtr29",
    "green_asparagus": "mnai2v6ve7udg",
    "surimi_crab_sticks": "mnbxgoys26as8",
    "aro_zucker": "mtr27",
    "aro_backpulver": "mtr30",
    "philadelphia_pur": "mtr32",
    "weisskohl": "mtr19",
    "babyspinat": "mtr21",
    "aro_h_milch": "mtr33",
    "moehren": "mtr18",
    "tusipack_behaelter": "a83",
    "kuechen_profi_sahne": "mn8w5huomor62",
    "eisbergsalat": "mtr10",
    "tusipack_deckel": "a84",
    "aro_kuechensahne": "mtr31",
    "yakitori_chargrilled": "mn8whia06pjb0",
    "rotkohl": "mtr20",
    "mc_rucola": "mtr22",
}

def compress_to_jpeg(png_path, max_width=600, quality=70):
    """Read PNG, resize and compress to JPEG bytes."""
    img = Image.open(png_path)
    # Resize if wider than max_width
    w, h = img.size
    if w > max_width:
        ratio = max_width / w
        img = img.resize((max_width, int(h * ratio)), Image.LANCZOS)
    # Convert to RGB and save as JPEG
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
        urllib.request.urlopen(req)
        return True
    except urllib.error.HTTPError as e:
        print(f"  ❌ DB error: {e.code} - {e.read().decode()}")
        return False

def find_image_file(prefix):
    """Find the generated image file matching the prefix."""
    for f in os.listdir(ARTIFACTS_DIR):
        if f.startswith(prefix) and f.endswith(".png"):
            return os.path.join(ARTIFACTS_DIR, f)
    return None

def main():
    print("=" * 60)
    print("📤 UPLOAD AI-GENERATED IMAGES TO SUPABASE")
    print("=" * 60)
    
    success = 0
    skip = 0
    error = 0
    
    for prefix, product_id in IMAGE_TO_PRODUCT.items():
        img_path = find_image_file(prefix)
        if not img_path:
            print(f"⏭  {prefix}: not yet generated, skipping")
            skip += 1
            continue
        
        print(f"\n📷 {prefix} → {product_id}")
        
        # Compress PNG → JPEG
        try:
            jpeg_bytes = compress_to_jpeg(img_path)
            size_kb = len(jpeg_bytes) / 1024
            print(f"   Compressed: {size_kb:.1f} KB")
        except Exception as e:
            print(f"   ❌ Compress error: {e}")
            error += 1
            continue
        
        # Upload
        file_name = f"SAIYA_{prefix}_{int(time.time()*1000)}.jpg"
        url = upload_to_supabase(jpeg_bytes, file_name)
        if not url:
            error += 1
            continue
        print(f"   ☁️  {file_name}")
        
        # Update DB
        if update_artikel_bilder(product_id, url):
            print(f"   ✅ DB updated")
            success += 1
        else:
            error += 1
        
        time.sleep(0.1)
    
    print(f"\n{'='*60}")
    print(f"✅ Uploaded: {success} | ⏭ Skipped: {skip} | ❌ Error: {error}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
