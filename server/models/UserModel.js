'use strict';

// Value object for Users. Handles safe serialization (strips password hash).

class UserModel {
  /**
   * Constructs a new UserModel value object.
   * Receives a raw 'doc' object representing a user from MongoDB.
   * Normalizes the user properties, assigning default roles and creation dates if missing.
   * Returns the constructed UserModel instance.
   */
  constructor({ _id, username, passwordHash, role, createdAt } = {}) {
    this._id = _id;
    this.username = username;
    this.passwordHash = passwordHash;
    this.role = role || 'user';
    this.createdAt = createdAt || new Date();
  }

  /**
   * Validates the core fields of the user object before database storage.
   * Takes no arguments.
   * Checks username string length and verifies the user is assigned a valid role.
   * Returns true if validation passes, otherwise throws an Error.
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
   * Generates a safe representation of the user for client-side consumption.
   * Takes no arguments.
   * Deliberately omits the sensitive 'passwordHash' to prevent security leaks.
   * Returns a plain object with the user ID, username, role, and creation date.
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
   * Factory method to construct a UserModel from a raw MongoDB document.
   * Receives the raw 'doc' object from the database.
   * Instantiates and returns a new UserModel passing in the user data.
   * Returns the newly created model instance.
   */
  static fromDoc(doc) {
    return new UserModel(doc);
  }
}

module.exports = UserModel;
