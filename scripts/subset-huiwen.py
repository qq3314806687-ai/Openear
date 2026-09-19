# -*- coding: utf-8 -*-
"""把汇文明朝体子集化（仅保留情绪地图轴标题用到的字）并转 woff2。"""
import os
from fontTools import subset
from fontTools.ttLib import TTFont

SRC = os.path.join('public', 'fonts', 'Huiwen-mincho.otf')
DST = os.path.join('public', 'fonts', 'Huiwen-mincho.woff2')

# 情绪地图 X/Y 轴标题用到的全部字符（含空格、间隔号、箭头）
TEXT = '能量安静激烈情绪色彩冷暖· →'

options = subset.Options()
options.flavor = 'woff2'
options.layout_features = ['*']
options.name_IDs = ['*']
options.notdef_outline = True
options.recommended_glyphs = False
options.glyph_names = False

font = subset.load_font(SRC, options)
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=TEXT)
subsetter.subset(font)
subset.save_font(font, DST, options)
print('saved', DST, os.path.getsize(DST), 'bytes')