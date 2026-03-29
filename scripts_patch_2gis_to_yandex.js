#!/usr/bin/env node

/**
 * Non-destructive migration helper:
 * converts a 2GIS-oriented parser source file to Yandex Images oriented one
 * by applying targeted text replacements while preserving full file structure.
 */

const fs = require('fs')
const path = require('path')

const input = process.argv[2]
const output = process.argv[3] || input

if (!input) {
  console.error('Usage: node scripts_patch_2gis_to_yandex.js <input-file> [output-file]')
  process.exit(1)
}

const absIn = path.resolve(process.cwd(), input)
const absOut = path.resolve(process.cwd(), output)

let src = fs.readFileSync(absIn, 'utf8')

const replacements = [
  [/PARSER_2GIS_SEARCH_CARD_LIMIT/g, 'PARSER_YANDEX_SEARCH_CARD_LIMIT'],
  [/PARSER_2GIS_CANDIDATE_CARD_TRIES/g, 'PARSER_YANDEX_CANDIDATE_CARD_TRIES'],
  [/PARSER_2GIS_PHOTO_SCROLL_STEPS/g, 'PARSER_YANDEX_PHOTO_SCROLL_STEPS'],
  [/PARSER_2GIS_PHOTO_GALLERY_NEXT_STEPS/g, 'PARSER_YANDEX_PHOTO_GALLERY_NEXT_STEPS'],
  [/PARSER_2GIS_PHOTO_OPEN_ATTEMPTS/g, 'PARSER_YANDEX_PHOTO_OPEN_ATTEMPTS'],
  [/STRICT_2GIS_ONLY/g, 'STRICT_YANDEX_ONLY'],
  [/ALLOW_2GIS_MAIN_FALLBACK/g, 'ALLOW_YANDEX_MAIN_FALLBACK'],

  [/2GIS_WEB/g, 'YANDEX_WEB'],
  [/2gis/g, 'yandex'],
  [/2ГИС/g, 'Яндекс.Картинки'],
  [/2GIS/g, 'YANDEX'],
  [/2gis\.ru/g, 'yandex.ru'],
  [/photo\.2gis\.com/g, 'avatars.mds.yandex.net'],
  [/https:\/\/2gis\.ru\//g, 'https://yandex.ru/images/search?text='],

  [/parser-server-2gis-canonical-storage/g, 'parser-server-yandex-images-canonical-storage'],
  [/2gis-by-name-multi-stage-top-up-parse/g, 'yandex-images-by-name-multi-stage-top-up-parse'],
  [/2gis-search-empty/g, 'yandex-images-search-empty'],
  [/2gis-no-valid-images/g, 'yandex-images-no-valid-images'],

  [/strict2gisOnly/g, 'strictYandexOnly'],
  [/allow2gisMainFallback/g, 'allowYandexMainFallback'],
]

for (const [pattern, nextValue] of replacements) {
  src = src.replace(pattern, nextValue)
}

// Keep behavior compatible with "do not remove anything":
// we only retarget search URL construction in-place.
src = src.replace(
  /const searchUrl = `https:\/\/yandex\.ru\/\$\{cityKey\}\/search\/\$\{encodeURIComponent\(searchQuery\)\}`/g,
  'const searchUrl = `https://yandex.ru/images/search?text=${encodeURIComponent(searchQuery)}`'
)

fs.writeFileSync(absOut, src)
console.log(`Patched: ${absIn} -> ${absOut}`)
