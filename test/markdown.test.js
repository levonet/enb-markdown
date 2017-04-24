var fs = require('fs'),
    assert = require('chai').assert,
    path = require('path'),
    mock = require('mock-fs'),
    MockNode = require('mock-enb/lib/mock-node'),
    FileList = require('enb/lib/file-list'),
    loadDirSync = require('mock-enb/utils/dir-utils').loadDirSync,
    MarkdownTech = require('../techs/markdown');

describe('markdown-tech', function () {
    afterEach(function () {
        mock.restore();
    });

    describe('join files', function () {
        var scheme = {
            blocks: {
                'block.markdown': '# Head Markdown 1',
                'block.md': '# Head MD 1',
                'block_part_1.markdown': '## Head Markdown 2',
                'block_part_1.md': '## Head MD 2'
            }
        };

        it('must join all ?.markdown files', function () {
            return build(scheme)
                .then(function () {
                    var content = fs.readFileSync(path.resolve('./bundle/bundle.markdown'), 'utf8');

                    assert.include(content, '# Head Markdown 1', 'target bundle contains string "# Head Markdown 1"');
                    assert.include(content, '## Head Markdown 2', 'target bundle contains string "## Head Markdown 2"');
                    assert.notInclude(content, '# Head MD 1', 'target bundle does not contains string "# Head MD 1"');
                    assert.notInclude(content, '## Head MD 2', 'target bundle does not contains string "## Head MD 2"');
                });
        });

        it('must join all ?.md files', function () {
            var options = {
                target: '?.md',
                sourceSuffixes: ['md']
            };

            return build(scheme, options)
                .then(function () {
                    var content = fs.readFileSync(path.resolve('./bundle/bundle.md'), 'utf8');

                    assert.include(content, '# Head MD 1', 'target bundle contains string "# Head MD 1"');
                    assert.include(content, '## Head MD 2', 'target bundle contains string "## Head MD 2"');
                    assert.notInclude(content, '# Head Markdown 1', 'target bundle does not contains string "# Head Markdown 1"');
                    assert.notInclude(content, '## Head Markdown 2', 'target bundle does not contains string "## Head Markdown 2"');
                });
        });
    });
});

function build (scheme, options) {
    var bundle = new MockNode('bundle'),
        fileList = new FileList();

    scheme.bundle = {};
    mock(scheme);

    fileList.addFiles(loadDirSync('blocks'));

    bundle.provideTechData('?.files', fileList);

    return bundle.runTech(MarkdownTech, options);
}
