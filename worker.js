'use strict'

const UserManagementWorker = require('./workers/usermanage.wrk.js') // Add your new worker
const InferenceWorker = require('./workers/inference.wrk.js') // If you're handling inference, keep it

// Start the user management worker
const ctx = { wtype: 'user-management', env: 'development', debug: true }
const userWorker = new UserManagementWorker(ctx)
userWorker.start(() => {
    console.log('User Management Worker started.')
})

// If you have other workers, start them as well
const inferenceWorker = new InferenceWorker(ctx) // Use the same ctx for other workers
inferenceWorker.start(() => {
    console.log('Inference Worker started.')
})