# enb-markdown
[![NPM version](https://img.shields.io/npm/v/enb-markdown.svg?style=flat)](https://www.npmjs.com/package/enb-markdown)
[![Build Status](https://travis-ci.org/levonet/enb-markdown.svg?branch=master)](https://travis-ci.org/levonet/enb-markdown)
[![Coverage Status](https://coveralls.io/repos/github/levonet/enb-markdown/badge.svg?branch=master)](https://coveralls.io/github/levonet/enb-markdown?branch=master)

Пакет предоставляет набор [ENB](https://ru.bem.info/toolbox/enb/)-технологий
для сборки Markdown-файлов, разложенных по [методологии БЭМ](https://ru.bem.info/method/),
и конвертации их в HTML с использованием пакета [markdown-bemjson](https://github.com/bem-contrib/markdown-bemjson).

## Установка

```sh
$ npm install --save-dev enb-markdown
```

**Требования:**

  - `Node.js` версии `6.0.0` и выше
  - базовые шаблоны для BEMHTML и BEMTREE, которые находятся в библиотеке [bem-core](https://ru.bem.info/libs/bem-core/) или [bem-bl](https://ru.bem.info/libs/bem-bl/)

## Быстрый старт

### Сборка бандла с технологией Markdown

Предположим, документы разложены в формате Markdown с использованием БЭМ-наименования файлов.

```
articles/
└── article/
    ├── _part/
    │   ├── article_part_first.markdown
    │   └── article_part_second.markdown
    └── article.markdown
```

Минимальная настройка сборки:

```js
var MarkdownTech = require('enb-markdown/techs/markdown'),
    FileProvideTech = require('enb/techs/file-provider'),
    bemTechs = require('enb-bem-techs');

module.exports = function(config) {
    config.node('bundle', function(node) {
        // get FileList
        node.addTechs([
            [FileProvideTech, { target: '?.bemdecl.js' }],
            [bemTechs.levels, levels: ['articles']],
            [bemTechs.deps],
            [bemTechs.files]
        ]);

        // build markdown file
        node.addTech(MarkdownTech);
        node.addTarget('?.markdown');
    });
};
```

Декларация в `bemdecl.js` для сборки целевого документа в бандле, в том порядке в котором БЭМ-сущности задекларированы:

```js
exports.blocks = [
    {
        "name": "article"
    },
    {
        "name": "article",
        "mods": [{
            "name": "part",
            "vals": [
                { "name": "first" },
                { "name": "second" }
            ]
        }]
    }
];
```

### Сборка HTML из Markdown-технологии

Минимальная настройка сборки:

```js
var FileProvideTech = require('enb/techs/file-provider'),
    bemTechs = require('enb-bem-techs'),
    bemtreeTech = require('enb-bemxjst/techs/bemtree'),
    bemhtmlTech = require('enb-bemxjst/techs/bemhtml');
    MarkdownTech = require('enb-markdown/techs/markdown'),
    MarkdownToHtmlTech = require('enb-markdown/techs/markdown-to-html');

module.exports = function(config) {
    config.node('bundle', function(node) {
        node.addTechs([
            // get FileList
            [FileProvideTech, { target: '?.bemdecl.js' }],
            [bemTechs.levels, levels: [
                { path: 'node_modules/bem-core/common.blocks', check: false },
                'articles'
            ]],
            [bemTechs.deps],
            [bemTechs.files],

            // bemtree
            [bemtreeTech, { sourceSuffixes: ['bemtree', 'bemtree.js'] }],

            // bemhtml
            [bemhtmlTech, { sourceSuffixes: ['bemhtml', 'bemhtml.js'] }],

            // markdown
            [MarkdownTech],

            // build HTML file
            [MarkdownToHtmlTech]
        ]);

        node.addTarget('?.html');
    });
};
```

## Особенности работы пакета

### Правила преобразования в HTML

Для преобразования Markdown в HTML используется модуль [markdown-bemjson](https://github.com/bem-contrib/markdown-bemjson) для промежуточной конвертации в BEMJSON.

Опция `markdownBemjsonOptions` в технологии `markdown-to-html` используется для передачи [опций markdown-bemjson](https://github.com/bem-contrib/markdown-bemjson#contructoroptions), в том числе и правил преобразования `options.rules`.

В доступных [свойствах](https://github.com/bem-contrib/markdown-bemjson#Доступные-свойства-для-правил) правил преобразования есть возможность передать данные в шаблоны. Последним аргументом свойства передаётся объект с методами, которые передают данные по заданному пути в `ctx` в области видимости root-блока:

  - `setInRootCtx(path, value, [rewrite])` — добавляет свойство по заданному пути
    - `path (Array|string)` — путь к свойству
    - `value (*)` — значение
    - `[rewrite=true] (Boolean) ` — нужно ли перезаписать, если свойство существует
  - `pushToRootCtx(path, value)` — добавляет значение в массив по заданному пути
    - `path (Array|string)` — путь к свойству
    - `value (*)` — значение

Пример правила:

```js
module.exports = {
    heading(text, level, raw, rootCtx) {
        if (level === 1) {
            rootCtx.setInRootCtx('title', raw, false);
        }

        return {
            block: 'head',
            mods: { level: level },
            content: text
        };
    }
};
```

### Root-блок

По умолчанию `page`, можно изменить опцией `rootBlock`.

### Расширение документа

Для именования Markdown-файлов по умолчанию используется расширение `.markdown`,
чтоб не пересекаться с документами внешних библиотек, которые подключаются как уровни переопределения.

Для использования более привычного расширения `.md` нужно настроить отдельную конфигурацию для сборки Markdown из отдельного уровня переопределения, который не будет пересекаться с уровнями блоков вёрстки.

<!-- TODO: Пример подключения сборки документов из отдельного уровня -->

## Лицензия

[MIT](http://en.wikipedia.org/wiki/MIT_License) Лицензия
