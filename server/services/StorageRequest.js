'use strict';

/**
 * StorageRequest – OOP class (requirement: ≥2 OOP classes)
 *
 * Encapsulates a query/command to be sent over the custom TCP protocol.
 * Protocol format: [4-byte big-endian uint32: payload_length][JSON payload bytes]
 */
class StorageRequest {
  /**
   * Constructs a new StorageRequest instance.
   * Receives a message 'type' string and an optional 'payload' object.
   * Validates the type and attaches a creation timestamp.
   * Returns the new StorageRequest object.
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
   * Serializes the request into a length-prefixed Buffer.
   * Receives a unique request correlation 'id' number.
   * Converts the payload to JSON and prepends a 4-byte big-endian length header.
   * Returns the complete Buffer ready for TCP transmission.
   */
  serialise(id) {
    const body = JSON.stringify({ id, type: this.type, payload: this.payload });
    const json = Buffer.from(body, 'utf8');
    const header = Buffer.allocUnsafe(4);
    header.writeUInt32BE(json.length, 0);
    return Buffer.concat([header, json]);
  }

  /**
   * Deserializes a raw response frame Buffer back into a JavaScript object.
   * Receives a complete frame Buffer including the length header.
   * Reads the header, extracts the JSON payload, and parses it.
   * Returns an object containing the response id, status, data, or error message.
   */
  static deserialise(buf) {
    if (buf.length < 4) throw new RangeError('Buffer too short to contain a frame header');
    const len = buf.readUInt32BE(0);
    if (buf.length < 4 + len) throw new RangeError('Buffer is incomplete – frame truncated');
    return JSON.parse(buf.subarray(4, 4 + len).toString('utf8'));
  }

  /**
   * Returns a string representation of the request.
   * Takes no arguments.
   * Formats the request type and timestamp for debugging purposes.
   * Returns a formatted descriptive string.
   */
  toString() {
    return `StorageRequest(${this.type}) @ ${this.createdAt}`;
  }
}

module.exports = StorageRequest;
