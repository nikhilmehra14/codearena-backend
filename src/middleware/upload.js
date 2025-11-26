const { upload } = require('../config/cloudinary');
const { BadRequestError } = require('../utils/errorHandler');

const uploadAvatar = (req, res, next) => {
  const uploadSingle = upload.single('avatar');

  uploadSingle(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new BadRequestError('File too large. Maximum size is 5MB.'));
      }
      if (err.message === 'Unexpected field') {
        return next(new BadRequestError('Invalid field name. Use "avatar".'));
      }
      return next(new BadRequestError(err.message));
    }
    next();
  });
};

module.exports = {
  uploadAvatar,
};
