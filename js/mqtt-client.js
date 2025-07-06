// MQTT Client for Whiskers Presenter App
class MQTTClient {
    constructor(app) {
        this.app = app;
        this.client = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectTimer = null;
        this.messageQueue = [];
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('📡 Initializing MQTT Client...');

            // Check if mqtt.js is available
            if (typeof mqtt === 'undefined') {
                throw new Error('MQTT.js library not found. Please check if the library is loaded correctly.');
            }

            // Generate unique client ID
            this.clientId = `${CONFIG.MQTT.CLIENT_ID_PREFIX}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Set up connection options with improved settings
            this.connectionOptions = {
                clientId: this.clientId,
                keepalive: CONFIG.MQTT.KEEP_ALIVE,
                clean: CONFIG.MQTT.CLEAN_SESSION,
                connectTimeout: CONFIG.MQTT.CONNECT_TIMEOUT,
                reconnectPeriod: 0, // We'll handle reconnection manually
                rejectUnauthorized: false, // Allow self-signed certificates for public brokers
                protocolVersion: 4, // Use MQTT 3.1.1 for better compatibility
                // Add username/password if needed (not required for public broker)
                // username: '',
                // password: ''
            };

            console.log(`📡 Generated Client ID: ${this.clientId}`);

            // Start connection attempt
            this.initialized = true;
            console.log('✅ MQTT Client initialized - starting connection...');

            // Start connection in background (don't block initialization)
            this.connect().then(() => {
                console.log('✅ MQTT connection completed successfully');
            }).catch(error => {
                console.warn('⚠️ MQTT connection failed, continuing without MQTT:', error);
                this.handleConnectionError(error);
            });

        } catch (error) {
            console.error('❌ Failed to initialize MQTT Client:', error);
            // Don't throw - app should work without MQTT in development mode
            if (CONFIG.DEVELOPMENT_MODE) {
                console.log('📡 Continuing without MQTT in development mode');
                this.initialized = true; // Still mark as initialized
            } else {
                throw error;
            }
        }
    }

    async loadMQTTLibrary() {
        // This method is no longer needed since we load MQTT.js directly in HTML
        console.log('📡 MQTT.js library already loaded');
        return Promise.resolve();
    }

    async connect() {
        try {
            // Build broker URL with correct path
            const protocol = CONFIG.MQTT.USE_SSL ? 'wss' : 'ws';
            const port = CONFIG.MQTT.USE_SSL ? CONFIG.MQTT.SECURE_PORT : CONFIG.MQTT.PORT;
            const brokerUrl = `${protocol}://${CONFIG.MQTT.BROKER}:${port}/mqtt`;  // Added /mqtt path

            console.log(`📡 Connecting to MQTT broker: ${brokerUrl}`);
            console.log(`📡 Client ID: ${this.clientId}`);
            console.log('📡 Connection options:', this.connectionOptions);

            // Clean up any existing connection
            if (this.client) {
                console.log('📡 Cleaning up existing connection...');
                this.client.end(true);
                this.client = null;
            }

            // Create MQTT client
            this.client = mqtt.connect(brokerUrl, this.connectionOptions);

            // Set up event handlers
            this.setupEventHandlers();

            // Wait for connection with timeout
            try {
                await this.waitForConnection();
                console.log('✅ MQTT connection established successfully');
            } catch (connectionError) {
                console.error('❌ Connection failed:', connectionError);
                throw connectionError;
            }

        } catch (error) {
            console.error('📡 Failed to connect to MQTT broker:', error);
            this.handleConnectionError(error);
            // Re-throw so caller knows connection failed
            throw error;
        }
    }

    setupEventHandlers() {
        this.client.on('connect', () => {
            console.log('📡 Connected to MQTT broker successfully!');
            this.connected = true;
            this.reconnectAttempts = 0;

            // Update UI connection status
            if (this.app.modules.ui) {
                this.app.modules.ui.updateConnectionStatus(true);
            }

            // Subscribe to topics
            this.subscribe();

            // Send queued messages
            this.sendQueuedMessages();

            // Notify app of connection
            this.app.gameState.mqttStatus.connected = true;
            this.app.gameState.mqttStatus.lastMessage = null;

            console.log('📡 MQTT setup completed - ready for messages');
        });

        this.client.on('message', (topic, message) => {
            this.handleMessage(topic, message);
        });

        this.client.on('error', (error) => {
            console.error('📡 MQTT Error:', error);
            console.error('📡 Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            this.handleConnectionError(error);
        });

        this.client.on('close', () => {
            console.log('📡 MQTT connection closed');
            this.connected = false;
            if (this.app.modules.ui) {
                this.app.modules.ui.updateConnectionStatus(false);
            }
            this.app.gameState.mqttStatus.connected = false;

            // Attempt reconnection
            this.scheduleReconnect();
        });

        this.client.on('offline', () => {
            console.log('📡 MQTT client offline');
            this.connected = false;
            if (this.app.modules.ui) {
                this.app.modules.ui.updateConnectionStatus(false);
            }
        });

        this.client.on('reconnect', () => {
            console.log('📡 MQTT attempting to reconnect...');
        });

        this.client.on('disconnect', (packet) => {
            console.log('📡 MQTT disconnected:', packet);
            this.connected = false;
        });

        console.log('📡 MQTT event handlers set up');
    }

    async waitForConnection() {
        return new Promise((resolve, reject) => {
            console.log(`📡 Waiting for connection (timeout: ${CONFIG.MQTT.CONNECT_TIMEOUT}ms)...`);

            const timeout = setTimeout(() => {
                console.error('📡 Connection timeout exceeded');
                reject(new Error(`Connection timeout after ${CONFIG.MQTT.CONNECT_TIMEOUT}ms`));
            }, CONFIG.MQTT.CONNECT_TIMEOUT);

            const onConnect = () => {
                console.log('📡 Connection established!');
                clearTimeout(timeout);
                this.client.removeListener('error', onError);
                resolve();
            };

            const onError = (error) => {
                console.error('📡 Connection error during wait:', error);
                clearTimeout(timeout);
                this.client.removeListener('connect', onConnect);
                reject(error);
            };

            // Check if already connected
            if (this.client.connected) {
                console.log('📡 Already connected!');
                clearTimeout(timeout);
                resolve();
                return;
            }

            this.client.once('connect', onConnect);
            this.client.once('error', onError);
        });
    }

    subscribe() {
        const topic = CONFIG.TOPICS.SUBSCRIBE;
        console.log(`📡 Subscribing to topic: ${topic}`);

        this.client.subscribe(topic, (error) => {
            if (error) {
                console.error(`📡 Failed to subscribe to ${topic}:`, error);
            } else {
                console.log(`📡 Successfully subscribed to ${topic}`);
            }
        });
    }

    handleMessage(topic, message) {
        try {
            const messageStr = message.toString();
            console.log(`📡 Received message on ${topic}:`, messageStr);

            // Parse JSON message
            let parsedMessage;
            try {
                parsedMessage = JSON.parse(messageStr);
            } catch (error) {
                console.error('📡 Failed to parse JSON message:', error);
                return;
            }

            // Validate message structure
            if (!this.validateMessage(parsedMessage)) {
                console.error('📡 Invalid message structure:', parsedMessage);
                return;
            }

            // Forward to app for handling
            this.app.handleMQTTMessage(parsedMessage);

        } catch (error) {
            console.error('📡 Error handling message:', error);
            this.app.handleError('mqtt_message_handling', error);
        }
    }

    validateMessage(message) {
        // Basic validation - must have type and timestamp
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
                    this.app.handleError('mqtt_publish', error);
                }
            });

        } catch (error) {
            console.error('📡 Error publishing message:', error);
            this.app.handleError('mqtt_publish', error);
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
        this.app.modules.ui.updateConnectionStatus(false);
        this.app.gameState.mqttStatus.connected = false;

        // Schedule reconnection attempt
        this.scheduleReconnect();
    }

    scheduleReconnect() {
        if (this.reconnectTimer) return; // Already scheduled

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('📡 Max reconnection attempts reached');
            this.app.handleError('mqtt_max_reconnects',
                new Error('Maximum MQTT reconnection attempts exceeded'));
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff
        console.log(`📡 Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            this.reconnectAttempts++;

            try {
                await this.connect();
            } catch (error) {
                console.error('📡 Reconnection failed:', error);
                // Will trigger another reconnection attempt via error handler
            }
        }, delay);
    }

    disconnect() {
        console.log('📡 Disconnecting from MQTT broker');

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.client && this.connected) {
            this.client.end();
        }

        this.connected = false;
        this.app.modules.ui.updateConnectionStatus(false);
        this.app.gameState.mqttStatus.connected = false;
    }

    // Development/Testing Methods
    simulateMessage(messageType, data = {}) {
        if (!CONFIG.DEVELOPMENT_MODE) {
            console.warn('📡 Message simulation only available in development mode');
            return;
        }

        const simulatedMessage = {
            type: messageType,
            timestamp: new Date().toISOString(),
            ...data
        };

        console.log('📡 [DEV] Simulating MQTT message:', simulatedMessage);
        this.app.handleMQTTMessage(simulatedMessage);
    }

    getConnectionStats() {
        return {
            connected: this.connected,
            clientId: this.clientId,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length,
            brokerUrl: `${CONFIG.MQTT.USE_SSL ? 'wss' : 'ws'}://${CONFIG.MQTT.BROKER}:${CONFIG.MQTT.USE_SSL ? CONFIG.MQTT.SECURE_PORT : CONFIG.MQTT.PORT}/mqtt`
        };
    }

    // Getters
    isConnected() {
        return this.connected;
    }

    isInitialized() {
        return this.initialized;
    }
} 