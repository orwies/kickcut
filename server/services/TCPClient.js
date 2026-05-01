'use strict';

const net = require('net');
const { EventEmitter } = require('events');
const StorageRequest = require('./StorageRequest');

/**
 * TCPClient – OOP class (requirement: ≥2 OOP classes)
 *
 * Manages the persistent TCP socket connection to the storage server.
 * Serialises StorageRequest objects using the custom length-prefixed JSON protocol,
 * and deserialises responses, correlating them via numeric request IDs.
 */
class TCPClient extends EventEmitter {
  /**
   * Initializes a new TCPClient instance.
   * Receives the 'host' and 'port' of the target storage server.
   * Sets up internal tracking for the socket, data buffer, and pending request maps.
   * Returns the initialized TCPClient object.
   */
  constructor(host, port) {
    super();
    this.host = host;
    this.port = port;
    this.socket = null;
    this._buffer = Buffer.alloc(0);
    this._pending = new Map(); // requestId → { resolve, reject }
    this._requestId = 0;
    this.connected = false;
  }

  /**
   * Establishes the TCP connection to the storage server.
   * Takes no arguments.
   * Creates a socket, sets up event listeners for data/errors, and initiates the connection.
   * Returns a Promise that resolves when fully connected or rejects on error.
   */
  connect() {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();

      this.socket.on('connect', () => {
        this.connected = true;
        console.log(`[TCPClient] Connected to storage server at ${this.host}:${this.port}`);
        resolve();
      });

      this.socket.on('data', (chunk) => this._handleData(chunk));

      this.socket.on('close', () => {
        this.connected = false;
        console.warn('[TCPClient] Connection to storage server closed');
        for (const [, { reject: rej }] of this._pending) {
          rej(new Error('TCP connection closed'));
        }
        this._pending.clear();
        this.emit('disconnected');
      });

      this.socket.on('error', (err) => {
        console.error('[TCPClient] Socket error:', err.message);
        if (!this.connected) reject(err);
        this.emit('error', err);
      });

      this.socket.connect(this.port, this.host);
    });
  }

  /**
   * Sends a storage command and awaits its response asynchronously.
   * Receives a message 'type' string and an optional 'payload' object.
   * Serializes the request, assigns a unique ID, writes to the socket, and tracks the Promise.
   * Returns a Promise that resolves with the server data or rejects with an error.
   */
  send(type, payload = {}) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.socket) {
        return reject(new Error('TCPClient: not connected to storage server'));
      }

      const id = ++this._requestId;
      this._pending.set(id, { resolve, reject });

      const request = new StorageRequest(type, payload);
      const frame = request.serialise(id);
      this.socket.write(frame);
    });
  }

  /**
   * Accumulates incoming binary data and parses complete frames.
   * Receives a raw binary 'chunk' from the TCP socket.
   * Extracts length headers, parses complete JSON frames, and resolves/rejects pending Promises.
   * Returns nothing.
   */
  _handleData(chunk) {
    this._buffer = Buffer.concat([this._buffer, chunk]);

    while (this._buffer.length >= 4) {
      const len = this._buffer.readUInt32BE(0);
      if (this._buffer.length < 4 + len) break;

      const frameBuf = this._buffer.subarray(0, 4 + len);
      this._buffer = this._buffer.subarray(4 + len);

      let msg;
      try {
        msg = StorageRequest.deserialise(frameBuf);
      } catch (e) {
        console.error('[TCPClient] Failed to deserialise response:', e.message);
        continue;
      }

      const pending = this._pending.get(msg.id);
      if (!pending) continue;

      this._pending.delete(msg.id);
      if (msg.status === 'ok') {
        pending.resolve(msg.data);
      } else {
        pending.reject(new Error(msg.error || 'Storage server error'));
      }
    }
  }

  /**
   * Closes the TCP connection gracefully.
   * Takes no arguments.
   * Destroys the socket to prevent further communication and clears the connected state.
   * Returns nothing.
   */
  disconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.connected = false;
    }
  }
}

module.exports = TCPClient;
