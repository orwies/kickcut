'use strict';

// Value object for highlights. Used to validate and normalize data
// before it goes to the storage server.

class HighlightModel {
  /**
   * Constructs a new HighlightModel value object.
   * Receives a raw 'doc' object representing a database highlight.
   * Normalizes strings, parses scores, defaults missing fields, and sets creation dates.
   * Returns the constructed HighlightModel instance.
   */
  constructor({
    _id,
    homeTeam,
    awayTeam,
    competition,
    date,
    score,
    thumbnailPath,
    videoPath,
    likes,
    status,
    uploadedBy,
    createdAt,
  } = {}) {
    this._id = _id;
    this.homeTeam = homeTeam ? String(homeTeam).trim() : '';
    this.awayTeam = awayTeam ? String(awayTeam).trim() : '';
    this.competition = competition ? String(competition).trim() : '';
    this.date = date;
    this.score = {
      home: parseInt(score?.home ?? 0, 10),
      away: parseInt(score?.away ?? 0, 10),
    };
    this.thumbnailPath = thumbnailPath || '';
    this.videoPath = videoPath || '';
    this.likes = Array.isArray(likes) ? likes : [];
    this.status = status || 'pending';
    this.uploadedBy = uploadedBy || '';
    this.createdAt = createdAt || new Date();
  }

  /**
   * Validates the core fields of the highlight object before database storage.
   * Takes no arguments.
   * Checks for required properties, ensures the date is valid, and prevents negative scores.
   * Returns true if validation passes, otherwise throws an Error with details.
   */
  validate() {
    if (!this.homeTeam) throw new Error('HighlightModel: homeTeam is required');
    if (!this.awayTeam) throw new Error('HighlightModel: awayTeam is required');
    if (!this.competition) throw new Error('HighlightModel: competition is required');
    if (!this.date) throw new Error('HighlightModel: date is required');
    if (isNaN(new Date(this.date).getTime())) throw new Error('HighlightModel: date is invalid');
    if (this.score.home < 0 || this.score.away < 0) throw new Error('HighlightModel: score cannot be negative');
    if (!['pending', 'approved'].includes(this.status)) throw new Error('HighlightModel: invalid status');
    if (!this.uploadedBy) throw new Error('HighlightModel: uploadedBy is required');
    return true;
  }

  /**
   * Serializes the model back into a plain JavaScript object.
   * Takes no arguments.
   * Extracts only the necessary data properties, discarding prototype methods or internal state.
   * Returns a clean object suitable for inserting into MongoDB.
   */
  toObject() {
    return {
      homeTeam: this.homeTeam,
      awayTeam: this.awayTeam,
      competition: this.competition,
      date: this.date,
      score: this.score,
      thumbnailPath: this.thumbnailPath,
      videoPath: this.videoPath,
      likes: this.likes,
      status: this.status,
      uploadedBy: this.uploadedBy,
      createdAt: this.createdAt,
    };
  }

  /**
   * Factory method to construct a HighlightModel from a raw MongoDB document.
   * Receives the raw 'doc' object from the database query.
   * Instantiates and returns a new HighlightModel passing in the data.
   * Returns the newly created model instance.
   */
  static fromDoc(doc) {
    return new HighlightModel(doc);
  }
}

module.exports = HighlightModel;
