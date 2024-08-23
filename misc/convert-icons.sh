# magick icon.svg -resize 1024x1024 -transparent white -background transparent app/icon1024.png

# magick app/icon1024.png -resize 512x512 app/icon512.png
# magick app/icon1024.png -resize 256x256 app/icon.png
# magick app/icon1024.png -resize 32x32 app/icon32.png
# magick icon.svg -define icon:auto-resize="256,128,96,64,48,32,16" -transparent white -background transparent app/icon.ico

# # magick icon.svg -resize 512x512 -transparent white -background transparent app/icon512.png
# # magick icon.svg -resize 256x256 -transparent white -background transparent app/icon.png
# # magick icon.svg -resize 32x32 -transparent white -background transparent app/icon32.png
# # magick icon.svg -define icon:auto-resize="256,128,96,64,48,32,16" -transparent white -background transparent app/icon.ico

# magick app/icon1024.png -resize 512x512 app/icons/512x512.png
# magick app/icon1024.png -resize 256x256 app/icons/256x256.png
# magick app/icon1024.png -resize 128x128 app/icons/128x128.png
# magick app/icon1024.png -resize 64x64 app/icons/64x64.png
# magick app/icon1024.png -resize 48x48 app/icons/48x48.png
# magick app/icon1024.png -resize 32x32 app/icons/32x32.png
# magick app/icon1024.png -resize 16x16 app/icons/16x16.png

# # magick icon.svg -resize 16x16 -transparent white -background transparent app/icons/16x16.png
# # magick icon.svg -resize 32x32 -transparent white -background transparent app/icons/32x32.png
# # magick icon.svg -resize 48x48 -transparent white -background transparent app/icons/48x48.png
# # magick icon.svg -resize 64x64 -transparent white -background transparent app/icons/64x64.png
# # magick icon.svg -resize 128x128 -transparent white -background transparent app/icons/128x128.png
# # magick icon.svg -resize 256x256 -transparent white -background transparent app/icons/256x256.png
# # magick icon.svg -resize 512x512 -transparent white -background transparent app/icons/512x512.png

# magick icon.svg -resize 1024x1024 icon.png
# magick icon.svg -resize 1024x1024 -transparent white -background transparent icon.png

STROKE_WIDTH=30
LEFT=150
RIGHT=850



# magick  \
#     \( \
#         -size 1000x1000 -define gradient:direction=east 'gradient:#0050b3-#1890ff' \
#         \( +clone -fill Black -colorize 100 \
#         -fill White -stroke White -draw "arc $LEFT,750 $RIGHT,950 0,360" -draw "rectangle $LEFT,150 $RIGHT,850" \
#         \) \
#         -alpha off \
#         -compose CopyOpacity -composite \
#     \) \
#     \( \
#         -size 1000x1000 -define gradient:direction=east 'gradient:#096dd9-#40a9ff' \
#         \( +clone -fill Black -colorize 100 \
#         -fill White -draw "arc $LEFT,50 $RIGHT,250 0,360" \
#         \) \
#         -alpha off \
#         -compose CopyOpacity -composite \
#     \) \
#     -compose Over -composite \
#     -strokewidth $STROKE_WIDTH -stroke '#0050b3' -fill transparent \
#     -draw "arc $LEFT,225 $RIGHT,425  0,180" \
#     -draw "arc $LEFT,400 $RIGHT,600  0,180" \
#     -draw "arc $LEFT,575 $RIGHT,775  0,180" \
#     -draw "arc $LEFT,750 $RIGHT,950  0,180" \
#     -draw "arc $LEFT,50 $RIGHT,250  0,360" \
#     -draw "line $LEFT,150 $LEFT,850" \
#     -draw "line $RIGHT,150 $RIGHT,850" \
#     -fill '#fafafa' -stroke '#8c8c8c' -strokewidth 3 \
#     -pointsize 800 -font './Mcbungus-Regular.ttf' \
#     -gravity center \
#     -draw 'text 0,100 "G"' \
#     icon.png

convert icon-input.png -background white -alpha remove -alpha off icon.png 
convert -size 1000x1000 xc:none -fill white -draw "circle 500,500 500,0" icon.png -compose SrcIn -composite icon.png

# magick \
#   \( \
#     -size 300x300 gradient:red-blue \
#     \( +clone -fill Black -colorize 100 \
#       -fill White -draw "polygon 50,50 250,50 200,200" \
#     \) \
#     -alpha off \
#     -compose CopyOpacity -composite \
#   \) \
#   \( \
#     -size 300x300 'gradient:#f80-#08f' \
#     \( +clone -fill Black -colorize 100 \
#       -fill White -draw "polygon 50,150 250,150 200,300" \
#     \) \
#     -alpha off \
#     -compose CopyOpacity -composite \
#   \) \
#   -compose Over -composite \
#   icon.png    

magick icon.png -resize 512x512! ../app/icon512.png
magick icon.png -resize 256x256! ../app/icon.png
magick icon.png -resize 32x32! ../app/icon32.png
magick icon.png -define icon:auto-resize="256,128,96,64,48,32,16" ../app/icon.ico

magick icon.png -resize 512x512! ../app/icons/512x512.png
magick icon.png -resize 256x256! ../app/icons/256x256.png
magick icon.png -resize 128x128! ../app/icons/128x128.png
magick icon.png -resize 64x64! ../app/icons/64x64.png
magick icon.png -resize 48x48! ../app/icons/48x48.png
magick icon.png -resize 32x32! ../app/icons/32x32.png
magick icon.png -resize 16x16! ../app/icons/16x16.png

magick icon.png -resize 192x192! ../packages/web/public/logo192.png
magick icon.png -resize 512x512! ../packages/web/public/logo512.png
magick icon.png -define icon:auto-resize="256,128,96,64,48,32,16" ../packages/web/public/favicon.ico

convert icon.png -resize 800x800 -background transparent -gravity center -extent 1000x1000 iconmac.png

convert macbg.png icon.png -compose SrcIn -composite -resize 600x600! ../app/icon512-mac.png
# magick composite  iconmac.png macbg.png -resize 600x600! ../app/icon512-mac.png
