const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'your-secret-key-here';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory database (replace with real DB in production)
let users = {
    'admin': {
        password: bcrypt.hashSync('admin123', 10),
        progress: {
            completedModules: 0,
            totalPoints: 0,
            badges: [],
            quizAnswers: {}
        }
    }
};

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Routes

// Register new user
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        if (users[username]) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        users[username] = {
            password: hashedPassword,
            progress: {
                completedModules: 0,
                totalPoints: 0,
                badges: [],
                quizAnswers: {}
            }
        };
        
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const user = users[username];
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
        
        res.json({
            token,
            username,
            progress: user.progress
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get quiz questions
app.get('/quiz', authenticateToken, (req, res) => {
    const quizQuestions = [
        {
            question: "Is caffeine prohibited during competitions?",
            options: [
                { text: "Yes, it's always prohibited", correct: false },
                { text: "No, but it's monitored", correct: true },
                { text: "Only in high doses", correct: false },
                { text: "Only for professional athletes", correct: false }
            ],
            explanation: "Caffeine is not currently prohibited, but it is monitored by WADA to detect patterns of misuse."
        },
        // ... (same questions as in frontend)
    ];
    
    res.json(quizQuestions);
});

// Save progress
app.post('/progress', authenticateToken, async (req, res) => {
    try {
        const { progress } = req.body;
        const username = req.user.username;
        
        if (!users[username]) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        users[username].progress = progress;
        
        res.json({ message: 'Progress saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user progress
app.get('/progress', authenticateToken, (req, res) => {
    const username = req.user.username;
    
    if (!users[username]) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(users[username].progress);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});