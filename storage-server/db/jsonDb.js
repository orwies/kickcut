'use strict';

/**
 * jsonDb.js – Simple JSON file database.
 * Replaces MongoDB entirely. Data is stored in storage-server/data/*.json
 * Satisfies the "working with files" project requirement.
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function load(collection) {
  const fp = filePath(collection);
  if (!fs.existsSync(fp)) return [];
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return [];
  }
}

function save(collection, docs) {
  fs.writeFileSync(filePath(collection), JSON.stringify(docs, null, 2), 'utf8');
}

const db = {
  /** Return all documents matching predicate (default: all) */
  find(collection, predicate = () => true) {
    return load(collection).filter(predicate);
  },

  /** Return first document matching predicate or null */
  findOne(collection, predicate) {
    return load(collection).find(predicate) ?? null;
  },

  /** Insert a new document, auto-assigns _id and createdAt */
  create(collection, data) {
    const docs = load(collection);
    const doc = { _id: randomUUID(), createdAt: new Date().toISOString(), ...data };
    docs.push(doc);
    save(collection, docs);
    return doc;
  },

  /** Update fields of a document by _id. Returns updated doc or null. */
  updateById(collection, id, updates) {
    const docs = load(collection);
    const idx = docs.findIndex((d) => d._id === id);
    if (idx === -1) return null;
    docs[idx] = { ...docs[idx], ...updates };
    save(collection, docs);
    return docs[idx];
  },

  /** Fully replace a document by _id (used for array fields like likes). */
  replaceById(collection, id, newDoc) {
    const docs = load(collection);
    const idx = docs.findIndex((d) => d._id === id);
    if (idx === -1) return null;
    docs[idx] = newDoc;
    save(collection, docs);
    return docs[idx];
  },

  /** Delete a document by _id. Returns deleted doc or null. */
  deleteById(collection, id) {
    const docs = load(collection);
    const idx = docs.findIndex((d) => d._id === id);
    if (idx === -1) return null;
    const [deleted] = docs.splice(idx, 1);
    save(collection, docs);
    return deleted;
  },
};

module.exports = db;
