const jwt = require('jsonwebtoken');

const accessTokenSecret = 'whooshservice'; // TODO: choose a complex random string

var users = [
    {
        username: 'whoosh',
        password: 'whoosh',
        role: 'admin'
    }
];

function appRouter(app) {
    app.post('/login', (req, res) => {
        // Read username and password from request body
        const { username, password } = req.body;
    
        // Filter user from the users array by username and password
        const user = users.find(u => { return u.username === username && u.password === password });
    
        if (user) {
            // Generate an access token
            const accessToken = jwt.sign({ username: user.username,  role: user.role }, accessTokenSecret);
    
            res.json({
                accessToken
            });
        } else {
            res.send('Username or password incorrect');
        }
    });
}

function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, accessTokenSecret, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }

            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};


module.exports.authServer = appRouter;
module.exports.authenticateJWT = authenticateJWT;
