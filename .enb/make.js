var fileProviderTech = require('enb/techs/file-provider'),
    bemtreeTech = require('enb-bemxjst/techs/bemtree'),
    bemhtmlTech = require('enb-bemxjst/techs/bemhtml'),
    enbBemTechs = require('enb-bem-techs');

module.exports = function(config) {
    config.nodes('test/fixtures/bundle', function(nodeConfig) {
        nodeConfig.addTechs([
            // essential
            [enbBemTechs.levels, {levels: [{path: 'node_modules/bem-core/common.blocks', check: false}]}],
            [fileProviderTech, {target: '?.bemdecl.js'}],
            [enbBemTechs.deps],
            [enbBemTechs.files],

            // bemtree
            [bemtreeTech],

            // bemhtml
            [bemhtmlTech],
        ]);

        nodeConfig.addTargets(['?.bemtree.js', '?.bemhtml.js']);
    });
};
