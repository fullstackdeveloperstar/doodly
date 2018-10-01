var measureText = (font, text, fontSize) => {
  var ascent = 0;
  var descent = 0;
  var width = 0;
  var scale = 1 / font.unitsPerEm * fontSize;
  var glyphs = font.stringToGlyphs(text);

  for (var i = 0; i < glyphs.length; i++) {
      let glyph = glyphs[i];
      if (glyph.advanceWidth) {
          width += glyph.advanceWidth * scale;
      }
      if (i < glyphs.length - 1) {
          let kerningValue = font.getKerningValue(glyph, glyphs[i + 1]);
          width += kerningValue * scale;
      }
      ascent = Math.max(ascent, glyph.yMax);
      descent = Math.min(descent, glyph.yMin);
  }

  return {
      width: width,
      height: font.ascender * scale - font.descender * scale,
      actualBoundingBoxAscent: ascent * scale,
      actualBoundingBoxDescent: descent * scale,
      fontBoundingBoxAscent: font.ascender * scale,
      fontBoundingBoxDescent: font.descender * scale
  }
};

exports.measureText = measureText;
