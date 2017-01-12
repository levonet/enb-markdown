/**
 * @class MarkdownToHtmlTech
 * @augments {BaseTech}
 * @classdesc
 *
 * Build HTML file from MARKDOWN. <br/><br/>
 *
 * This tech uses `BEMHTML`, `BEMTREE` and `markdown-bemjson` to build HTML.
 * In `bundle/bundle.bemdecl.js` need declare block `page`.
 *
 * @param {Object}            [options]                            Options
 * @param {String}            [options.target='?.html']            Path to a target with HTML file.
 * @param {String}            [options.markdownFile='?.markdown']  Path to MARKDOWN file.
 * @param {String}            [options.bemhtmlFile='?.bemtree.js'] Path to a file with compiled BEMTREE module.
 * @param {String}            [options.bemhtmlFile='?.bemhtml.js'] Path to a file with compiled BEMHTML module.
 * @param {String | Boolean}  [options.requireCss='?.min.css']     Path to CSS tech file. Set `false` if not required.
 * @param {String | Boolean}  [options.requireJs='?.min.js']       Path to JS tech file. Set `false` if not required.
 *
 * @example
 * var FileProvideTech = require('enb/techs/file-provider'),
 *     bemTechs = require('enb-bem-techs'),
 *     bemtreeTech = require('enb-bemxjst/techs/bemtree'),
 *     bemhtmlTech = require('enb-bemxjst/techs/bemhtml');
 *     MarkdownTech = require('enb-markdown/techs/markdown'),
 *     MarkdownToHtmlTech = require('enb-markdown/techs/markdown-to-html');
 *
 * module.exports = function(config) {
 *     config.node('bundle', function(node) {
 *         node.addTechs([
 *             // get FileList
 *             [FileProvideTech, { target: '?.bemdecl.js' }],
 *             [bemTechs.levels, levels: [
 *                 { path: 'node_modules/bem-core/common.blocks', check: false },
 *                 'articles'
 *             ]],
 *             [bemTechs.deps],
 *             [bemTechs.files],
 *
 *             // bemtree
 *             [bemtreeTech, { sourceSuffixes: ['bemtree', 'bemtree.js'] }],
 *
 *             // bemhtml
 *             [bemhtmlTech, { sourceSuffixes: ['bemhtml', 'bemhtml.js'] }],
 *
 *             // markdown
 *             [MarkdownTech],
 *
 *             // build HTML file
 *             [MarkdownToHtmlTech]
 *         ]);
 *
 *         node.addTarget('?.html');
 *     });
 * };
 */
const dropRequireCache = require('enb/lib/fs/drop-require-cache');
const MarkdownBemjson = require('markdown-bemjson');

module.exports = require('enb/lib/build-flow').create()
    .name('markdown-to-html')
    .target('target', '?.html')
    .useSourceText('markdown', '?.markdown')
    .useSourceFilename('bemtree', '?.bemtree.js')
    .useSourceFilename('bemhtml', '?.bemhtml.js')
    .defineOption('markdownBemjsonOptions', {})
    .defineOption('requireCss', '?.min.css')
    .defineOption('requireJs', '?.min.js')
    .builder(function (markdownText, bemtreeFilename, bemhtmlFilename) {
        dropRequireCache(require, bemtreeFilename);
        dropRequireCache(require, bemhtmlFilename);

        const BEMTREE = require(bemtreeFilename).BEMTREE;
        const BEMHTML = require(bemhtmlFilename).BEMHTML;
        const markdownBemjsonOptions = this._markdownBemjsonOptions;
        const bemtree = { block: 'page', head: [], scripts: [] };

        const htmlRule = function (html) {
            function parsePageMetadata(data) {
                var result;

                if (result = data.match(/^TITLE:\s*(.*)$/)) {
                    bemtree.title = result[1].replace(/\s$/g, '');
                    return true;
                }
                if (result = data.match(/^HEAD:\s*(.*)$/)) {
                    bemtree.head.push(eval('(' + result[1] + ')'));
                    return true;
                }

                return false;
            }

            function parse(element) {
                var arg;

                if (arg = element.match(/^<!--\s*(.*)\s*-->$/)) {
                    if (parsePageMetadata(arg[1])) {
                        return '';
                    }
                }
                if (element.match(/^\n+$/)
                    || element.match(/^<!-- begin:.+$/)
                    || element.match(/^<!-- end:.+$/)) {
                    return '';
                }

                return element;
            }

            if (typeof html === 'object' && html instanceof Array) {
                html.forEach((item, i, arr) => {
                    arr[i] = parse(item);
                });
            } else if (typeof html === 'string') {
                    html = parse(html);
            }

            return html;
        };

        if (typeof markdownBemjsonOptions.rules.html === "function") {
            const userHtmlRule = markdownBemjsonOptions.rules.html;
            markdownBemjsonOptions.rules.html = html => userHtmlRule(htmlRule(html));
        } else {
            markdownBemjsonOptions.rules.html = htmlRule;
        }

        if (this._requireCss) {
            bemtree.head.push({
                elem: 'css',
                url: this.node.unmaskTargetName(typeof this._requireCss === 'boolean' ? '?.min.css' : this._requireCss)
            });
        }

        if (this._requireJs) {
            bemtree.scripts.push({
                elem: 'js',
                url: this.node.unmaskTargetName(typeof this._requireJs === 'boolean' ? '?.min.js' : this._requireJs)
            });
        }

        const markdownBemjson = new MarkdownBemjson(markdownBemjsonOptions);

        bemtree.content = markdownBemjson.convert(markdownText);

        return BEMHTML.apply(BEMTREE.apply(bemtree));
    })
    .createTech();
