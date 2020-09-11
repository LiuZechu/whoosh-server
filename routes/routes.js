const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// try out
const restaurants_routes = require('restaurant_routes.js');

var appRouter = function (app) {
    
    // RESTAURANTS COLLECTION
    // GET
    app.get("/restaurants", list_all_restaurants);

    // POST
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
                + "arrival_time TIMESTAMP WITH TIME ZONE NOT NULL, "
                + "entry_time TIMESTAMP WITH TIME ZONE, "
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

    // RESTAURANT 
    // GET
    app.get('/restaurants/:restaurant_id', async (req, res) => {
        var restaurant_id = parseInt(req.params.restaurant_id);
        
        try {
            const client = await pool.connect();
            const result = await client.query(`SELECT * FROM restaurants WHERE restaurant_id = ${restaurant_id};`);
            const results = { 'results': (result) ? result.rows : null};
            
            res.setHeader('content-type', 'application/json');
            res.send(JSON.stringify(results));
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    })

    // PUT
    app.put("/restaurants/:restaurant_id", async function (req, res) {
        const restaurant_id = parseInt(req.params.restaurant_id);
        const restaurant_name = req.body.restaurant_name;
        const unit_queue_time = parseInt(req.body.unit_queue_time);
        const icon_url = req.body.icon_url;

        var data = {
            restaurant_id: restaurant_id,
            restaurant_name: restaurant_name,
            unit_queue_time: unit_queue_time,
            icon_url: icon_url
        };

        try {
            const client = await pool.connect();
            const update_query = `UPDATE restaurants SET restaurant_name = '${restaurant_name}', `
                + `unit_queue_time = ${unit_queue_time}, icon_url = '${icon_url}' `
                + `WHERE restaurant_id = ${restaurant_id};`;
            const result = await client.query(update_query);
            res.send(data);
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    });

    // DELETE
    app.delete("/restaurants/:restaurant_id", async function (req, res) {
        const restaurant_id = parseInt(req.params.restaurant_id);

        try {
            const client = await pool.connect();
            const delete_query = `DELETE FROM restaurants WHERE restaurant_id = ${restaurant_id};`;
            await client.query(delete_query);
            const drop_table_query = `DROP TABLE restaurant${restaurant_id};`
            await client.query(drop_table_query);

            res.send(`Restaurant (ID: ${restaurant_id}) is deleted.`);
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    });

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // QUEUE GROUPS COLLECTION
    // GET
    app.get("/restaurants/:restaurant_id/groups", async (req, res) => {
        const restaurant_id = parseInt(req.params.restaurant_id);
        
        try {
            const client = await pool.connect();
            const result = await client.query(`SELECT * FROM restaurant${restaurant_id};`);
            //const results = { 'results': (result) ? result.rows : null};
            res.setHeader('content-type', 'application/json');
            res.send(JSON.stringify(result.rows));
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    })

    // POST
    app.post("/restaurants/:restaurant_id/groups", async function (req, res) {
        const restaurant_id = parseInt(req.params.restaurant_id);

        try {
            const client = await pool.connect();
            var result = await client.query(`SELECT * FROM restaurant${restaurant_id};`);
            const number_of_groups = (result) ? result.rows.length : 0;
            
            const group_id = number_of_groups + 1;
            const group_name = req.body.group_name;
            const group_size = parseInt(req.body.group_size);
            const monster_type = req.body.monster_type;
            const queue_status = parseInt(req.body.queue_status);
            const email = req.body.email;
            const data = {
                group_id: group_id,
                group_name: group_name,
                group_size: group_size,
                monster_type: monster_type,
                queue_status: queue_status,
                email: email
            };

            console.log("queue group data is")
            console.log(data);

            const insert_query = `INSERT INTO restaurant${restaurant_id} VALUES `
                + `(${group_id}, '${group_name}', NOW(), NULL, ${group_size}, `
                + `'${monster_type}', ${queue_status}, '${email}');`;
            await client.query(insert_query);
            
            res.send(data);
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    });

    // QUEUE GROUP
    // GET
    app.get("/restaurants/:restaurant_id/groups/:group_id", async (req, res) => {
        var restaurant_id = parseInt(req.params.restaurant_id);
        var group_id = parseInt(req.params.group_id);
        
        try {
            const client = await pool.connect();
            const result = await client.query(`SELECT * FROM restaurant${restaurant_id} WHERE group_id = ${group_id};`);
            const results = { 'results': (result) ? result.rows : null};
            
            res.setHeader('content-type', 'application/json');
            res.send(JSON.stringify(results));
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    })

    // PUT
    app.put("/restaurants/:restaurant_id/groups/:group_id", async function (req, res) {
        const restaurant_id = parseInt(req.params.restaurant_id);
        const group_id = parseInt(req.params.group_id);
        const group_name = req.body.group_name;
        const arrival_time = req.body.arrival_time;
        const entry_time = req.body.entry_time;
        const group_size = parseInt(req.body.group_size);
        const monster_type = req.body.monster_type;
        const queue_status = parseInt(req.body.queue_status);
        const email = req.body.email;

        var data = {
            group_id: group_id,
            group_name: group_name,
            arrival_time: arrival_time,
            entry_time: entry_time,
            group_size: group_size,
            monster_type: monster_type,
            queue_status: queue_status,
            email: email
        };

        try {
            const client = await pool.connect();
            const update_query = `UPDATE restaurant${restaurant_id} `
                + `SET group_name = '${group_name}', `
                + `arrival_time = '${arrival_time}', entry_time = '${entry_time}', `
                + `group_size = ${group_size}, monster_type = '${monster_type}', `
                + `queue_status = ${queue_status}, email = '${email}'`
                + `WHERE group_id = ${group_id};`;
            const result = await client.query(update_query);
            res.send(data);
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    });

    // DELETE
    app.delete("/restaurants/:restaurant_id/groups/:group_id", async function (req, res) {
        const restaurant_id = parseInt(req.params.restaurant_id);
        const group_id = parseInt(req.params.group_id);

        try {
            const client = await pool.connect();
            const delete_query = `DELETE FROM restaurant${restaurant_id} WHERE group_id = ${group_id};`;
            await client.query(delete_query);

            res.send(`Queue group (ID: ${group_id}) is deleted.`);
            client.release();
        } catch (err) {
            console.error(err);
            res.send("Error " + err);
        }
    });
}

async function list_all_restaurants(req, res) {
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
}

module.exports = appRouter;