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

magick icon.png -resize 512x512! app/icon512.png
magick icon.png -resize 256x256! app/icon.png
magick icon.png -resize 32x32! app/icon32.png
magick icon.png -define icon:auto-resize="256,128,96,64,48,32,16" app/icon.ico

magick icon.png -resize 512x512! app/icons/512x512.png
magick icon.png -resize 256x256! app/icons/256x256.png
magick icon.png -resize 128x128! app/icons/128x128.png
magick icon.png -resize 64x64! app/icons/64x64.png
magick icon.png -resize 48x48! app/icons/48x48.png
magick icon.png -resize 32x32! app/icons/32x32.png
magick icon.png -resize 16x16! app/icons/16x16.png

magick icon.png -resize 192x192! packages/web/public/logo192.png
magick icon.png -resize 512x512! packages/web/public/logo512.png
magick icon.png -define icon:auto-resize="256,128,96,64,48,32,16" packages/web/public/favicon.ico
