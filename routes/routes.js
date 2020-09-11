const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

var appRouter = function (app) {
    // Restaurants Collection
    app.get("/restaurants", list_all_restaurants);
    app.post("/restaurants", create_new_restaurant);

    // Single Restaurant 
    app.get("/restaurants/:restaurant_id", list_one_restaurant);
    app.put("/restaurants/:restaurant_id", update_restaurant);
    app.delete("/restaurants/:restaurant_id", delete_restaurant);

    // Queue Groups Collection
    app.get("/restaurants/:restaurant_id/groups", list_all_queue_groups);
    app.post("/restaurants/:restaurant_id/groups", create_new_queue_group);

    // Single Queue Group
    app.get("/restaurants/:restaurant_id/groups/:group_id", list_one_queue_group);
    app.put("/restaurants/:restaurant_id/groups/:group_id", update_queue_group);
    app.delete("/restaurants/:restaurant_id/groups/:group_id", delete_queue_group);
}

///////////////////////////////////////////////////////////////////////////////////////////////
// Restaurants Collection
// GET
async function list_all_restaurants(req, res) {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM restaurants;');

        res.setHeader('content-type', 'application/json');
        res.send(JSON.stringify(result.rows));
        client.release();
    } catch (err) {
        console.error(err);
        res.status(400).send("Error " + err);
    }
}

// POST
async function create_new_restaurant(req, res) {
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

        // insert into `restaurants` table
        const insert_query = `INSERT INTO restaurants VALUES (${restaurant_id}, '${restaurant_name}', `
            + `${unit_queue_time}, '${icon_url}');`;
        await client.query(insert_query);
        
        // create a new table to store this restaurant's queue groups
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
        
        res.status(201).send(data);
        client.release();
    } catch (err) {
        console.error(err);
        res.status(400).send("Error " + err);
    }
}

// Single Restaurant
// GET
async function list_one_restaurant(req, res) {
    var restaurant_id = parseInt(req.params.restaurant_id);
    try {
        const client = await pool.connect();
        const select_query = `SELECT * FROM restaurants WHERE restaurant_id = ${restaurant_id};`;
        const result = await client.query(select_query);
        const results = (result) ? result.rows : null;
        
        if (results == null || results.length == 0) {
            res.status(404).send("This restaurant ID does not exist.");
        } else {
            res.setHeader('content-type', 'application/json');
            res.send(JSON.stringify(results));
        }
        client.release();
    } catch (err) {
        console.error(err);
        res.status(400).send("Error " + err);
    }
}

// PUT
async function update_restaurant(req, res) {
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

        if (result.rowCount != 0) {
            res.send(data);
        } else {
            res.status(404).send("This restaurant ID does not exist.");
        }
        client.release();
    } catch (err) {
        console.error(err);
        res.status(400).send("Error " + err);
    }
}

// DELETE
async function delete_restaurant(req, res) {
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
        res.status(404).send("This restaurant ID does not exist.");
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////
// Queue Groups Collection
// GET
async function list_all_queue_groups(req, res) {
    const restaurant_id = parseInt(req.params.restaurant_id);
    try {
        const client = await pool.connect();
        const result = await client.query(`SELECT * FROM restaurant${restaurant_id};`);
        
        res.setHeader('content-type', 'application/json');
        res.send(JSON.stringify(result.rows));
        client.release();
    } catch (err) {
        console.error(err);
        res.status(400).send("Error " + err);
    }
}

// POST
async function create_new_queue_group(req, res) {
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

        const insert_query = `INSERT INTO restaurant${restaurant_id} VALUES `
            + `(${group_id}, '${group_name}', NOW(), NULL, ${group_size}, `
            + `'${monster_type}', ${queue_status}, '${email}');`;
        await client.query(insert_query);
        
        res.status(201).send(data);
        client.release();
    } catch (err) {
        console.error(err);
        res.status(400).send("Error " + err);
    }
}

// Single Queue Group
// GET
async function list_one_queue_group (req, res) {
    var restaurant_id = parseInt(req.params.restaurant_id);
    var group_id = parseInt(req.params.group_id);
    try {
        const client = await pool.connect();
        const select_query = `SELECT * FROM restaurant${restaurant_id} WHERE group_id = ${group_id};`;
        const result = await client.query(select_query);
        const results = (result) ? result.rows : null;
        
        if (results == null || results.length == 0) {
            res.status(404).send("This queue group ID does not exist.");
        } else {
            res.setHeader('content-type', 'application/json');
            res.send(JSON.stringify(results));
        }
        client.release();
    } catch (err) {
        console.error(err);
        res.status(400).send("Error " + err);
    }
}

// PUT
async function update_queue_group(req, res) {
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

        if (result.rowCount != 0) {
            res.send(data);
        } else {
            res.status(404).send("This queue group ID does not exist.");
        }
        client.release();
    } catch (err) {
        console.error(err);
        res.status(400).send("Error " + err);
    }
}

// DELETE
async function delete_queue_group(req, res) {
    const restaurant_id = parseInt(req.params.restaurant_id);
    const group_id = parseInt(req.params.group_id);
    try {
        const client = await pool.connect();
        const delete_query = `DELETE FROM restaurant${restaurant_id} WHERE group_id = ${group_id};`;
        const result = await client.query(delete_query);

        console.log("delete result is");
        console.log(result);

        res.send(`Queue group (ID: ${group_id}) is deleted.`);
        client.release();
    } catch (err) {
        console.error(err);
        res.send("Error " + err);
    }
}
///////////////////////////////////////////////////////////////////////////////////////////////

module.exports = appRouter;