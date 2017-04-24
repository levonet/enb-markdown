var fs = require('fs'),
    assert = require('chai').assert,
    path = require('path'),
    mock = require('mock-fs'),
    MockNode = require('mock-enb/lib/mock-node'),
    MarkdownToHtmlTech = require('../techs/markdown-to-html'),
    fixturesDir = 'test/fixtures/bundle/';

describe('markdown-to-html', function () {
    before(function () {
        var JobQueueStub = require('mock-enb/lib/job-queue-stub');

        // Использование mock-fs не позволяет подключить bemxjst-processor в рантайме
        // https://github.com/tschaub/mock-fs/issues/12
        // поэтому подключаем его перед инициализацией mock-fs
        JobQueueStub.prototype.processor = require('enb-bemxjst/lib/bemtree-processor');
    });

    afterEach(function () {
        mock.restore();
    });

    describe('must generate html', function () {
        var scheme = {
            bundle: {
                'bundle.markdown': '# Head Markdown',
                'bundle.md': '# Head MD'
            }
        };

        it('from ?.markdown file by default', function () {
            return build(scheme)
                .spread(function (content) {
                    assert.include(content, '<!DOCTYPE html>', 'target bundle is html page');
                    assert.include(content, '<div class="content"><div class="content__h1">Head Markdown</div></div>', 'target bundle contains header');
                    assert.include(content, '<link rel="stylesheet" href="bundle.min.css">', 'target bundle contains css link');
                    assert.include(content, '<script src="bundle.min.js">', 'target bundle contains js script');
                });
        });

        it('from ?.md file', function () {
            return build(scheme, {markdown: '?.md'})
                .spread(function (content) {
                    assert.include(content, '<!DOCTYPE html>', 'target bundle is html page');
                    assert.include(content, '<div class="content__h1">Head MD</div>', 'target bundle contains header from .md');
                    assert.notInclude(content, '<div class="content__h1">Head Markdown</div>', 'target bundle does not contains header .markdown');
                });
        });

        it('from ?.markdown file without css', function () {
            return build(scheme, {requireCss: false})
                .spread(function (content) {
                    assert.include(content, '<!DOCTYPE html>', 'target bundle is html page');
                    assert.notInclude(content, '<link ', 'target bundle does not contains css link');
                });
        });

        it('from ?.markdown file with default css', function () {
            return build(scheme, {requireCss: true})
                .spread(function (content) {
                    assert.include(content, '<!DOCTYPE html>', 'target bundle is html page');
                    assert.include(content, '<link rel="stylesheet" href="bundle.min.css">', 'target bundle contains css link by default');
                });
        });


        it('from ?.markdown file with castom css', function () {
            return build(scheme, {requireCss: '?.castom.css'})
                .spread(function (content) {
                    assert.include(content, '<!DOCTYPE html>', 'target bundle is html page');
                    assert.include(content, '<link rel="stylesheet" href="bundle.castom.css">', 'target bundle contains castom css link');
                });
        });

        it('from ?.markdown file without js', function () {
            return build(scheme, {requireJs: false})
                .spread(function (content) {
                    assert.include(content, '<!DOCTYPE html>', 'target bundle is html page');
                    assert.notInclude(content, '<script ', 'target bundle does not contains js script');
                });
        });

        it('from ?.markdown file with default js', function () {
            return build(scheme, {requireJs: true})
                .spread(function (content) {
                    assert.include(content, '<!DOCTYPE html>', 'target bundle is html page');
                    assert.include(content, '<script src="bundle.min.js">', 'target bundle contains js script by default');
                });
        });

        it('from ?.markdown file with castom js', function () {
            return build(scheme, {requireJs: '?.castom.js'})
                .spread(function (content) {
                    assert.include(content, '<!DOCTYPE html>', 'target bundle is html page');
                    assert.include(content, '<script src="bundle.castom.js">', 'target bundle contains castom js script');
                });
        });

        it('from ?.markdown file with castom root block', function () {
            return build(scheme, {rootBlock: 'block'})
                .spread(function (content) {
                    assert.equal(content, '<div class="block"><div class="content"><div class="content__h1">Head Markdown</div></div></div>', 'target bundle is html page');
                });
        });

        it('from ?.markdown file with markdown-bemjson options', function () {
            return build(scheme, {rootBlock: 'md', markdownBemjsonOptions: {wrapper: false}})
                .spread(function (content) {
                    assert.equal(content, '<div class="md"><div class="md__h1">Head Markdown</div></div>', 'target bundle without block content');
                });
        });
    });

    describe('conversion rules', function () {
        [
            {md: '# Head 1', html: '<div class="md"><h1 class="head">Head 1</h1></div>'},
            {md: '## Head 2', html: '<div class="md"><h2 class="head">Head 2</h2></div>'},
            {md: '### Head 3', html: '<div class="md"><h3 class="head">Head 3</h3></div>'},
            {md: '#### Head 4', html: '<div class="md"><h4 class="head">Head 4</h4></div>'},
            {md: '##### Head 5', html: '<div class="md"><h5 class="head">Head 5</h5></div>'},
            {md: '###### Head 6', html: '<div class="md"><h6 class="head">Head 6</h6></div>'}
        ].forEach(function (data) {
            it('from ' + data.md, function () {
                var scheme = {
                        bundle: {
                            'bundle.markdown': data.md
                        }
                    },
                    options = {
                        rootBlock: 'md',
                        markdownBemjsonOptions: {
                            wrapper: false,
                            rules: {
                                heading (text, level) {
                                    return headBEMJSON(text, level);
                                }
                            }
                        }
                    };

                return build(scheme, options)
                    .spread(function (content) {
                        assert.equal(content, data.html, 'convert from ' + data.md);
                    });
            });
        });
    });

    describe('inject to root ctx', function () {
        var scheme = {bundle: {}},
            options = {
                markdownBemjsonOptions: {
                    rules: {
                        heading (text, level, raw, rootCtx) {
                            rootCtx.setInRootCtx('title', raw);
                            return headBEMJSON(text, level);
                        }
                    }
                }
            };

        beforeEach(function () {
            scheme.bundle['bundle.markdown'] = '# Head 1\n# Head 2';
        });

        it('setInRootCtx() set undefined', function () {
            scheme.bundle['bundle.markdown'] = '# Head';

            return build(scheme, options)
                .spread(function (content) {
                    assert.include(content, '<title>Head</title>');
                });
        });

        it('setInRootCtx() rewrite if exists', function () {
            return build(scheme, options)
                .spread(function (content) {
                    assert.include(content, '<title>Head 2</title>');
                });
        });

        it('setInRootCtx() save if exists', function () {
            options.markdownBemjsonOptions = {
                rules: {
                    heading (text, level, raw, rootCtx) {
                        rootCtx.setInRootCtx('title', raw, false);
                        return headBEMJSON(text, level);
                    }
                }
            };

            return build(scheme, options)
                .spread(function (content) {
                    assert.include(content, '<title>Head 1</title>');
                });
        });

        it('pushToRootCtx() to defined Array', function () {
            options.markdownBemjsonOptions = {
                rules: {
                    heading (text, level, raw, rootCtx) {
                        rootCtx.pushToRootCtx('head', {elem: 'meta', attrs: {property: 'og:title', content: raw}});
                        return headBEMJSON(text, level);
                    }
                }
            };

            return build(scheme, options)
                .spread(function (content) {
                    assert.include(content, '<meta property="og:title" content="Head 1">');
                    assert.include(content, '<meta property="og:title" content="Head 2">');
                });
        });

        it('pushToRootCtx() to undefined', function () {
            options.markdownBemjsonOptions = {
                rules: {
                    heading (text, level, raw, rootCtx) {
                        rootCtx.pushToRootCtx('title', raw);
                        return headBEMJSON(text, level);
                    }
                }
            };

            return build(scheme, options)
                .spread(function (content) {
                    assert.include(content, '<title>Head 1Head 2</title>');
                });
        });

        it('pushToRootCtx() to not Array', function () {
            options.markdownBemjsonOptions = {
                rules: {
                    heading (text, level, raw, rootCtx) {
                        rootCtx.setInRootCtx('title', 'Castom Title');
                        rootCtx.pushToRootCtx('title', raw);
                        return headBEMJSON(text, level);
                    }
                }
            };

            return build(scheme, options)
                .spread(function (content) {
                    assert.include(content, '<title>Castom Title</title>');
                });
        });
    });
});

function headBEMJSON (text, level) {
    return {
        block: 'head',
        tag: 'h' + level,
        content: text
    };
}

function build (scheme, options) {
    options || (options = {});

    // hack for mock-fs
    [
        fixturesDir + '/bundle.bemtree.js',
        fixturesDir + '/bundle.bemhtml.js',
        'node_modules/markdown-bemjson/index.js',
        'node_modules/markdown-bemjson/rules/default.js'
    ].forEach(function (module) {
        scheme[path.resolve(module)] = fs.readFileSync(path.resolve(module), 'utf8');
    });

    var bundle = new MockNode('bundle');
    bundle._targetNamesToBuild = ['bundle'];

    mock(scheme);

    options.bemtree = path.resolve(fixturesDir + '/bundle.bemtree.js');
    options.bemhtml = path.resolve(fixturesDir + '/bundle.bemhtml.js');
    return bundle.runTechAndGetContent(MarkdownToHtmlTech, options);
}
