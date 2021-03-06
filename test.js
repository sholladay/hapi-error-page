import path from 'path';
import test from 'ava';
import hapi from '@hapi/hapi';
import boom from '@hapi/boom';
import cookie from '@hapi/cookie';
import vision from '@hapi/vision';
import handlebars from 'handlebars';
import errorPage from '.';

const makeRoute = (option) => {
    return {
        method : 'GET',
        path   : '/',
        handler() {
            throw new Error('my gosh');
        },
        ...option
    };
};

const makeServer = async (option) => {
    const { plugin } = {
        plugin : [cookie, vision, errorPage],
        ...option
    };
    const server = hapi.server();
    if (plugin) {
        await server.register(plugin);
    }
    if (typeof server.views === 'function') {
        server.views({
            engines    : { html : handlebars },
            relativeTo : path.join(__dirname, 'fixture'),
            path       : '.'
        });
    }
    return server;
};

test('baseline without errorPage', async (t) => {
    const server = await makeServer({ plugin : null });
    server.route(makeRoute());
    const response = await server.inject('/');
    t.is(response.statusCode, 500);
    t.is(response.statusMessage, 'Internal Server Error');
    t.is(response.headers['content-type'], 'application/json; charset=utf-8');
    t.is(response.payload, JSON.stringify({
        statusCode : 500,
        error      : 'Internal Server Error',
        message    : 'An internal server error occurred'
    }));
});

test('throws without vision', async (t) => {
    const server = await makeServer({ plugin : [errorPage] });
    const error = await t.throwsAsync(server.initialize());
    t.is(error.message, 'Plugin hapi-error-page missing dependency @hapi/vision');
});

test('server can initialize', async (t) => {
    const server = await makeServer();
    await t.notThrowsAsync(server.initialize());
});

test('ignores requests without accept header', async (t) => {
    const server = await makeServer();
    server.route(makeRoute());
    const response = await server.inject('/');
    t.is(response.statusCode, 500);
    t.is(response.statusMessage, 'Internal Server Error');
    t.is(response.headers['content-type'], 'application/json; charset=utf-8');
    t.is(response.payload, JSON.stringify({
        statusCode : 500,
        error      : 'Internal Server Error',
        message    : 'An internal server error occurred'
    }));
});

test('honors accept header', async (t) => {
    const server = await makeServer();
    server.route(makeRoute());
    const requestType = (accept) => {
        return server.inject({
            url     : '/',
            headers : { accept }
        });
    };

    const htmlAcceptHeaders = [
        'text/*',
        'text/html',
        '*/*,text/*',
        '*/*,text/html',
        '*/*,application/json;q=0.9',
        'text/*,application/json;q=0.9',
        'text/html,application/json;q=0.9',
        'application/json;q=0.9,*/*',
        'application/json;q=0.9,text/*',
        'application/json;q=0.9,text/html',
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    ];

    const jsonAcceptHeaders = [
        '*/*',
        'application/*',
        'application/json',
        '*/*,text/html;q=0.9',
        'application/*,text/html',
        'application/*,text/html;q=0.9',
        'application/json,text/html',
        'application/json,text/html;q=0.9',
        'text/html;q=0.9,*/*',
        'text/html;q=0.9,application/*',
        'text/html;q=0.9,application/json',
        'text/plain'
    ];

    await Promise.all(htmlAcceptHeaders.map(async (htmlAcceptHeader) => {
        const htmlResponse = await requestType(htmlAcceptHeader);
        t.is(htmlResponse.statusCode, 500);
        t.is(htmlResponse.statusMessage, 'Internal Server Error');
        t.is(htmlResponse.headers['content-type'], 'text/html; charset=utf-8');
        t.is(htmlResponse.payload, [
            '<p>Title: Internal Server Error</p>',
            '<p>isAuthenticated: false</p>',
            '<p>Status code: 500</p>',
            '<p>Message: An internal server error occurred</p>'
        ].join('\n') + '\n');
    }));

    await Promise.all(jsonAcceptHeaders.map(async (jsonAcceptHeader) => {
        const jsonResponse = await requestType(jsonAcceptHeader);
        t.is(jsonResponse.statusCode, 500);
        t.is(jsonResponse.statusMessage, 'Internal Server Error');
        t.is(jsonResponse.headers['content-type'], 'application/json; charset=utf-8');
        t.is(jsonResponse.payload, JSON.stringify({
            statusCode : 500,
            error      : 'Internal Server Error',
            message    : 'An internal server error occurred'
        }));
    }));
});

test('ignores non-errors', async (t) => {
    const server = await makeServer();
    server.route(makeRoute({
        handler() {
            return 'must succeed';
        }
    }));
    const response = await server.inject('/');

    t.is(response.statusCode, 200);
    t.is(response.statusMessage, 'OK');
    t.is(response.headers['content-type'], 'text/html; charset=utf-8');
    t.is(response.payload, 'must succeed');
});

test('default boom error messages are transformed', async (t) => {
    const server = await makeServer();
    server.route(makeRoute({
        handler() {
            throw boom.badRequest();
        }
    }));
    server.auth.strategy('session', 'cookie', {
        cookie : { password : 'password-should-be-32-characters' }
    });
    server.auth.default('session');

    const response = await server.inject({
        auth : {
            strategy    : 'session',
            credentials : {}
        },
        url     : '/',
        headers : {
            accept : 'text/html'
        }
    });

    t.is(response.statusCode, 400);
    t.is(response.statusMessage, 'Bad Request');
    t.is(response.headers['content-type'], 'text/html; charset=utf-8');
    t.is(response.payload, [
        '<p>Title: Bad Request</p>',
        '<p>isAuthenticated: true</p>',
        '<p>Status code: 400</p>',
        '<p>Message: Sorry, your request was invalid. Please try another way.</p>'
    ].join('\n') + '\n');
});

test('custom boom error messages are rendered as-is', async (t) => {
    const server = await makeServer();
    server.route(makeRoute({
        handler() {
            throw boom.badRequest('hi');
        }
    }));
    const response = await server.inject({
        url     : '/',
        headers : {
            accept : 'text/html'
        }
    });

    t.is(response.statusCode, 400);
    t.is(response.statusMessage, 'Bad Request');
    t.is(response.headers['content-type'], 'text/html; charset=utf-8');
    t.is(response.payload, [
        '<p>Title: Bad Request</p>',
        '<p>isAuthenticated: false</p>',
        '<p>Status code: 400</p>',
        '<p>Message: hi</p>'
    ].join('\n') + '\n');
});

test('indicates when a request is authenticated', async (t) => {
    const server = await makeServer();
    server.route(makeRoute());
    server.auth.strategy('session', 'cookie', {
        cookie : { password : 'password-should-be-32-characters' }
    });
    server.auth.default('session');

    const response = await server.inject({
        auth : {
            strategy    : 'session',
            credentials : {}
        },
        url     : '/',
        headers : {
            accept : 'text/html'
        }
    });

    t.is(response.statusCode, 500);
    t.is(response.statusMessage, 'Internal Server Error');
    t.is(response.headers['content-type'], 'text/html; charset=utf-8');
    t.is(response.payload, [
        '<p>Title: Internal Server Error</p>',
        '<p>isAuthenticated: true</p>',
        '<p>Status code: 500</p>',
        '<p>Message: An internal server error occurred</p>'
    ].join('\n') + '\n');
});

test('respects boom headers', async (t) => {
    const server = await makeServer();
    server.route(makeRoute({
        handler() {
            throw boom.unauthorized(null, 'my-scheme');
        }
    }));
    const response = await server.inject({
        url     : '/',
        headers : {
            accept : 'text/html'
        }
    });

    t.is(response.statusCode, 401);
    t.is(response.statusMessage, 'Unauthorized');
    t.is(response.headers['content-type'], 'text/html; charset=utf-8');
    t.is(response.headers['www-authenticate'], 'my-scheme');
    t.is(response.payload, [
        '<p>Title: Unauthorized</p>',
        '<p>isAuthenticated: false</p>',
        '<p>Status code: 401</p>',
        '<p>Message: Please log in to view that page.</p>'
    ].join('\n') + '\n');
});
