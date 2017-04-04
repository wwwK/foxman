#!/usr/bin/env node
'use strict';
import yargs from 'yargs';
import path from 'path';

import App from '../app';
import validate from './utils/validate';
import {log, error as wrong, warnLog as error} from '../helper/util';
import pkg from '../../package.json';

const argv = yargs
    .usage('Usage: foxman [options]')
    .alias('C', 'config')
    .alias('C', 'c')
    .describe('C', '配置文件路径')
    .default('C', 'foxman.config.js')

    .alias('P', 'proxy')
    .describe('P', '使用配置中的代理，填写代理名即可')
    .default('P', false)

    .alias('p', 'port')
    .describe('p', '指定临时端口')
    .default('p', false)

    .alias('U', 'update')
    .alias('U', 'u')
    .describe('U', '是否远程nei中拉取接口信息')
    .default('U', false)

    // .command('tpl', 'code generate', function (yargs) {
    //     return yargs.option('T', {
    //         alias: 'type',
    //         default: 'FoxmanConfig'
    //     }).option('W', {
    //         alias: 'where',
    //         default: 'foxman.config.js'
    //     })
    // })

    // .command('lint', 'eslint for foxman', function (yargs) {
    //     return yargs.option('T', {
    //         alias: 'type',
    //         default: 'FoxmanConfig'
    //     }).option('W', {
    //         alias: 'where',
    //         default: 'foxman.config.js'
    //     })
    // })

    .alias('V', 'version')
    .alias('V', 'v')
    .describe('V', 'Show version')
    .version(() => `v${pkg.version}`)

    .help('H')
    .alias('H', 'help')
    .alias('H', 'h')

    .example('foxman -C ./config.json -P local -U')
    .argv;

let config;
const configPath = path.join(process.cwd(), argv.config);

try {
    config = require(configPath);
} catch (err) {
    const e = 'error'.red;
    if (err.code === 'MODULE_NOT_FOUND') {
        if (~err.toString().indexOf(configPath)) {
            error(`Please add foxman.config.js in current directory.`);
            error(`Also you can appoint your special name,`);
            error(`use command 'foxman --config yourfoxman.config.js'.`);
            error(`See more in command 'foxman --help'`);

        } else {
            error(`Make sure you have the latest version of node.js and foxman.`);
            error(`If you do, this is most likely a problem with the plugins used in ${path.join(process.cwd(), 'foxman.config.js')},`);
            error(`not with foxman itself`);
            console.log('\n');
            console.log(err.stack);
            console.log('\n');
            error(`You can try 'npm install' or check the foxman.config.js`);
        }
    } else {
        error(`Maybe it's a problem with foxman.config.js, check it or contact us(http://github.com/kaola-fed/foxman/issues)`);
        console.log(err);
    }

    process.exit(1);
}

if (argv.port) {
    config.server.port = parseInt(argv.port);
}
if (!config.server.templatePaths)  {
    config.server.templatePaths = {};
}

let res = validate(config);
if (res !== true) {
    wrong(res);
}

App(Object.assign({}, config, {argv}, {configPath}));