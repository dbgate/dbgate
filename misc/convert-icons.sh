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

magick -size 1000x1000 xc:transparent \
    -fill '#096dd9' -stroke '#002766' -strokewidth 10 \
    -draw "rectangle 150,150 950,850" \
    -draw "arc 150,750 950,950  0,180" \
    -strokewidth 0 -stroke '#096dd9' \
    -draw "rectangle 155,840 945 860" \
    -strokewidth 10 -stroke '#002766' \
    -fill '#1890ff' \
    -draw "arc 150,50 950,250  0,360" \
    -fill '#fafafa' -stroke '#8c8c8c' -strokewidth 3 \
    -pointsize 700 -font Arial \
    -gravity center \
    -draw 'text 50,100 "G"' \
    icon.png


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
