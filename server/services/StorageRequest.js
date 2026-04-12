'use strict';

/**
 * StorageRequest – OOP class (requirement: ≥2 OOP classes)
 *
 * Encapsulates a query/command to be sent over the custom TCP protocol.
 * Protocol format: [4-byte big-endian uint32: payload_length][JSON payload bytes]
 */
class StorageRequest {
  /**
   * @param {string} type - Message type (e.g. 'FIND_HIGHLIGHTS')
   * @param {object} payload - Data payload for the request
   */
  constructor(type, payload = {}) {
    if (!type || typeof type !== 'string') {
      throw new TypeError('StorageRequest: type must be a non-empty string');
    }
    this.type = type;
    this.payload = payload;
    this.createdAt = new Date().toISOString();
  }

  /**
   * Serialise this request into a length-prefixed Buffer ready to send over TCP.
   * @param {number} id - Request correlation ID assigned by TCPClient
   * @returns {Buffer}
   */
  serialise(id) {
    const body = JSON.stringify({ id, type: this.type, payload: this.payload });
    const json = Buffer.from(body, 'utf8');
    const header = Buffer.allocUnsafe(4);
    header.writeUInt32BE(json.length, 0);
    return Buffer.concat([header, json]);
  }

  /**
   * Deserialise a raw response frame from a Buffer.
   * @param {Buffer} buf - Full frame buffer (including 4-byte length header)
   * @returns {{ id: number, status: string, data: any, error: string }}
   */
  static deserialise(buf) {
    if (buf.length < 4) throw new RangeError('Buffer too short to contain a frame header');
    const len = buf.readUInt32BE(0);
    if (buf.length < 4 + len) throw new RangeError('Buffer is incomplete – frame truncated');
    return JSON.parse(buf.subarray(4, 4 + len).toString('utf8'));
  }

  toString() {
    return `StorageRequest(${this.type}) @ ${this.createdAt}`;
  }
}

module.exports = StorageRequest;
