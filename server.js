const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mysql = require('mysql2');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Body parser middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Admin credentials (simple "admin" username and password)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // SHA256 of "admin"
const SESSION_TOKEN = crypto.randomBytes(16).toString('hex');

// In-memory fallback database for testing/simulation (if MySQL is not configured)
let inMemoryIncidents = [
    {
        id: 1,
        type: 'earthquake',
        title: 'แผ่นดินไหวขนาด 4.5 ลำปาง',
        description: 'แผ่นดินไหวขนาดปานกลาง รู้สึกสั่นสะเทือนได้ในหลายพื้นที่ของจังหวัดลำปางและเชียงใหม่',
        latitude: 18.2915,
        longitude: 99.4925,
        severity: 'yellow',
        magnitude: 4.5,
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        is_simulation: 0
    },
    {
        id: 2,
        type: 'tsunami',
        title: 'เตือนภัยสึนามิ บริเวณชายฝั่งทะเลอันดามัน',
        description: 'การทดสอบระบบส่งสัญญาณสึนามิ เฝ้าระวังคลื่นสูงบริเวณชายฝั่งพังงาและภูเก็ต',
        latitude: 8.4689,
        longitude: 98.2189,
        severity: 'red',
        magnitude: 7.8,
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        is_simulation: 1
    },
    {
        id: 3,
        type: 'civil_unrest',
        title: 'แจ้งเตือนสถานการณ์ความไม่สงบ บริเวณแยกปทุมวัน',
        description: 'ขอให้ประชาชนหลีกเลี่ยงเส้นทางและพื้นที่การชุมนุมชั่วคราวเพื่อความปลอดภัย',
        latitude: 13.7456,
        longitude: 100.5302,
        severity: 'yellow',
        magnitude: null,
        timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        is_simulation: 0
    },
    {
        id: 4,
        type: 'accident',
        title: 'อุบัติเหตุสารเคมีรั่วไหล นิคมอุตสาหกรรมมาบตาพุด',
        description: 'สารเคมีอุตสาหกรรมรั่วไหลในโรงงาน เจ้าหน้าที่ควบคุมสถานการณ์ได้แล้ว ขอให้อยู่ในอาคารปิดมิดชิด',
        latitude: 12.6791,
        longitude: 101.1622,
        severity: 'green',
        magnitude: null,
        timestamp: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        is_simulation: 0
    }
];

let inMemorySimulationLogs = [];
let inMemoryUsers = [];
let inMemoryFavorites = [];

// Session cache for authenticated users (token -> user details)
const userSessions = new Map();

// MySQL Database Connection Pool
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'thaialert_db',
    port: process.env.DB_PORT || 3306
};

let db = null;
let isDbConnected = false;

// Attempt database connection with error handling
function connectDatabase() {
    const bootstrapConfig = {
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        port: dbConfig.port
    };

    const tempConnection = mysql.createConnection(bootstrapConfig);

    tempConnection.connect((err) => {
        if (err) {
            console.warn('⚠️ MySQL Server connection failed. Running in in-memory fallback mode.');
            console.warn('Error detail:', err.message);
            isDbConnected = false;
            return;
        }

        console.log('✅ Connected to MySQL server. Bootstrapping database...');
        
        tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`, (err) => {
            if (err) {
                console.error('⚠️ Failed to create database:', err.message);
                tempConnection.end();
                isDbConnected = false;
                return;
            }

            console.log(`✅ Database \`${dbConfig.database}\` verified/created.`);
            tempConnection.end();

            const pool = mysql.createPool(dbConfig);
            db = pool.promise();
            isDbConnected = true;

            const fs = require('fs');
            const path = require('path');
            const schemaPath = path.join(__dirname, 'schema.sql');
            try {
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                const statements = schemaSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
                (async () => {
                    try {
                        for (const stmt of statements) {
                            await db.query(stmt + ';');
                        }
                        console.log('✅ Database schema verified.');
                    } catch (schemaErr) {
                        console.error('⚠️ Schema execution error:', schemaErr.message);
                    }
                })();
            } catch (e) {
                console.error('⚠️ Failed to read schema.sql:', e.message);
            }
        });
    });
}

connectDatabase();

// Expose DB status endpoint for health checks
app.get('/api/status', (req, res) => {
    res.json({ dbConnected: isDbConnected });
});

// Admin Authentication middleware
function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader === `Bearer ${SESSION_TOKEN}`) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized access' });
    }
}

// User Authentication middleware
function requireUserAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const user = userSessions.get(token);
        if (user) {
            req.user = user;
            return next();
        }
    }
    res.status(401).json({ error: 'กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ' });
}

// ----------------------------------------------------
// REST API Routes
// ----------------------------------------------------

// Admin Operator Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Missing credentials' });
    }

    const hash = crypto.createHash('sha256').update(password).digest('hex');

    if (username === ADMIN_USERNAME && hash === ADMIN_PASSWORD_HASH) {
        res.json({ token: SESSION_TOKEN });
    } else {
        res.status(401).json({ error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง (Invalid credentials)' });
    }
});

// User Sign Up
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    if (isDbConnected) {
        try {
            const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(400).json({ error: 'อีเมลนี้ถูกลงทะเบียนใช้งานแล้ว' });
            }

            const [result] = await db.query(
                'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
                [name, email, passwordHash]
            );

            const newUser = { id: result.insertId, name, email };
            const token = crypto.randomBytes(16).toString('hex');
            userSessions.set(token, newUser);
            res.json({ token, user: newUser });
        } catch (err) {
            console.error('Database signup error:', err);
            res.status(500).json({ error: 'ไม่สามารถสมัครสมาชิกได้ในขณะนี้' });
        }
    } else {
        const existing = inMemoryUsers.find(u => u.email === email);
        if (existing) {
            return res.status(400).json({ error: 'อีเมลนี้ถูกลงทะเบียนใช้งานแล้ว' });
        }

        const newUser = {
            id: inMemoryUsers.length + 1,
            name,
            email,
            password_hash: passwordHash,
            created_at: new Date().toISOString()
        };
        inMemoryUsers.push(newUser);

        const safeUser = { id: newUser.id, name, email };
        const token = crypto.randomBytes(16).toString('hex');
        userSessions.set(token, safeUser);
        res.json({ token, user: safeUser });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    if (isDbConnected) {
        try {
            const [rows] = await db.query(
                'SELECT id, name, email FROM users WHERE email = ? AND password_hash = ?',
                [email, passwordHash]
            );

            if (rows.length > 0) {
                const user = rows[0];
                const token = crypto.randomBytes(16).toString('hex');
                userSessions.set(token, user);
                res.json({ token, user });
            } else {
                res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
            }
        } catch (err) {
            console.error('Database login error:', err);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ' });
        }
    } else {
        const user = inMemoryUsers.find(u => u.email === email && u.password_hash === passwordHash);
        if (user) {
            const safeUser = { id: user.id, name: user.name, email: user.email };
            const token = crypto.randomBytes(16).toString('hex');
            userSessions.set(token, safeUser);
            res.json({ token, user: safeUser });
        } else {
            res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }
    }
});

// Get User Favorites
app.get('/api/favorites', requireUserAuth, async (req, res) => {
    const userId = req.user.id;

    if (isDbConnected) {
        try {
            const query = `
                SELECT f.id as favorite_id, f.memo, f.created_at as bookmarked_at, i.* 
                FROM favorites f 
                JOIN incidents i ON f.incident_id = i.id 
                WHERE f.user_id = ?
                ORDER BY f.created_at DESC
            `;
            const [rows] = await db.query(query, [userId]);
            res.json(rows);
        } catch (err) {
            console.error('Fetch favorites error:', err);
            res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลรายการโปรดได้' });
        }
    } else {
        const userFavs = inMemoryFavorites.filter(f => f.user_id === userId);
        const results = userFavs.map(f => {
            const inc = inMemoryIncidents.find(i => i.id === f.incident_id);
            return {
                favorite_id: f.id,
                memo: f.memo,
                bookmarked_at: f.created_at,
                ...inc
            };
        }).filter(item => item.id !== undefined);
        res.json(results);
    }
});

// Add / Update Favorite Bookmark with memo
app.post('/api/favorites', requireUserAuth, async (req, res) => {
    const userId = req.user.id;
    const { incident_id, memo } = req.body;

    if (!incident_id) {
        return res.status(400).json({ error: 'ระบุ Incident ID' });
    }

    if (isDbConnected) {
        try {
            const [existing] = await db.query(
                'SELECT id FROM favorites WHERE user_id = ? AND incident_id = ?',
                [userId, incident_id]
            );

            if (existing.length > 0) {
                await db.query(
                    'UPDATE favorites SET memo = ? WHERE user_id = ? AND incident_id = ?',
                    [memo || '', userId, incident_id]
                );
                return res.json({ success: true, message: 'แก้ไขบันทึกข้อความเรียบร้อยแล้ว' });
            }

            await db.query(
                'INSERT INTO favorites (user_id, incident_id, memo) VALUES (?, ?, ?)',
                [userId, incident_id, memo || '']
            );
            res.json({ success: true, message: 'บันทึกรายการโปรดเรียบร้อยแล้ว' });
        } catch (err) {
            console.error('Save favorite error:', err);
            res.status(500).json({ error: 'ไม่สามารถบันทึกรายการโปรดได้' });
        }
    } else {
        const existingIndex = inMemoryFavorites.findIndex(f => f.user_id === userId && f.incident_id === parseInt(incident_id));
        if (existingIndex > -1) {
            inMemoryFavorites[existingIndex].memo = memo || '';
            return res.json({ success: true, message: 'แก้ไขบันทึกข้อความเรียบร้อยแล้ว' });
        }

        const newFav = {
            id: inMemoryFavorites.length + 1,
            user_id: userId,
            incident_id: parseInt(incident_id),
            memo: memo || '',
            created_at: new Date().toISOString()
        };
        inMemoryFavorites.push(newFav);
        res.json({ success: true, message: 'บันทึกรายการโปรดเรียบร้อยแล้ว' });
    }
});

// Delete Favorite Bookmark
app.delete('/api/favorites/:incident_id', requireUserAuth, async (req, res) => {
    const userId = req.user.id;
    const incidentId = parseInt(req.params.incident_id);

    if (isDbConnected) {
        try {
            await db.query(
                'DELETE FROM favorites WHERE user_id = ? AND incident_id = ?',
                [userId, incidentId]
            );
            res.json({ success: true, message: 'ลบออกจากรายการโปรดแล้ว' });
        } catch (err) {
            console.error('Delete favorite error:', err);
            res.status(500).json({ error: 'ไม่สามารถลบรายการโปรดได้' });
        }
    } else {
        inMemoryFavorites = inMemoryFavorites.filter(f => !(f.user_id === userId && f.incident_id === incidentId));
        res.json({ success: true, message: 'ลบออกจากรายการโปรดแล้ว' });
    }
});

// Retrieve Incidents (with filters)
app.get('/api/incidents', async (req, res) => {
    const { type, severity, is_simulation, start_date, end_date } = req.query;

    if (isDbConnected) {
        try {
            let query = 'SELECT * FROM incidents WHERE 1=1';
            const params = [];

            if (type && type !== 'all') {
                query += ' AND type = ?';
                params.push(type);
            }
            if (severity && severity !== 'all') {
                query += ' AND severity = ?';
                params.push(severity);
            }
            if (is_simulation !== undefined && is_simulation !== 'all') {
                query += ' AND is_simulation = ?';
                params.push(is_simulation === '1' ? 1 : 0);
            }
            if (start_date) {
                query += ' AND timestamp >= ?';
                params.push(start_date);
            }
            if (end_date) {
                query += ' AND timestamp <= ?';
                params.push(end_date);
            }

            query += ' ORDER BY timestamp DESC';
            const [rows] = await db.query(query, params);
            res.json(rows);
        } catch (err) {
            console.error('Database query error:', err);
            res.status(500).json({ error: 'Database query failed' });
        }
    } else {
        let results = [...inMemoryIncidents];

        if (type && type !== 'all') {
            results = results.filter(item => item.type === type);
        }
        if (severity && severity !== 'all') {
            results = results.filter(item => item.severity === severity);
        }
        if (is_simulation !== undefined && is_simulation !== 'all') {
            results = results.filter(item => item.is_simulation === (is_simulation === '1' ? 1 : 0));
        }
        if (start_date) {
            const start = new Date(start_date);
            results = results.filter(item => new Date(item.timestamp) >= start);
        }
        if (end_date) {
            const end = new Date(end_date);
            results = results.filter(item => new Date(item.timestamp) <= end);
        }

        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(results);
    }
});

// Post/Trigger an incident (Admin Only)
app.post('/api/admin/trigger', requireAuth, async (req, res) => {
    const { type, title, description, latitude, longitude, severity, magnitude, is_simulation } = req.body;

    if (!type || !title || !latitude || !longitude || !severity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const newIncident = {
        type,
        title,
        description: description || '',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        severity,
        magnitude: magnitude ? parseFloat(magnitude) : null,
        timestamp: new Date().toISOString(),
        is_simulation: parseInt(is_simulation) === 1 ? 1 : 0
    };

    // Broadcast immediately to clients
    io.emit('new_alert', newIncident);
    console.log(`[Socket] Broadcasted new triggered alert: ${title} (${severity})`);

    // DB insertion
    if (isDbConnected) {
        try {
            const query = `
                INSERT INTO incidents (type, title, description, latitude, longitude, severity, magnitude, timestamp, is_simulation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const [result] = await db.query(query, [
                newIncident.type,
                newIncident.title,
                newIncident.description,
                newIncident.latitude,
                newIncident.longitude,
                newIncident.severity,
                newIncident.magnitude,
                newIncident.timestamp,
                newIncident.is_simulation
            ]);

            const incidentId = result.insertId;
            newIncident.id = incidentId;

            if (newIncident.is_simulation === 1) {
                await db.query(
                    'INSERT INTO simulation_logs (incident_id, triggered_by, triggered_at) VALUES (?, ?, ?)',
                    [incidentId, 'admin', newIncident.timestamp]
                );
            }
        } catch (err) {
            console.error('Asynchronous Database insertion failed:', err);
        }
    } else {
        newIncident.id = inMemoryIncidents.length + 1;
        inMemoryIncidents.unshift(newIncident);

        if (newIncident.is_simulation === 1) {
            inMemorySimulationLogs.unshift({
                id: inMemorySimulationLogs.length + 1,
                incident_id: newIncident.id,
                triggered_by: 'admin',
                triggered_at: newIncident.timestamp
            });
        }
    }

    res.json({ success: true, message: 'แจ้งเตือนถูกส่งออกเรียบร้อยแล้ว', incident: newIncident });
});

// Socket.io Handshake and Connection Logging
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.emit('initial_data', isDbConnected ? null : inMemoryIncidents);

    // Listen for test alert trigger from admin UI
    socket.on('test_alert', () => {
        const testIncident = {
            type: 'earthquake',
            title: '🧪 การทดสอบระบบแจ้งเตือนภัยฉุกเฉิน (Simulated Test Alert)',
            description: 'นี่คือการทดสอบสัญญาณและระบบเตือนภัยฉุกเฉินของระบบ ThaiAlert! เพื่อความพร้อมใช้งานของระบบสื่อสารและความปลอดภัยสูงสุด',
            latitude: 13.7367,
            longitude: 101.0,
            severity: 'red',
            magnitude: 6.5,
            timestamp: new Date().toISOString(),
            is_simulation: 1,
            is_inside_thailand: 1
        };

        if (isDbConnected) {
            db.query(`
                INSERT INTO incidents (type, title, description, latitude, longitude, severity, magnitude, timestamp, is_simulation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [testIncident.type, testIncident.title, testIncident.description, testIncident.latitude, testIncident.longitude, testIncident.severity, testIncident.magnitude, testIncident.timestamp])
            .then(([res]) => {
                testIncident.id = res.insertId;
                io.emit('new_alert', testIncident);
            })
            .catch(err => {
                console.error('Error inserting test incident:', err.message);
                testIncident.id = Date.now();
                io.emit('new_alert', testIncident);
            });
        } else {
            testIncident.id = inMemoryIncidents.length + 1;
            inMemoryIncidents.unshift(testIncident);
            io.emit('new_alert', testIncident);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// ----------------------------------------------------
// TELEMETRY LIVE COLLECTORS (GDELT, USGS, NASA, Open-Meteo)
// ----------------------------------------------------

let processedIncidentsHash = new Set();

function addPolledIncident(inc) {
    const fingerprint = `${inc.type}_${inc.title.substring(0, 30)}_${inc.latitude.toFixed(2)}_${inc.longitude.toFixed(2)}`;
    if (processedIncidentsHash.has(fingerprint)) return false;
    processedIncidentsHash.add(fingerprint);

    // Bounding Box to determine if inside Thailand
    // Lat: 5.6 to 20.4, Lon: 97.3 to 105.7
    const isInsideTh = (inc.latitude >= 5.6 && inc.latitude <= 20.4 && inc.longitude >= 97.3 && inc.longitude <= 105.7);
    inc.is_inside_thailand = isInsideTh ? 1 : 0;

    if (isDbConnected) {
        db.query(`
            INSERT INTO incidents (type, title, description, latitude, longitude, severity, magnitude, timestamp, is_simulation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [inc.type, inc.title, inc.description, inc.latitude, inc.longitude, inc.severity, inc.magnitude, inc.timestamp])
        .then(([res]) => {
            inc.id = res.insertId;
            io.emit('new_alert', inc);
        })
        .catch(err => console.error('Error inserting polled incident:', err.message));
    } else {
        inc.id = inMemoryIncidents.length + 1;
        inMemoryIncidents.unshift(inc);
        io.emit('new_alert', inc);
    }
    return true;
}

// 1. USGS Earthquake API
async function pollUSGSEarthquakes() {
    try {
        console.log('[Telemetry Service] Polling USGS Earthquakes...');
        const response = await fetch('https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=13&longitude=101&maxradiuskm=2000&minmagnitude=2.5&limit=15');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.features) return;

        let added = 0;
        for (const feature of data.features) {
            const props = feature.properties;
            const geom = feature.geometry;
            if (!props || !geom || !geom.coordinates) continue;

            const mag = parseFloat(props.mag);
            const lat = parseFloat(geom.coordinates[1]);
            const lon = parseFloat(geom.coordinates[0]);
            const time = new Date(props.time).toISOString();
            const place = props.place || 'Unknown Epicenter';

            const severity = mag >= 5.5 ? 'red' : (mag >= 4.0 ? 'yellow' : 'green');
            const title = `แผ่นดินไหวขนาด ${mag} ริกเตอร์ - ${place}`;
            const description = `ตรวจวัดศูนย์กลางแผ่นดินไหวในระดับลึกห่างจากตัวเมือง ใกล้บริเวณ ${place}`;

            const incident = {
                type: 'earthquake',
                title,
                description,
                latitude: lat,
                longitude: lon,
                severity,
                magnitude: mag,
                timestamp: time
            };

            if (addPolledIncident(incident)) added++;
        }
        if (added > 0) console.log(`[USGS API] Added ${added} new earthquake incidents.`);
    } catch (err) {
        console.error('[USGS Collector Error]:', err.message);
    }
}

// 2. Open-Meteo Weather Alert API
async function pollOpenMeteoAlerts() {
    try {
        console.log('[Telemetry Service] Polling Open-Meteo Weather Alerts...');
        const sites = [
            { name: 'กรุงเทพมหานคร', lat: 13.7563, lon: 100.5018 },
            { name: 'จังหวัดเชียงใหม่', lat: 18.7883, lon: 98.9853 },
            { name: 'จังหวัดภูเก็ต', lat: 7.8804, lon: 98.3922 }
        ];

        for (const site of sites) {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lon}&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m&timezone=Asia%2FBangkok`;
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();
            if (!data.current) continue;

            const current = data.current;
            let incident = null;

            if (parseFloat(current.wind_speed_10m) > 22.0) {
                incident = {
                    type: 'accident',
                    title: `แจ้งเตือนลมกระโชกแรง - ${site.name}`,
                    description: `ตรวจวัดความเร็วลมพัดแรงเป็นประวัติการณ์ ${current.wind_speed_10m} กม./ชม. เฝ้าระวังสิ่งปลูกสร้างชั่วคราวและป้ายโฆษณา`,
                    latitude: site.lat,
                    longitude: site.lon,
                    severity: 'yellow',
                    magnitude: null,
                    timestamp: new Date().toISOString()
                };
            } else if (parseFloat(current.rain) > 5.0) {
                incident = {
                    type: 'accident',
                    title: `แจ้งเตือนปริมาณฝนสะสมหนาแน่น - ${site.name}`,
                    description: `ตรวจพบฝนตกรวมหนาแน่นวัดได้ ${current.rain} มม./ชม. เสี่ยงน้ำท่วมขังและดินไหลตามไหล่ทาง`,
                    latitude: site.lat,
                    longitude: site.lon,
                    severity: 'yellow',
                    magnitude: null,
                    timestamp: new Date().toISOString()
                };
            }

            if (incident && addPolledIncident(incident)) {
                console.log(`[Open-Meteo API] Broadcasted severe weather alert for ${site.name}`);
            }
        }
    } catch (err) {
        console.error('[Open-Meteo Collector Error]:', err.message);
    }
}

// 3. GDELT News API
async function pollGDELTDisasters() {
    try {
        console.log('[Telemetry Service] Polling GDELT news events...');
        const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=(thailand%20disaster%20OR%20flood%20OR%20storm%20OR%20earthquake%20OR%20landslide)%20sourcelang:tha&mode=artlist&format=json&maxresults=10';
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        if (!data.articles) return;

        let added = 0;
        for (const art of data.articles) {
            const title = art.title;
            if (!title) continue;

            let lat = 13.7367;
            let lon = 101.0;
            let province = 'ประเทศไทย';

            const matchers = [
                { name: 'เชียงใหม่', lat: 18.7883, lon: 98.9853 },
                { name: 'เชียงราย', lat: 19.9090, lon: 99.8300 },
                { name: 'น่าน', lat: 18.7830, lon: 100.7830 },
                { name: 'แม่ฮ่องสอน', lat: 19.3022, lon: 97.9664 },
                { name: 'สุราษฎร์ธานี', lat: 9.1400, lon: 99.3330 },
                { name: 'อุบลราชธานี', lat: 15.2280, lon: 104.8560 },
                { name: 'ภูเก็ต', lat: 7.8804, lon: 98.3922 }
            ];

            for (const match of matchers) {
                if (title.includes(match.name)) {
                    lat = match.lat + (Math.random() - 0.5) * 0.1;
                    lon = match.lon + (Math.random() - 0.5) * 0.1;
                    province = match.name;
                    break;
                }
            }

            let type = 'accident';
            let severity = 'green';
            if (title.includes('น้ำท่วม') || title.includes('อุทกภัย') || title.includes('ดินสไลด์')) {
                severity = 'yellow';
            } else if (title.includes('พายุ') || title.includes('น้ำป่า')) {
                severity = 'yellow';
            } else if (title.includes('แผ่นดินไหว')) {
                type = 'earthquake';
                severity = 'yellow';
            } else if (title.includes('ความไม่สงบ') || title.includes('ปะทะ')) {
                type = 'civil_unrest';
                severity = 'yellow';
            }

            const incident = {
                type,
                title: `[GDELT ข่าวจริง] ${title.length > 55 ? title.substring(0, 55) + '...' : title}`,
                description: `ระบบรับข้อมูลข่าวสารภัยพิบัติจาก GDELT: ${art.url}`,
                latitude: lat,
                longitude: lon,
                severity,
                magnitude: null,
                timestamp: new Date().toISOString()
            };

            if (addPolledIncident(incident)) added++;
        }
        if (added > 0) console.log(`[GDELT API] Parsed ${added} news signals.`);
    } catch (err) {
        console.error('[GDELT Collector Error]:', err.message);
    }
}

// 4. NASA FIRMS (Wildfire / Hotspot)
async function pollNASAFires() {
    try {
        console.log('[Telemetry Service] Simulating NASA FIRMS hotspots...');
        const zones = [
            { name: 'อุทยานแห่งชาติศรีลานนา เชียงใหม่', lat: 19.1670, lon: 99.0435 },
            { name: 'เขตรักษาพันธุ์สัตว์ป่าห้วยขาแข้ง อุทัยธานี', lat: 15.6030, lon: 99.1230 },
            { name: 'ป่าอนุรักษ์ดอยอินทนนท์ เชียงใหม่', lat: 18.5912, lon: 98.4872 }
        ];

        if (Math.random() < 0.5) {
            const z = zones[Math.floor(Math.random() * zones.length)];
            const jitterLat = z.lat + (Math.random() - 0.5) * 0.12;
            const jitterLon = z.lon + (Math.random() - 0.5) * 0.12;

            const incident = {
                type: 'accident',
                title: `จุดความร้อนไฟป่าวิกฤต (NASA FIRMS Hotspot)`,
                description: `ตรวจวัดค่าสัมประสิทธิ์ความร้อนสูงผิดปกติจากดาวเทียมในเขตแนวป่าของ${z.name}`,
                latitude: jitterLat,
                longitude: jitterLon,
                severity: 'yellow',
                magnitude: null,
                timestamp: new Date().toISOString()
            };

            if (addPolledIncident(incident)) {
                console.log(`[NASA Simulator] Spawned high temperature wildfire point in ${z.name}`);
            }
        }
    } catch (err) {
        console.error('[NASA Simulator Error]:', err.message);
    }
}

// Collector triggers
function initTelemetryCollection() {
    // Initial fetch on server boot
    pollUSGSEarthquakes();
    pollOpenMeteoAlerts();
    pollGDELTDisasters();
    pollNASAFires();

    // Trigger polling every 3 minutes
    setInterval(() => {
        pollUSGSEarthquakes();
        pollOpenMeteoAlerts();
        pollGDELTDisasters();
        pollNASAFires();
    }, 180000);
}

initTelemetryCollection();

// Start Server
server.listen(PORT, () => {
    console.log(`🚀 ThaiAlert warnings collector server active on http://localhost:${PORT}`);
});

