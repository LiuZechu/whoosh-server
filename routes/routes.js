const faker = require("faker");
const { Client } = require('pg');

// Connect to Postgres database
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
var appRouter = function (app) {
    // experimenting with pg database

    app.get("/", function (req, res) {

        client.connect();
  
        client.query('CREATE TABLE students (sid INTEGER PRIMARY KEY); INSERT INTO students VALUES (123); SELECT * FROM students;', (err, res) => {
            if (err) throw err;
            var response = ""
            for (let row of res.rows) {
                response += JSON.stringify(row) + "\n";
            }
            res.status(200).send(response);
            client.end();
        });
      });

    //

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