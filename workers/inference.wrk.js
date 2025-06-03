'use strict'

const WrkBase = require('bfx-wrk-base')
const axios = require('axios') // Assuming you use axios for making HTTP requests to OpenAI API
const pino = require('pino')

class InferenceWorker extends WrkBase {
    constructor(ctx, conf = {}) {
        super(conf, ctx)
        console.log('Inference Worker initialized with context:', ctx)
    }

    init() {
        super.init();

        // Add network and store facilities if not already added by the base
        this.loadConf('common');
        const storeDir = (this.ctx.env === 'test' && this.ctx.tmpdir) ?
            `${this.ctx.tmpdir}/store/${this.ctx.rack}` :
            `store/${this.ctx.rack}`;

        this.setInitFacs([
            ['fac', 'hp-svc-facs-store', 's0', 's0', { storeDir }, 0],
            ['fac', 'hp-svc-facs-net', 'r0', 'r0', () => ({ fac_store: this.store_s0 }), 1]
        ]);

        this.logger = pino({
            name: `wrk:inference:${this.ctx.wtype}:${process.pid}`,
            level: this.ctx.debug ? 'debug' : 'info',
        });
    }

    async getInferenceResponse(input) {
        // Example: Making a request to OpenAI API
        try {
            const response = await axios.post('https://api.openai.com/v1/completions', {
                prompt: input,
                model: 'text-davinci-003', // Replace with the actual model you're using
                max_tokens: 100,
            }, {
                headers: {
                    'Authorization': `Bearer YOUR_OPENAI_API_KEY`,
                }
            })
            return response.data.choices[0].text
        } catch (error) {
            console.error('Error during inference:', error)
            throw error
        }
    }

    async _startRpcServer() {
        await this.net_r0.startRpcServer()

        this.net_r0.rpcServer.respond('inference', async(data) => {
            const { input } = data
            const result = await this.getInferenceResponse(input)
            return { result }
        })

        this.logger.info('Inference worker started and listening for RPC calls')
    }

    _start(cb) {
        this._startRpcServer()
        cb()
    }
}

module.exports = InferenceWorker