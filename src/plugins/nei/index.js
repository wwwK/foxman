import neiTools from './nei';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {util, fileUtil} from '../../helper';
import _ from 'util';
import globule from 'globule';

/**
 * Nei 插件
 */
class NeiPlugin {
    constructor(options) {
        this.options = options;
    }

    init(serverPlugin) {
        const key =  this.options.key;
        const home = os.homedir();
        const basedir = path.resolve(home, 'localMock', key);
        const neiPattern = path.resolve( basedir, 'nei**','nei.json');
        const hasBuild = globule.find( neiPattern ).length > 0 ;
        
        this.server = serverPlugin.server;
        const doUpdate = this.config.argv.update || false;
        this.neiRoute = path.resolve(basedir, 'nei.route.js');

        if (doUpdate) {
            return this.pending((resolve)=> {
                neiTools
                    .run({
                        key, basedir, hasBuild
                    })
                    .then((config) => {
                        this.getUpdate(config);
                    })
                    .then(() => {
                        return this.updateRoutes(this.routes);
                    }).then(resolve);
            });
        }

        const serverConfigFiles = globule.find( path.resolve( baseDir, 'nei**/server.config.js') );

        try {
            if(serverConfigFiles.length == 0) {
                throw new Error('can`t find server.config');
            }
            this.setNeiMockDir(require(serverConfigFiles[0]));
            this.routes = require(this.neiRoute);
        } catch (e) {
            util.error([
                'nei资源不完整，请执行 \n',
                '$ foxman -u'].join(''));
        }

        this.updateRoutes(this.routes);
    }
    setNeiMockDir(neiConfig){
        this.mockTpl = neiConfig.mockTpl;
        this.mockApi = neiConfig.mockApi;
    }

    getUpdate(config) {
        /**
         * neiConfigRoot
         * @type {string|*}
         */
        const neiConfigRoot = path.resolve( config.neiConfigRoot, 'server.config.js');
        const neiConfig = require(neiConfigRoot);
        const rules = neiConfig.routes;
        this.setNeiMockDir(neiConfig);
        this.routes = this.formatRoutes(rules);
        return this.updateLocalFiles(this.routes);
    }

    formatRoutes(rules) {
        let server = this.server;
        let routes = [];
        let neiRoute = this.neiRoute;

        for (let ruleName in rules) {
            if (rules.hasOwnProperty(ruleName)) {
                let filePath, id;
                let rule = rules[ruleName];
                let [method, url] = ruleName.split(' ');

                // nei url 默认都是不带 / ,检查是否有
                url = util.appendHeadBreak(url);

                let sync = rule.hasOwnProperty('list');

                if (sync) {
                    [filePath, id] = [rule.list[0].path, rule.list[0].id];
                } else {
                    [filePath, id] = [rule.path, rule.id];
                }

                routes.push({
                    method, url,
                    sync, filePath, id
                });
            }
        }
        fileUtil.writeFile(neiRoute, `module.exports = ${_.inspect(routes, {maxArrayLength: null})}`, () => {
        }, (e)=> {
            util.error(e);
        });
        return routes;
    }

    updateLocalFiles(routes = []) {

        let server = this.server;
        let [syncData, asyncData] = [server.syncData, server.asyncData];

        const promises = routes.map((route) => {
            return new Promise((resolve, reject) => {
                let dataPath;
                if (route.sync) {
                    dataPath = server.syncDataMatch(util.jsonPathResolve(route.filePath));
                } else {
                    dataPath = path.resolve(server.asyncData, util.jsonPathResolve(route.filePath));
                }

                fs.stat(dataPath, (error, stat) => {
                    /**
                     * 文件不存在或者文件内容为空
                     */
                    if (error) {
                        util.log('make empty file: ' + dataPath);
                        fileUtil.writeUnExistsFile(dataPath, "").then(resolve, reject);
                        return 0;
                    }
                    resolve();
                });
            })
        });
        return new Promise((...args)=> {
            Promise.all(promises).then(()=> {
                args[0](routes);
            }).catch((e)=> {
                util.error(e);
            });
        });
    }

    updateRoutes(routes) {
        let promises = routes.map((route) => {
            return new Promise((...args) => {
                fs.stat(route.filePath, (error, stat) => {
                    /**
                     * 文件不存在或者文件内容为空
                     */
                    if (error || !stat.size) {
                        // TODO url creater
                        const dataPath = this.genNeiApiUrl(route);
                        if (route.sync) {
                            route.syncData = dataPath;
                        } else {
                            route.asyncData = dataPath;
                        }
                    }
                    args[0]();
                });
            })
        });
        return new Promise((...args)=> {
            Promise.all(promises).then(() => {
                let server = this.server;
                server.routers = routes.concat(server.routers);
                args[0]();
            });
        });
    }

    genNeiApiUrl(route) {
        return path.resolve(route.sync ? this.mockTpl : this.mockApi, route.filePath + '.json');
    }
}

export default NeiPlugin;