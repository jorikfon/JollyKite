/**
 * WindStreamManager - manages Server-Sent Events connection for real-time wind updates
 */
class WindStreamManager {
    constructor(apiBaseUrl = '/api') {
        this.apiBaseUrl = apiBaseUrl;
        this.eventSource = null;
        this.onUpdateCallback = null;
        this.reconnectTimeout = null;
        this.isConnected = false;
    }

    /**
     * Start listening for wind updates
     * @param {Function} callback - Called when new wind data arrives
     */
    connect(callback) {
        this.onUpdateCallback = callback;
        this.createConnection();
    }

    createConnection() {
        if (this.eventSource) {
            this.eventSource.close();
        }

        console.log('📡 Connecting to wind data stream...');

        this.eventSource = new EventSource(`${this.apiBaseUrl}/wind/stream`);

        this.eventSource.onopen = () => {
            console.log('✓ Connected to wind data stream');
            this.isConnected = true;

            // Clear any pending reconnect
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
        };

        this.eventSource.onmessage = (event) => {
            try {
                const update = JSON.parse(event.data);

                if (update.type === 'wind_update' && this.onUpdateCallback) {
                    console.log('📨 Received wind update via SSE');
                    this.onUpdateCallback(update.data, update.trend);
                }
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('SSE connection error');
            this.isConnected = false;

            // Close the connection
            this.eventSource.close();

            // Attempt to reconnect after 5 seconds
            if (!this.reconnectTimeout) {
                console.log('⏱️ Will reconnect in 5 seconds...');
                this.reconnectTimeout = setTimeout(() => {
                    this.reconnectTimeout = null;
                    this.createConnection();
                }, 5000);
            }
        };
    }

    /**
     * Disconnect from the stream
     */
    disconnect() {
        if (this.eventSource) {
            console.log('Disconnecting from wind data stream');
            this.eventSource.close();
            this.eventSource = null;
            this.isConnected = false;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    /**
     * Check if currently connected
     */
    getConnectionStatus() {
        return this.isConnected;
    }
}

export default WindStreamManager;
