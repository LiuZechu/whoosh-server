const faker = require("faker");

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// const { Client } = require('pg');

// // Connect to Postgres database
// const client = new Client({
//     connectionString: process.env.DATABASE_URL,
//     ssl: {
//       rejectUnauthorized: false
//     }
// });
  
var appRouter = function (app) {
    
    // // experimenting with pg database
    // app.get("/", function (req, http_response) {

    //     client.connect();
  
    //     client.query('SELECT * FROM students;', (err, res) => {
    //         if (err) throw err;
    //         var response = JSON.stringify(res)
    //         http_response.status(200).send(response);
    //         client.end();
    //     });
    //   });
    // //

    app.get('/db', async (req, res) => {
        try {
            const client = await pool.connect();
            const result = await client.query('SELECT * FROM students');
            const results = { 'results': (result) ? result.rows : null};
            res.send(JSON.stringify(results));
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    })

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