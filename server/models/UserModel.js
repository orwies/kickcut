'use strict';

/**
 * UserModel – OOP class (requirement: ≥2 OOP classes)
 *
 * Represents a user document retrieved from the storage server.
 * Provides validation and safe serialisation (strips password hash).
 */
class UserModel {
  /**
   * @param {object} doc - Raw user document from MongoDB
   */
  constructor({ _id, username, passwordHash, role, createdAt } = {}) {
    this._id = _id;
    this.username = username;
    this.passwordHash = passwordHash;
    this.role = role || 'user';
    this.createdAt = createdAt || new Date();
  }

  /**
   * Validate user fields. Throws on invalid data.
   * @returns {true}
   */
  validate() {
    if (!this.username || typeof this.username !== 'string') {
      throw new Error('UserModel: username is required');
    }
    if (this.username.length < 3 || this.username.length > 30) {
      throw new Error('UserModel: username must be 3–30 characters');
    }
    if (!['user', 'admin'].includes(this.role)) {
      throw new Error(`UserModel: invalid role "${this.role}"`);
    }
    return true;
  }

  /**
   * Return a safe representation with no password hash.
   * NEVER include passwordHash in API responses.
   * @returns {object}
   */
  toSafeObject() {
    return {
      id: this._id ? this._id.toString() : undefined,
      username: this.username,
      role: this.role,
      createdAt: this.createdAt,
    };
  }

  /**
   * Construct a UserModel from a raw MongoDB document.
   * @param {object} doc
   * @returns {UserModel}
   */
  static fromDoc(doc) {
    return new UserModel(doc);
  }
}

module.exports = UserModel;
