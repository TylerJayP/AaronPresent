// Complete MQTT Client for Presenter App - Fixed timing issues
class MQTTClient {
    constructor(app) {
        this.app = app;
        this.client = null;
        this.connected = false;
        this.messageQueue = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.connectionOptions = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('📡 Initializing MQTT Client...');

            // Wait for MQTT.js library to be loaded
            await this.waitForMQTTLibrary();

            // Set up connection options
            this.setupConnectionOptions();

            this.initialized = true;
            console.log('✅ MQTT Client initialized - starting connection...');

            // Start connection
            await this.connect();

        } catch (error) {
            console.error('❌ Failed to initialize MQTT Client:', error);
            this.app.handleError('mqtt_init', error);
        }
    }

    async waitForMQTTLibrary() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('MQTT.js library failed to load'));
            }, 10000);

            const checkMQTT = () => {
                if (typeof mqtt !== 'undefined') {
                    clearTimeout(timeout);
                    console.log('✅ MQTT.js library confirmed available');
                    resolve();
                } else {
                    setTimeout(checkMQTT, 100);
                }
            };

            checkMQTT();
        });
    }

    setupConnectionOptions() {
        const clientId = `${CONFIG.MQTT.CLIENT_ID_PREFIX}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('📡 Generated Client ID:', clientId);

        this.connectionOptions = {
            clientId: clientId,
            keepalive: CONFIG.MQTT.KEEP_ALIVE || 30,
            clean: CONFIG.MQTT.CLEAN_SESSION !== false,
            connectTimeout: CONFIG.MQTT.CONNECT_TIMEOUT || 15000,
            reconnectPeriod: 0, // We handle reconnection manually
            will: {
                topic: CONFIG.TOPICS.PUBLISH,
                payload: JSON.stringify({
                    type: 'presenter_disconnected',
                    clientId: clientId,
                    timestamp: new Date().toISOString()
                }),
                qos: 0,
                retain: false
            }
        };

        console.log('📡 Connection options:', this.connectionOptions);
    }

    async connect() {
        try {
            const brokerUrl = this.buildBrokerUrl(CONFIG.MQTT.PRIMARY_BROKER);
            console.log('📡 Connecting to MQTT broker:', brokerUrl);
            console.log('📡 Client ID:', this.connectionOptions.clientId);
            console.log('📡 Connection options:', this.connectionOptions);

            await this.attemptConnection(brokerUrl);
            
        } catch (error) {
            console.error('📡 Primary broker connection failed:', error);
            
            // Try fallback broker if available
            if (CONFIG.MQTT.FALLBACK_BROKER && CONFIG.MQTT.FALLBACK_BROKER !== CONFIG.MQTT.PRIMARY_BROKER) {
                try {
                    const fallbackUrl = this.buildBrokerUrl(CONFIG.MQTT.FALLBACK_BROKER);
                    console.log('📡 Trying fallback broker:', fallbackUrl);
                    await this.attemptConnection(fallbackUrl);
                } catch (fallbackError) {
                    console.error('📡 Fallback broker also failed:', fallbackError);
                    this.handleConnectionError(fallbackError);
                }
            } else {
                this.handleConnectionError(error);
            }
        }
    }

    buildBrokerUrl(broker) {
        const port = CONFIG.MQTT.USE_SSL ? CONFIG.MQTT.SECURE_PORT : CONFIG.MQTT.PORT;
        const protocol = CONFIG.MQTT.USE_SSL ? 'wss' : 'ws';
        return `${protocol}://${broker}:${port}/mqtt`;
    }

    async attemptConnection(brokerUrl) {
        return new Promise((resolve, reject) => {
            if (this.client) {
                this.client.end(true);
                this.client = null;
            }

            this.client = mqtt.connect(brokerUrl, this.connectionOptions);
            this.setupEventHandlers();

            const timeout = setTimeout(() => {
                reject(new Error(`Connection timeout to ${brokerUrl}`));
            }, CONFIG.MQTT.CONNECT_TIMEOUT);

            this.client.once('connect', () => {
                clearTimeout(timeout);
                resolve();
            });

            this.client.once('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    setupEventHandlers() {
        this.client.on('connect', () => {
            console.log('📡 Connected to MQTT broker successfully!');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.app.gameState.connected = true;

            // Update UI
            if (this.app.modules.ui) {
                this.app.modules.ui.updateConnectionStatus(true);
            }

            // Subscribe to topic
            this.subscribe();

            // Send any queued messages (including app_ready)
            this.sendQueuedMessages();

            this.app.log('MQTT connected successfully', 'system');
        });

        this.client.on('message', (topic, message) => {
            this.handleMessage(topic, message);
        });

        this.client.on('error', (error) => {
            console.error('📡 MQTT Error:', error);
            this.handleConnectionError(error);
        });

        this.client.on('close', () => {
            console.log('📡 MQTT connection closed');
            this.connected = false;
            this.app.gameState.connected = false;
            if (this.app.modules.ui) {
                this.app.modules.ui.updateConnectionStatus(false);
            }
            this.scheduleReconnect();
        });

        this.client.on('offline', () => {
            console.log('📡 MQTT client offline');
            this.connected = false;
            this.app.gameState.connected = false;
            if (this.app.modules.ui) {
                this.app.modules.ui.updateConnectionStatus(false);
            }
        });

        console.log('📡 MQTT event handlers set up');

        // Set up connection timeout
        console.log(`📡 Waiting for connection (timeout: ${CONFIG.MQTT.CONNECT_TIMEOUT}ms)...`);
        setTimeout(() => {
            if (!this.connected) {
                console.log('📡 Connection established!');
            }
        }, 1000);
    }

    subscribe() {
        const topic = CONFIG.TOPICS.SUBSCRIBE;
        console.log(`📡 Subscribing to topic: ${topic}`);

        this.client.subscribe(topic, (error) => {
            if (error) {
                console.error(`📡 Failed to subscribe to ${topic}:`, error);
                this.app.log(`Failed to subscribe: ${error.message}`, 'error');
            } else {
                console.log(`📡 Successfully subscribed to ${topic}`);
                console.log('📡 MQTT setup completed - ready for messages');
                this.app.log(`Subscribed to: ${topic}`, 'success');
            }
        });
    }

    handleMessage(topic, message) {
        try {
            const messageStr = message.toString();
            console.log(`📡 Received message on ${topic}:`, messageStr);

            let parsedMessage;
            try {
                parsedMessage = JSON.parse(messageStr);
            } catch (error) {
                console.error('📡 Failed to parse JSON message:', error);
                this.app.log('Received invalid JSON message', 'error');
                return;
            }

            // Validate message structure
            if (!this.validateMessage(parsedMessage)) {
                console.error('📡 Invalid message structure:', parsedMessage);
                this.app.log('Received invalid message structure', 'error');
                return;
            }

            // Forward to app
            this.app.handleMQTTMessage(parsedMessage);

        } catch (error) {
            console.error('📡 Error handling message:', error);
            this.app.log(`Message handling error: ${error.message}`, 'error');
        }
    }

    validateMessage(message) {
        return message &&
               typeof message.type === 'string' &&
               typeof message.timestamp === 'string';
    }

    publish(message) {
        try {
            if (!this.connected) {
                console.log('📡 Not connected, queuing message:', message);
                this.messageQueue.push(message);
                return;
            }

            // Add timestamp if not present
            if (!message.timestamp) {
                message.timestamp = new Date().toISOString();
            }

            const topic = CONFIG.TOPICS.PUBLISH;
            const messageStr = JSON.stringify(message);

            console.log(`📡 Publishing to ${topic}:`, message);

            this.client.publish(topic, messageStr, (error) => {
                if (error) {
                    console.error('📡 Failed to publish message:', error);
                    this.app.log(`Publish failed: ${error.message}`, 'error');
                }
            });

        } catch (error) {
            console.error('📡 Error publishing message:', error);
            this.app.log(`Publish error: ${error.message}`, 'error');
        }
    }

    sendQueuedMessages() {
        if (this.messageQueue.length === 0) return;

        console.log(`📡 Sending ${this.messageQueue.length} queued messages`);

        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.publish(message);
        }
    }

    handleConnectionError(error) {
        console.error('📡 Connection error:', error);
        this.connected = false;
        this.app.gameState.connected = false;
        if (this.app.modules.ui) {
            this.app.modules.ui.updateConnectionStatus(false);
        }
        this.app.log(`Connection error: ${error.message}`, 'error');
        this.scheduleReconnect();
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('📡 Max reconnection attempts reached');
            this.app.log('Max reconnection attempts reached', 'error');
            return;
        }

        this.reconnectAttempts++;
        console.log(`📡 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);

        setTimeout(() => {
            if (!this.connected) {
                this.connect();
            }
        }, this.reconnectDelay);

        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
    }

    isConnected() {
        return this.connected;
    }

    disconnect() {
        if (this.client) {
            this.client.end();
            this.client = null;
        }
        this.connected = false;
        this.app.gameState.connected = false;
    }

    getConnectionStatus() {
        return {
            connected: this.connected,
            reconnectAttempts: this.reconnectAttempts,
            messageQueueLength: this.messageQueue.length,
            clientId: this.connectionOptions?.clientId
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MQTTClient;
}