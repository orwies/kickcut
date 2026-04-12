'use strict';

/**
 * HighlightModel – OOP class (requirement: ≥2 OOP classes)
 *
 * Represents a football highlight document with validation.
 */
class HighlightModel {
  /**
   * @param {object} doc - Raw highlight document
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
   * Validate highlight fields. Throws on invalid data.
   * @returns {true}
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
   * Serialise to a plain object suitable for storage.
   * @returns {object}
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
   * Construct a HighlightModel from a raw MongoDB document.
   * @param {object} doc
   * @returns {HighlightModel}
   */
  static fromDoc(doc) {
    return new HighlightModel(doc);
  }
}

module.exports = HighlightModel;
