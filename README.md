<h1 align="center">
  Sketch Tiles
</h1>
<p align="center">
  <img src=".github/images/logo.png" width="720" />
</p>
<p align="center">
  Quickly sketch your ideas into the game!<br>
  A super light and system agnostic FoundryVTT Module.
</p>
<div style="display: flex; flex-direction: row; align-items: center; gap: 8px; justify-content: right" >
  <div style="height: fit-content; top: -5px; position: relative">Like the project?</div>
  <a href='https://ko-fi.com/supportkofi' target='_blank'><img height='35' style='border:0px;height:46px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
</div>

## Why this module
Have you ever wanted to quickly sketch something pretty on the board? Or place some hand drawn dungeon tiles?
Hand drawn trees? Or maybe you are an improv GM and you wanted to make a quick room or some decorations?

Well this module has got you covered! Bring your creativity on the board by making cool and reusable hand drawn tiles!

Perfect for playing [Index Card RPG](https://github.com/ClipplerBlood/icrpgme) or zone based combat.

## How to use
A GM can create a new Sketch Tile by clicking the button <img height=16 src=".github/images/st-icon.png"> in the tiles control (3rd button on the left).

Then simply start drawing and when you are done, click the upload button to save it into the canvas!

If you want to edit a placed Sketch Tile, right-click on the tile and press the sketch tile button on the right.
A window with your sketch will open and then when you upload it again all tiles using this sketch will update.

If you want to customize the sketch settings (like colors, background and many more), you can click the settings button in the sketch tiles window.

## Examples

## How it works
All Sketch Tiles are SVG images. When uploaded, they are saved in `<FoundryData>/worlds/<world>/SketchTiles`. Then a new Tile is created with this file as texture.

The created tile dimensions are the same of the Sketch Tile window, so if you want to create a smaller (or bigger) tile
you can adjust the window size before uploading.

Note that in Foundry it is not possible to delete the files from the client (for sensible security reasons), so every once in a while you may want to delete your unused sketches to save a bit of storage.






