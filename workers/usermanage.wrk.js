'use strict'

const WrkBase = require('./base.wrk.js') // Import the base worker class
const crypto = require('crypto') // For API key generation

class UserManagementWorker extends WrkBase {
    constructor(ctx) {
        console.log('Initializing User Management Worker')

        // Pass the context to the base class constructor
        super(ctx);
    }

    init() {
        console.log('UserManagementWorker init called')

        // Only call the super class's init method
        super.init()
        this.users = {}
    }

    generateApiKey() {
        return crypto.randomBytes(16).toString('hex') // Generate a random API key
    }

    registerUser(username) {
        const apiKey = this.generateApiKey()
        this.users[username] = { apiKey, usageCount: 0 }
        return apiKey
    }

    trackUsage(username) {
        if (this.users[username]) {
            this.users[username].usageCount += 1
        }
    }

    async _startRpcServer() {
        await this.net_r0.startRpcServer()

        this.net_r0.rpcServer.respond('register', (data) => {
            return this.registerUser(data.username)
        })

        this.net_r0.rpcServer.respond('usage', (data) => {
            this.trackUsage(data.username)
            return this.users[data.username]
        })

        this.status.rpcPublicKey = this.getRpcKey().toString('hex')
        this.saveStatus()
    }

    _start(cb) {
        console.log('UserManagementWorker _start called')
        this._startRpcServer()
        cb()
    }
}

module.exports = UserManagementWorker