const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require('pg');
const pool = new Pool({
  user: 'labber',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

pool.query(`SELECT title FROM properties LIMIT 10;`)
.then(response => {console.log(response)})

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = (email) => {
  const lowerEmail = email.toLowerCase()
  return pool
    .query(`SELECT * FROM users WHERE users.email = $1;`, [lowerEmail])
    .then((result) => {
       console.log(result.rows[0]);
       return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = (id) => {
  return pool
  .query(`SELECT * FROM users WHERE users.id = $1;`, [id])
  .then((result) => {
     //console.log(result.rows);
     return result.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
    return null;
  });
  //  return Promise.resolve(users[id]);
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = (user) => {
  const values = [user.name, user.email, user.password]
  //console.log('values', values)
  return pool
  .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;`, values) 
  .then((result) => {
     //console.log('result:', result.rows);
     return result.rows[0]
  })
  .catch((err) => {
    console.log('add user error;', err.message);
    return null;
  });

};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = (guest_id, limit = 10) => {
  return pool
  .query(`SELECT reservations.*, properties.*
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`, [guest_id, limit]) 
  .then((result) => {
     console.log('result:', result);
     return result.rows
  })
  .catch((err) => {
    console.log('add user error;', err.message);
    return null;
  });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;
  console.log('options', options)
  // 3
  if(options.city || options.owner_id || options.minimum_price_per_night && options.maximum_price_per_night){
    queryString += 'WHERE'
  }

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += ` city LIKE $${queryParams.length} `; // $1 value of 1
  }

  if (options.owner_id) {
    if(options.city) {
      queryString +=  `AND`
    }
    queryParams.push(`${options.owner_id}`);
    queryString +=  ` owner_id = $${queryParams.length} `;
  }
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    if(options.city || options.owner_id){
      queryString +=  `AND`
    }
    let minPrice = options.minimum_price_per_night * 100
    let maxPrice = options.maximum_price_per_night * 100

    queryParams.push(`${minPrice}`);
    queryParams.push(`${maxPrice}`);

    queryString += ` (properties.cost_per_night > $${queryParams.length-1} AND properties.cost_per_night < $${queryParams.length})`;
  }

  // 4
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // 5
  console.log(queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams)
  .then((res) => res.rows)

  
    .catch((err) => {
    console.log('add user error;', err.message);
    return null;
  });

};


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
