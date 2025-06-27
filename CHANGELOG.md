# Changelog
## 1.2.0
- V13 compatibility
- Updated to ApplicationV2. The style of the module is now more aligned with v13 styling

## 1.1.0
- V12 compatibility
- New setting: Transparent Background. When ON, the background of the *window* will be transparent instead of white.

## 1.0.2
- New setting: Hidden Tile. When ON, tiles created will be automatically be hidden

## 1.0.1
- New setting: Auto Crop. When ON, sketches will automatically get cropped to their actual content size before being
converted to SVG/Tile
  - NOTE: When editing a cropped sketch, instead of it being positioned at "0 0", it will be translated according to the
original uncropped sketch. This is useful if you want to continue drawing in the top/left area of the sketch.
- Improved editing. Now after editing a Tile, the updated tiles will be scaled according to the new SVG dimensions.
