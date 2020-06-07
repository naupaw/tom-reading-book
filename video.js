var ffmpeg = require('fluent-ffmpeg');

ffmpeg('./out.jpg')
  .loop(1.259)
  .fps(25)
  .size('640x480')
  .videoCodec('libx264')
  .format('mp4')
  .addInput('./vid-2.mp3')
  .audioFilters('volume=0.01')
  .noAudio()
  .save('./2.mp4')
  .on('end', () => {
    console.log('done');
    setTimeout(() => {
      ffmpeg()
        .mergeAdd('./1.mp4')
        .mergeAdd('./2.mp4')
        .mergeAdd('./3.mp4')
        .on('error', function (err) {
          console.log('An error occurred: ' + err.message);
        })
        .on('end', () => {
          console.log('success?');
          ffmpeg()
            .addInput('./tmp.mp4')
            .addInput('./audio.mp3')
            .on('end', () => {
              console.log('success of course');
            })
            .save('./output.mp4');
        })
        .mergeToFile('./tmp.mp4');
    }, 1000);
  });
