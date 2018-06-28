'use strict';

const accept = require('accept');
const explanation = require('./lib/explanation');
const pkg = require('./package.json');

const explain = (statusCode) => {
    const text = explanation[statusCode];
    return text && text[0].toUpperCase() + text.substring(1) + (text.endsWith('.') ? '' : '.');
};

const prefersHtml = (str) => {
    // TODO: Respect q weightings: https://github.com/hapijs/accept/issues/19
    const types = accept.mediaTypes(str);
    return types.includes('text/html') || types.includes('*/*');
};

const register = (server) => {
    server.ext('onPreResponse', (request, h) => {
        const { response, auth } = request;
        if (!response.isBoom || !prefersHtml(request.headers.accept)) {
            return h.continue;
        }

        const { statusCode, message, error } = response.output.payload;
        const isCanned = message === error;
        const context = {
            code            : statusCode,
            isAuthenticated : auth.isAuthenticated,
            title           : error || 'Unknown Error',
            message         : (isCanned ? '' : message) ||
                explain(statusCode) ||
                error ||
                'Sorry, an unknown problem has arisen.'
        };

        // TODO: Provide a fallback view file.
        // const viewConf = request.server.realm.plugins.vision.manager._engines.html.config;
        // return h.view('error', context, {
        //     path : [].concat(viewConf.path || [], path.join(__dirname, 'lib', 'view'))
        // });
        return h.view('error', context).code(statusCode);
    });
};

module.exports.plugin = {
    register,
    pkg,
    dependencies : 'vision'
};
