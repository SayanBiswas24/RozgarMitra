from PIL import Image, ImageDraw, ImageFont

def make_image(text, filename, font_path, font_size=40, size=(1000, 1000)):
    img = Image.new('RGB', size, color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype(font_path, font_size)
    except IOError:
        print(f"Could not load font {font_path}, using default.")
        font = ImageFont.load_default()
        
    # Draw text in the middle
    x, y = 50, 50
    draw.text((x, y), text, fill=(0, 0, 0), font=font)
    img.save(filename)
    print(f"Saved {filename}")

hindi_text = """नाम: विजय प्रसाद
व्यवसाय: किसान
अनुभव: दस वर्ष
कौशल: खेती और ट्रैक्टर मरम्मत"""

english_text = """Name: Vijay Prasad
Occupation: Farmer
Experience: Ten years"""

make_image(hindi_text, "test_hi.png", "/System/Library/Fonts/Supplemental/DevanagariMT.ttc", font_size=60)
make_image(english_text, "test_en.png", "/System/Library/Fonts/Supplemental/Arial.ttf", font_size=60)
