import urllib.request

url = "https://raw.githubusercontent.com/tesseract-ocr/tessdata/main/testing/eurotext.tif"
urllib.request.urlretrieve(url, "test_hi.png") # Even if it's a TIF or PNG, let's just grab a simple JPG
