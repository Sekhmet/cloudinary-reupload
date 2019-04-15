const bluebird = require('bluebird');
const cloudinary = require('cloudinary');
const debug = require('debug')('cloudinary:log');

const { Promise } = bluebird;
bluebird.promisifyAll(cloudinary);
const MAX_SIZE = 400;

const sleep = time => new Promise(resolve => setTimeout(() => resolve(), time));

let total = 0;
let counter = 0;

async function reuploadImage(resource) {
  if ((resource.width > MAX_SIZE || resource.height > MAX_SIZE) && resource.type === 'upload') {
    counter += 1;
    await cloudinary.v2.uploader.upload(resource.url, {
      public_id: resource.public_id,
      transformation: 'downsizing2',
      invalidate: true,
      overwrite: true,
    });
  }
}

async function runner() {
  let nextCursor = null;
  do {
    try {
      const result = await cloudinary.v2.api.resources({
        max_results: 500,
        next_cursor: nextCursor,
      });
      nextCursor = result.next_cursor;

      const transformBatch = result.resources.map(resource => reuploadImage(resource));

      await Promise.all(transformBatch);

      total += result.resources.length;
      if (total % 1000 === 0) {
        debug('transformed', counter, 'of', total, 'at', nextCursor);
      }
    } catch (err) {
      console.error('Error occurred');
      console.error(err);
    }
  } while (nextCursor);

  debug('finished', counter);
}

runner();
