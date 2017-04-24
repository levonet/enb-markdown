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
 * @param {Object}            [options]                           Options
 * @param {String}            [options.target='?.html']           Path to a target with HTML file.
 * @param {String}            [options.markdown='?.markdown']     Path to MARKDOWN file.
 * @param {String}            [options.bemtree='?.bemtree.js']    Path to a file with compiled BEMTREE module.
 * @param {String}            [options.bemhtml='?.bemhtml.js']    Path to a file with compiled BEMHTML module.
 * @param {Object}            [options.markdownBemjsonOptions={}] MarkdownBemjson options.
 * @param {String | Boolean}  [options.requireCss='?.min.css']    Path to CSS tech file. Set `false` if not required.
 * @param {String | Boolean}  [options.requireJs='?.min.js']      Path to JS tech file. Set `false` if not required.
 * @param {String}            [options.rootBlock='page']          Name of root block.
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
const _ = require('lodash');
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
    .defineOption('rootBlock', 'page')
    .builder(function (markdownText, bemtreeFilename, bemhtmlFilename) {
        dropRequireCache(require, bemtreeFilename);
        dropRequireCache(require, bemhtmlFilename);

        const node = this.node,
            BEMTREE = require(bemtreeFilename).BEMTREE,
            BEMHTML = require(bemhtmlFilename).BEMHTML,
            markdownBemjsonOptions = _.cloneDeep(this._markdownBemjsonOptions),
            bemtree = {block: this._rootBlock};

        const rootCtx = {
            setInRootCtx: function (path, value, rewrite) {
                if (typeof rewrite === 'undefined') {
                    rewrite = true;
                }

                if (_.has(bemtree, path) && _.get(bemtree, path) !== '' && !rewrite) {
                    return;
                }

                _.set(bemtree, path, value);
            },

            pushToRootCtx: function (path, value) {
                if (_.has(bemtree, path)) {
                    if (!_.isArray(_.get(bemtree, path))) {
                        node.getLogger()
                            .logWarningAction('warning', node._targetNamesToBuild[0],
                                'Object in rootCtx.' + path + ' is not Array');
                        return;
                    }
                } else {
                    _.set(bemtree, path, []);
                }

                _.get(bemtree, path).push(value);
            }
        };

        if (typeof markdownBemjsonOptions.rules === "object") {
            const rules = _.mapValues(markdownBemjsonOptions.rules, rule =>
                typeof rule === "function"
                    ? function () {
                        const args = _.values(arguments);

                        // Inject rootCtx methods to user rule functions
                        args.push(rootCtx);

                        return rule.apply(null, args);
                    }
                    : rule
            );

            markdownBemjsonOptions.rules = rules;
        }

        if (this._requireCss) {
            bemtree.head = [{
                elem: 'css',
                url: node.unmaskTargetName(typeof this._requireCss === 'boolean' ? '?.min.css' : this._requireCss)
            }];
        }

        if (this._requireJs) {
            bemtree.scripts = [{
                elem: 'js',
                url: node.unmaskTargetName(typeof this._requireJs === 'boolean' ? '?.min.js' : this._requireJs)
            }];
        }

        const markdownBemjson = new MarkdownBemjson(markdownBemjsonOptions);

        bemtree.content = markdownBemjson.convert(markdownText);

        return BEMHTML.apply(BEMTREE.apply(bemtree));
    })
    .createTech();
