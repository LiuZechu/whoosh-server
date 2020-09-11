const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
  
var appRouter = function (app) {
    
    // RESTAURANTS COLLECTION
    // GET
    app.get('/restaurants', async (req, res) => {
        try {
            const client = await pool.connect();
            const result = await client.query('SELECT * FROM restaurants;');
            //const results = { 'results': (result) ? result.rows : null};
            res.setHeader('content-type', 'application/json');
            res.send(JSON.stringify(result.rows));
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    })

    // POST methods
    app.post("/restaurants", async function (req, res) {
        try {
            const client = await pool.connect();
            var result = await client.query('SELECT * FROM restaurants;');
            const number_of_restaurants = (result) ? result.rows.length : 0;
            
            const restaurant_id = number_of_restaurants + 1;
            const restaurant_name = req.body.restaurant_name;
            const unit_queue_time = parseInt(req.body.unit_queue_time);
            const icon_url = req.body.icon_url;
            const data = {
                restaurant_id: restaurant_id,
                restaurant_name: restaurant_name,
                unit_queue_time: unit_queue_time,
                icon_url: icon_url
            };

            console.log("data is")
            console.log(data);

            const insert_query = `INSERT INTO restaurants VALUES (${restaurant_id}, '${restaurant_name}', ${unit_queue_time}, '${icon_url}');`;
            await client.query(insert_query);
            // create a new table
            const create_table_query = `CREATE TABLE restaurant${restaurant_id} (`
                + "group_id INTEGER PRIMARY KEY, "
                + "group_name VARCHAR NOT NULL, "
                + "arrival_time VARCHAR NOT NULL, "
                + "entry_time VARCHAR, "
                + "group_size INTEGER NOT NULL, "
                + "monster_type VARCHAR NOT NULL, "
                + "queue_status INTEGER NOT NULL, "
                + "email VARCHAR );"
            await client.query(create_table_query);
            
            res.send(data);
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    });





    app.get('/queue/:qid', async (req, res) => {
        var qid = parseInt(req.params.qid);
        
        try {
            const client = await pool.connect();
            const result = await client.query(`SELECT * FROM queue WHERE qid = ${qid};`);
            const results = { 'results': (result) ? result.rows : null};
            res.send(JSON.stringify(results));
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    })



    // PUT methods
    app.put("/queue", async function (req, res) {
        var qid = parseInt(req.body.qid);
        var email = req.body.email;
        var status = parseInt(req.body.status);
        var data = {
            qid: qid,
            email: email,
            status: status
        };

        try {
            const client = await pool.connect();
            const sql_query = `UPDATE queue SET email = '${email}', status = ${status} ` +
                `WHERE qid = ${qid};`;
            const result = await client.query(sql_query);
            res.send(data);
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    });

    // DELETE methods
    app.delete("/queue", async function (req, res) {
        var qid = parseInt(req.body.qid);
        
        try {
            const client = await pool.connect();
            const sql_query = `DELETE FROM queue WHERE qid = ${qid};`;
            const result = await client.query(sql_query);
            res.send(`${qid} is deleted.`);
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    });
}

module.exports = appRouter;