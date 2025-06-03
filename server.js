'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')
const cors = require('cors') // Add CORS middleware
const rateLimit = require('express-rate-limit')
const client = require('prom-client')
const register = client.register

const app = express()
const port = 3000

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each user to 100 requests per window
    message: 'Too many requests, please try again later.'
})

app.use(limiter) // Apply rate limiting to all requests


const InferenceWorker = require('./workers/inference.wrk.js')
const UserManagementWorker = require('./workers/usermanage.wrk.js') // Import the worker class



app.use(cors()) // Enable CORS for all routes
    // Middleware to parse JSON
app.use(bodyParser.json())

const ctx = {
    wtype: 'usermanage',
    env: 'development', // or 'production', 'test'
    root: '/Users/sanjanaadeshra/wrk-base',
    rack: 'default', // or any unique identifier
    tmpdir: '/tmp', // if needed for test env
    debug: true, // if you want debug logging
}
console.log("Context Object (ctx):", ctx);


const conf = {}
const userWorker = new UserManagementWorker(ctx, conf)
userWorker.init()
userWorker.start(() => {
    console.log('User Management Worker started.')
})

const inferenceWorker = new InferenceWorker(ctx, conf);
inferenceWorker.init();
inferenceWorker.start(() => {
    console.log('Inference Worker started.');
});


// Create a metric to track API requests
const requestCounter = new client.Counter({
    name: 'api_requests_total',
    help: 'Total number of API requests made'
})

app.get('/metrics', async(req, res) => {
    res.set('Content-Type', register.contentType)
    res.end(await register.metrics())
})

// Increment the request count for each incoming API request
app.use((req, res, next) => {
    requestCounter.inc()
    next()
})

// Register API endpoint
app.post('/register', async(req, res) => {
    const { username } = req.body
    try {
        const apiKey = await userWorker.registerUser(username)
        res.status(200).json({ apiKey }) // Return the API key after registration
    } catch (error) {
        res.status(500).json({ error: 'Failed to register user' })
    }
})

// Usage Tracking API endpoint
app.post('/usage', async(req, res) => {
    const { username } = req.body
    try {
        const usageData = await userWorker.trackUsage(username)
        res.status(200).json({ usageCount: usageData.usageCount }) // Return usage count
    } catch (error) {
        res.status(500).json({ error: 'Failed to track usage' })
    }
})

// Start the Express server
app.listen(port, () => {
    console.log(`Backend API listening at http://localhost:${port}`)
})