const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const querystring = require('querystring');
const request = require('request'); // "Request" library

const redirect_uri = 'http://localhost:8888/callback'
const client_id = 'a36dcf438b5d4eb3b7914116c7362c2f';
const client_secret = '17012057ae4f425b9c6fa10b560cecac';

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = function(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

const stateKey = 'spotify_auth_state';

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send({data: 'OK'})
});

app.get('/login', function(req, res) {

    const state = generateRandomString(16);
    res.cookie(stateKey, state);
    console.log('login')
    // your application requests authorization
    const scope = 'user-read-private user-read-email';
    res.send('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id,
            scope,
            redirect_uri,
            state
        }));
})

app.get('/callback', function(req, res) {
    // your application requests refresh and access tokens
    // after checking the state parameter

    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : state;

    if (state === null) {
        console.log('state === null || state !== storedState')
        console.log('state', state)
        console.log('req.cookies', req.cookies)
        res.redirect('http://localhost:3000#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        console.log('res.clearCookie(stateKey);')
        res.clearCookie(stateKey);
        const authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            console.log('request.post')
            if (!error && response.statusCode === 200) {

                const {access_token, refresh_token}  = body;

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    console.log(body);
                });

                // we can also pass the token to the browser to make requests from there
                res.redirect('http://localhost:3000#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));

            } else {
                res.redirect('http://localhost:3000#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});


app.listen(8888, () => {
    console.log('Listen on port: 8888')
});
