/**
 * @class MarkdownTech
 * @augments {BaseTech}
 * @classdesc
 *
 * Builds MARKDOWN file with BEM entities from specified levels. <br/><br/>
 *
 * It is recommended to use unique extensions to exclude documents
 * from the other blocks in the result.
 *
 * @param {Object}    [options]                              Options
 * @param {String}    [options.target='?.markdown']          Path to compiled file.
 * @param {String}    [options.filesTarget='?.files']        Path to a target with FileList<br>
 *                                                           {@link http://bit.ly/1GTUOj0}
 * @param {String[]}  [options.sourceSuffixes=['markdown']]  Files with specified suffixes<br>
 *                                                           involved in the assembly.
 * @example
 * // Code in a file system before build:
 * // articles/
 * // └── article/
 * //     ├── _part/
 * //     │   ├── article_part_first.markdown
 * //     │   └── article_part_second.markdown
 * //     └── article.markdown
 * //
 * // After build:
 * // bundle/
 * // └── bundle.markdown
 *
 * var MarkdownTech = require('enb-markdown/techs/markdown'),
 *     FileProvideTech = require('enb/techs/file-provider'),
 *     bemTechs = require('enb-bem-techs');
 *
 * module.exports = function(config) {
 *     config.node('bundle', function(node) {
 *         // get FileList
 *         node.addTechs([
 *             [FileProvideTech, { target: '?.bemdecl.js' }],
 *             [bemTechs.levels, levels: ['articles']],
 *             [bemTechs.deps],
 *             [bemTechs.files]
 *         ]);
 *
 *         // build markdown file
 *         node.addTech(MarkdownTech);
 *         node.addTarget('?.markdown');
 *     });
 * };
 *
 * // In bundle/bundle.bemdecl.js
 *
 * exports.blocks = [
 *     {
 *         "name": "article"
 *     },
 *     {
 *         "name": "article",
 *         "mods": [{
 *             "name": "part",
 *             "vals": [
 *                 { "name": "first" },
 *                 { "name": "second" }
 *             ]
 *         }]
 *     }
 * ];
 */
const EOL = require('os').EOL;

module.exports = require('enb/lib/build-flow').create()
    .name('markdown')
    .target('target', '?.markdown')
    .useFileList('markdown')
    .justJoinFiles(function (filename, data) {
        const fn = this.node.relativePath(filename);
        return [
            '<!-- begin: ' + fn + ' -->',
            data,
            '<!-- end: ' + fn + ' -->'
        ].join(EOL);
    })
    .createTech();
