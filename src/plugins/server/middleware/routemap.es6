import {
    util
} from '../../../helper';
import path from 'path';
import _ from 'util';
import pathToRegexp from 'path-to-regexp';

/**
 * 全局中间件,会将具体的页面转换成需要的资源
 * 1.同步
 *  { commonTplPath,commonSync }
 * 2.异步
 *  { commonAsync }
 * @param  {[type]} config [description]
 * @return {[type]}        [description]
 */

const fileDispatcher = (config) => {
    const routeMap = new Map();
    routeMap.set('/', function ({ commonTplPath }) {
        this.dispatcher = util.dispatcherTypeCreator(
            'dir', commonTplPath, void 0
        );
    });

    routeMap.set(`.${config.extension}`, function ({ commonTplPath, commonSync}) {
        this.dispatcher = util.dispatcherTypeCreator(
            'sync', commonTplPath, commonSync
        );
    });

    routeMap.set('.json', function ({ commonAsync }) {
        this.dispatcher = util.dispatcherTypeCreator(
            'async', void 0, commonAsync
        );
    });
    return routeMap;
};

export default (config) => {
    const routeMap = fileDispatcher(config);
    return function* (next) {
        /**
         * ① 拦截 router
         * @type {[type]}
         */
        const [routers, method] = [config.routers||[], this.request.method];

        /**
         * 入口时，自动转换
         */
        let requestPath = (this.request.path == '/') ? '/index.html' : this.request.path;

        /**
         * 路径统一绝对路径
         */
        const requestInfo = {};
        /**
         * computedTplPath 与 tplPath 的区别是 在 请求url为'/'的时候
         * 前者为 '.../tpl/',
         * @type {[string]}
         */
        requestInfo.commonTplPath = path.join(config.viewRoot, this.request.path);

        /**
         * 根据用户定义的规则和url,生成通用的同步数据路径
         * @type {[string]}
         */
        requestInfo.commonSync = config.syncDataMatch(util.jsonPathResolve(requestPath));

        /**
         * 根据用户定义的规则和url,生成通用的异步数据路径
         * @type {[string]}
         */
        requestInfo.commonAsync = config.asyncDataMatch(util.jsonPathResolve(requestPath));

        if(this.request.query.mode !=1){
            /**
             * 遍历路由表,并给请求对象处理,生成 this.dispatcher
             */
            for (let router of routers) {

                if (!config.divideMethod && router.method.toUpperCase() !== method.toUpperCase()){
                    continue;
                }

                if (!pathToRegexp(router.url).test(this.request.path)) {
                    continue;
                }

                /**
                 * 同步接口
                 * 可能插件会生成一个 syncData ,若已生成则用插件的
                 * 即: 插件对于响应,有更高的权限
                 */
                if (router.sync) {
                    let tplPath = path.join(config.viewRoot, `${util.removeSuffix(router.filePath)}.${config.extension}`);
                    let tplMockPath = path.join(config.syncData, `${util.removeSuffix(router.filePath)}.json`);
                    this.dispatcher = util.dispatcherTypeCreator(
                        'sync',
                        tplPath,
                        tplMockPath,
                        router.handler
                    );
                } else {
                    /**
                     * 如果插件已生成了 asyncData 属性,则用插件的
                     * 即: 插件对于响应,有更高的权限
                     */
                    let modelPath = path.join(config.asyncData, `${router.filePath}.json`);
                    this.dispatcher = util.dispatcherTypeCreator(
                        'async',
                        void 0,
                        modelPath,
                        router.handler
                    );
                }
                return yield next;
            }
        }
        
        /**
         * ② 未拦截到 router
         */
        for (let [route, handler] of routeMap) {
            if (this.request.path.endsWith(route)) {
                handler.call(this, requestInfo);
                return yield next;
            }
        }
    }
}