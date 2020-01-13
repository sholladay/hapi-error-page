'use strict';

const accept = require('@hapi/accept');
const explanation = require('./lib/explanation');
const pkg = require('./package.json');

const explain = (statusCode) => {
    const text = explanation[statusCode];
    return text && text[0].toUpperCase() + text.slice(1) + (text.endsWith('.') ? '' : '.');
};

const prefersHtml = (str) => {
    return ['text/html', 'text/*'].includes(accept.mediaTypes(str)[0]);
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
        // const result = h.view('error', context, {
        //     path : [].concat(viewConf.path || [], path.join(__dirname, 'lib', 'view'))
        // });
        const result = h.view('error', context).code(statusCode);
        for (const [key, value] of Object.entries(response.output.headers)) {
            result.header(key, value);
        }
        return result;
    });
};

module.exports.plugin = {
    register,
    pkg,
    dependencies : '@hapi/vision'
};
