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
        const menu_url = req.body.menu_url;
        const data = {
            restaurant_id: restaurant_id,
            restaurant_name: restaurant_name,
            unit_queue_time: unit_queue_time,
            icon_url: icon_url,
            menu_url: menu_url
        };

        // insert into `restaurants` table
        const insert_query = `INSERT INTO restaurants VALUES (${restaurant_id}, '${restaurant_name}', `
            + `${unit_queue_time}, '${icon_url}', '${menu_url}');`;
        await client.query(insert_query);
        
        // create a new table to store this restaurant's queue groups
        const create_table_query = `CREATE TABLE restaurant${restaurant_id} (`
            + "group_id SERIAL PRIMARY KEY, "
            + "group_name VARCHAR NOT NULL, "
            + "arrival_time TIMESTAMP WITH TIME ZONE NOT NULL, "
            + "entry_time TIMESTAMP WITH TIME ZONE, "
            + "group_size INTEGER NOT NULL, "
            + "monster_type VARCHAR NOT NULL, "
            + "queue_status INTEGER NOT NULL, "
            + "phone_number CHAR(8), "
            + "CONSTRAINT check_phone CHECK (phone_number NOT LIKE '%[^0-9]%') );"
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
// GET
async function list_all_queue_groups(req, res) {
    const restaurant_id = parseInt(req.params.restaurant_id);
    const queue_status = req.query.status;
    try {
        const client = await pool.connect();
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
        var result = await client.query(`SELECT * FROM restaurant${restaurant_id};`);
        const number_of_groups = (result) ? result.rows.length : 0;
        
        const group_id = number_of_groups + 1;
        const group_name = req.body.group_name;
        const group_size = parseInt(req.body.group_size);
        const monster_type = req.body.monster_type;
        const queue_status = parseInt(req.body.queue_status);
        const phone_number = req.body.phone_number;
        const data = {
            group_id: group_id,
            group_name: group_name,
            group_size: group_size,
            monster_type: monster_type,
            queue_status: queue_status,
            phone_number: phone_number
        };

        const insert_query = `INSERT INTO restaurant${restaurant_id} VALUES `
            + `(${group_id}, '${group_name}', NOW(), NULL, ${group_size}, `
            + `'${monster_type}', ${queue_status}, '${phone_number}');`;
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
    const restaurant_id = req.params.restaurant_id;
    const group_id = req.params.group_id;
    
    try {
        const client = await pool.connect();
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

module.exports = appRouter;