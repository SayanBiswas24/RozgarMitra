const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      email: {
        type: String,
        default: null
      },
      role: {
        type: String,
        default: 'ANONYMOUS'
      }
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    target: {
      resourceType: {
        type: String,
        default: 'USER'
      },
      resourceId: {
        type: String,
        default: null
      }
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      required: true,
      index: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// TTL index to automatically purge audit logs after 90 days if desired
auditLogSchema.index({ timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
