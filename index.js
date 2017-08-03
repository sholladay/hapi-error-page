'use strict';

const accept = require('accept');
const explanation = require('./lib/explanation');
const pkg = require('./package.json');

const sentencify = (input) => {
    return input[0].toUpperCase() + input.substring(1) + (input.endsWith('.') ? '' : '.');
};

const acceptsHtml = (str) => {
    const types = accept.mediaTypes(str);
    return types.includes('text/html') || types.includes('*/*');
};

const register = (server, option, done) => {
    server.ext('onPreResponse', (request, reply) => {
        const { response } = request;

        if (!response.isBoom || !acceptsHtml(request.headers.accept)) {
            reply.continue();
            return;
        }

        const { payload } = response.output;
        const context = {
            code    : payload.statusCode,
            title   : payload.error,
            message : sentencify(
                payload.message ||
                explanation[payload.statusCode] ||
                'Sorry, an unknown problem has arisen.'
            )
        };

        // TODO: Provide a fallback view file.
        // const viewConf = request.server.realm.plugins.vision.manager._engines.html.config;
        // reply.view('error', context, {
        //     path : [].concat(viewConf.path || [], path.join(__dirname, 'lib', 'view'))
        // });
        reply.view('error', context).code(payload.statusCode);
    });

    done();
};

register.attributes = {
    pkg,
    dependencies : 'vision'
};

module.exports = {
    register
};
