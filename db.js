require('dotenv').config();
const mysql = require('mysql2');

// MySQL Master (for writes)
const masterConnection = mysql.createPool({
    host: process.env.MASTER_DB_HOST,
    user: process.env.MASTER_DB_USER,
    password: process.env.MASTER_DB_PASSWORD,
    database: process.env.MASTER_DB_DATABASE
});

// MySQL Slaves (for reads)
const slaveConnections = [
    mysql.createPool({
        host: process.env.SLAVE1_DB_HOST,
        user: process.env.SLAVE1_DB_USER,
        password: process.env.SLAVE1_DB_PASSWORD,
        database: process.env.SLAVE1_DB_DATABASE
    }),
    mysql.createPool({
        host: process.env.SLAVE2_DB_HOST,
        user: process.env.SLAVE2_DB_USER,
        password: process.env.SLAVE2_DB_PASSWORD,
        database: process.env.SLAVE2_DB_DATABASE
    })
];

// Function to get a slave connection using round-robin
let counter = 0;
function getSlaveConnection() {
    const slaveConnection = slaveConnections[counter];
    counter = (counter + 1) % slaveConnections.length;
    return slaveConnection;
}

// Test connections
masterConnection.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error connecting to MySQL Master:', err.message);
    } else {
        console.log('✅ Successfully connected to MySQL Master');
        connection.release();
    }
});

slaveConnections.forEach((slaveConnection, index) => {
    slaveConnection.getConnection((err, connection) => {
        if (err) {
            console.error(`❌ Error connecting to MySQL Slave ${index + 1}:`, err.message);
        } else {
            console.log(`✅ Successfully connected to MySQL Slave ${index + 1}`);
            connection.release();
        }
    });
});

// Export master and slave connections
module.exports = {
    masterConnection,
    getSlaveConnection
};
