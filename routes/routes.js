const faker = require("faker");

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
  
var appRouter = function (app) {
    
    app.get('/queue', async (req, res) => {
        try {
            const client = await pool.connect();
            const result = await client.query('SELECT * FROM queue;');
            const results = { 'results': (result) ? result.rows : null};
            res.send(JSON.stringify(results));
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    })

    app.get('/queue/:qid', async (req, res) => {
        var qid = parseInt(req.params.qid);
        
        try {
            const client = await pool.connect();
            const result = await client.query(`SELECT * FROM queue WHERE qid == ${qid};`);
            const results = { 'results': (result) ? result.rows : null};
            res.send(JSON.stringify(results));
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    })

    // Non Postgres-related APIs (for testing only)
    app.get("/", function (req, res) {
        res.status(200).send({ message: 'Welcome to our restful API' });
    });

    app.get("/user", function (req, res) {
        var data = ({
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        username: faker.internet.userName(),
        email: faker.internet.email()
        });
        res.status(200).send(data);
    });

    app.get("/users/:num", function (req, res) {
    var users = [];
    var num = req.params.num;

    if (isFinite(num) && num  > 0 ) {
        for (i = 0; i <= num-1; i++) {
        users.push({
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            username: faker.internet.userName(),
            email: faker.internet.email()
            });
        }

        res.status(200).send(users);
        
    } else {
        res.status(400).send({ message: 'invalid number supplied' });
    }

    });
}

module.exports = appRouter;