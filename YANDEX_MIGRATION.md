# 2GIS -> Яндекс.Картинки (без удаления кода)

Добавлен скрипт `scripts_patch_2gis_to_yandex.js`, который делает **неразрушающую** миграцию:
- не удаляет блоки и функции;
- только переименовывает 2GIS-константы/идентификаторы в Yandex-варианты;
- перенаправляет поисковый URL на `https://yandex.ru/images/search?text=...`.

## Использование

```bash
node scripts_patch_2gis_to_yandex.js path/to/parser.js path/to/parser.yandex.js
```

Или перезаписать исходник:

```bash
node scripts_patch_2gis_to_yandex.js path/to/parser.js
```
