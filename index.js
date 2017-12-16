'use strict';

const accept = require('accept');
const explanation = require('./lib/explanation');
const pkg = require('./package.json');

const sentencify = (input) => {
    return input[0].toUpperCase() + input.substring(1) + (input.endsWith('.') ? '' : '.');
};

const prefersHtml = (str) => {
    // TODO: Respect q weightings: https://github.com/hapijs/accept/issues/19
    const types = accept.mediaTypes(str);
    return types.includes('text/html') || types.includes('*/*');
};

const register = (server) => {
    server.ext('onPreResponse', (request, h) => {
        const { response } = request;

        if (!response.isBoom || !prefersHtml(request.headers.accept)) {
            return h.continue;
        }

        const { statusCode, message, error } = response.output.payload;
        const context = {
            code    : statusCode,
            title   : error,
            // TODO: We should prefer payload.message in some cases, or maybe put it
            // in a detail field. E.g. validation error caauses 400 Bad Request,
            // responding with a generic message is not helpful
            message : sentencify(explanation[statusCode] || message || 'Sorry, an unknown problem has arisen.')
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
