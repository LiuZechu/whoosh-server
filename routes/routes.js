const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
const auth = require("../auth.js").authenticateJWT;

var appRouter = function (app) {
    // Restaurants Collection
    app.get("/restaurants", auth, list_all_restaurants);
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
    const uid = req.query.uid;

    try {
        const client = await pool.connect();
        var result;
        if (uid == null) {
            result = await client.query('SELECT * FROM restaurants;');
        } else {
            result = await client.query(`SELECT * FROM restaurants WHERE uid = '${uid}';`);
        }
        
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
        const restaurant_name = req.body.restaurant_name;
        const unit_queue_time = req.body.unit_queue_time;
        const icon_url = req.body.icon_url;
        const menu_url = req.body.menu_url;
        const uid = req.body.uid;

        // insert into `restaurants` table
        const insert_query = `INSERT INTO restaurants VALUES (DEFAULT, '${restaurant_name}', `
            + `${unit_queue_time}, '${icon_url}', '${menu_url}', '${uid}') RETURNING restaurant_id;`;
        const result = await client.query(insert_query);
        const restaurant_id = result.rows[0].restaurant_id;

        // create a new table to store this restaurant's queue groups
        const create_table_query = `CREATE TABLE restaurant${restaurant_id} (`
            + "group_id SERIAL PRIMARY KEY, "
            + "group_key CHAR(8) NOT NULL, "
            + "group_name VARCHAR NOT NULL, "
            + "arrival_time TIMESTAMP WITH TIME ZONE NOT NULL, "
            + "entry_time TIMESTAMP WITH TIME ZONE, "
            + "group_size INTEGER NOT NULL, "
            + "monster_type VARCHAR NOT NULL, "
            + "queue_status INTEGER NOT NULL, "
            + "phone_number CHAR(8) ); "
            //+ "CONSTRAINT check_phone CHECK (phone_number NOT LIKE '%[^0-9]%') );"
        await client.query(create_table_query);
        
        const data = await client.query(`SELECT * from restaurants WHERE restaurant_id = ${restaurant_id}`);
        
        res.setHeader('content-type', 'application/json');
        res.status(201).send(JSON.stringify(data.rows[0]));
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
    const restaurant_id = req.params.restaurant_id;
    const restaurant_name = req.body.restaurant_name;
    const unit_queue_time = req.body.unit_queue_time;
    const icon_url = req.body.icon_url;
    const menu_url = req.body.menu_url;
    var is_req_body_empty = true;

    try {
        const client = await pool.connect();
        if (typeof restaurant_name != 'undefined') {
            const update_query = `UPDATE restaurants SET restaurant_name = '${restaurant_name}' `
            + `WHERE restaurant_id = ${restaurant_id};`;
            await client.query(update_query);
            is_req_body_empty = false
        }
        if (typeof unit_queue_time != 'undefined') {
            const update_query = `UPDATE restaurants SET unit_queue_time = ${unit_queue_time} `
            + `WHERE restaurant_id = ${restaurant_id};`;
            await client.query(update_query);
            is_req_body_empty = false
        }
        if (typeof icon_url != 'undefined') {
            const update_query = `UPDATE restaurants SET icon_url = '${icon_url}' `
            + `WHERE restaurant_id = ${restaurant_id};`;
            await client.query(update_query);
            is_req_body_empty = false
        }
        if (typeof menu_url != 'undefined') {
            const update_query = `UPDATE restaurants SET menu_url = '${menu_url}' `
            + `WHERE restaurant_id = ${restaurant_id};`;
            await client.query(update_query);
            is_req_body_empty = false
        }

        const result = await client.query(`SELECT * FROM restaurants WHERE restaurant_id = ${restaurant_id};`);
        if (result.rowCount != 0 && !is_req_body_empty) {
            res.setHeader('content-type', 'application/json');
            res.send(JSON.stringify(result.rows[0]));
        } else if (result.rowCount == 0) {
            res.status(404).send("This restaurant ID does not exist.");
        } else {
            res.status(400).send("Request body cannot be empty.");
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

// Checks whether the restuarant table exists. This 
// prevents database locking.
async function check_restaurant_existence(client, res, restaurant_id) {
    var check_query = `SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurant${restaurant_id}';`;
    var result = await client.query(check_query);
    var exists = result.rowCount == 1;
    if (!exists) {
        res.status(404).send(`Restaurant ID ${restaurant_id} does not exist`);
        return false;
    } else {
        return true;
    }
}

// GET
async function list_all_queue_groups(req, res) {
    const restaurant_id = parseInt(req.params.restaurant_id);
    const queue_status = req.query.status;
    try {
        const client = await pool.connect();
        var exists = await check_restaurant_existence(client, res, restaurant_id);
        if (!exists) {
            return;
        }

        var result;
        if (typeof queue_status === 'undefined') {
            result = await client.query(`SELECT * FROM restaurant${restaurant_id};`);
        } else {
            result = await client.query(`SELECT * FROM restaurant${restaurant_id} WHERE queue_status = ${queue_status}`);
        }
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

        var exists = await check_restaurant_existence(client, res, restaurant_id);
        if (!exists) {
            return;
        }

        const group_name = req.body.group_name;
        const group_size = req.body.group_size;
        const monster_type = req.body.monster_type;
        const queue_status = req.body.queue_status;
        const phone_number = req.body.phone_number;

        // generate random string of 8 characters
        const group_key = generate_random_string(8);

        const insert_query = `INSERT INTO restaurant${restaurant_id} VALUES `
            + `(DEFAULT, '${group_key}', '${group_name}', NOW(), NULL, ${group_size}, `
            + `'${monster_type}', ${queue_status}, '${phone_number}') RETURNING group_id;`;
        const result = await client.query(insert_query);
        const group_id = result.rows[0].group_id;
        const data = await client.query(`SELECT * from restaurant${restaurant_id} WHERE group_id = ${group_id}`);
        
        res.setHeader('content-type', 'application/json');
        res.status(201).send(JSON.stringify(data.rows[0]));
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

        var exists = await check_restaurant_existence(client, res, restaurant_id);
        if (!exists) {
            return;
        }

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
    const restaurant_id = req.params.restaurant_id;
    const group_id = req.params.group_id;
    
    try {
        const client = await pool.connect();

        var exists = await check_restaurant_existence(client, res, restaurant_id);
        if (!exists) {
            return;
        }

        var is_req_body_empty = true;
        for (const [key, value] of Object.entries(req.body)) {
            const update_query = `UPDATE restaurant${restaurant_id} `
            + `SET ${key} = '${value}' WHERE group_id = ${group_id};`;
            await client.query(update_query);
            is_req_body_empty = false
        }

        const result = await client.query(`SELECT * FROM restaurant${restaurant_id} WHERE group_id = ${group_id};`);
        if (result.rowCount != 0 && !is_req_body_empty) {
            res.setHeader('content-type', 'application/json');
            res.send(JSON.stringify(result.rows[0]));
        } else if (result.rowCount == 0) {
            res.status(404).send("This queue group ID does not exist.");
        } else {
            res.status(400).send("Request body cannot be empty.");
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

        var exists = await check_restaurant_existence(client, res, restaurant_id);
        if (!exists) {
            return;
        }

        const delete_query = `DELETE FROM restaurant${restaurant_id} WHERE group_id = ${group_id};`;
        const result = await client.query(delete_query);

        if (result.rowCount != 0) {
            res.send(`Queue group (ID: ${group_id}) is deleted.`);
        } else {
            res.status(404).send("This queue group ID does not exist.");
        }
        client.release();
    } catch (err) {
        console.error(err);
        res.status(400).send("Error " + err);
    }
}
///////////////////////////////////////////////////////////////////////////////////////////////

function generate_random_string(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }


module.exports = appRouter;