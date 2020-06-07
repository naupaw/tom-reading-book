const { Telegraf } = require('telegraf');
const { createCanvas, loadImage } = require('canvas');
var ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const https = require('https');
const config = require('./config.json');

const bot = new Telegraf(config.BOT_TOKEN);

const assetPath = (filename) => path.resolve(__dirname, 'assets', filename);

const fileIdPath = (fileId, ext, type = '') =>
  path.resolve(__dirname, 'tmp', `${fileId}${type}.${ext}`);

const toVideo = (fileId, outname, { replyWithVideo, reply }) => {
  const vid1 = assetPath('1.mp4');
  const vid2 = fileIdPath(fileId, 'mp4', '-2');
  const vid3 = assetPath('3.mp4');
  const finalNoAudio = fileIdPath(fileId, 'mp4', '-noaudio');
  const final = fileIdPath(fileId, 'mp4');
  const audio = assetPath('audio.mp3');

  const deleteAll = () => {
    fs.unlink(outname, () => {});
    fs.unlink(final, () => {});
    fs.unlink(finalNoAudio, () => {});
    fs.unlink(vid2, () => {});
  };

  const onError = (e) => {
    reply('Unfortunately we broken :( try again later');
    console.log('An error occurred: ' + err.message);
    deleteAll();
  };

  console.log('[pipeline 1 of 3]', fileId);
  ffmpeg(outname)
    .loop(1.259)
    .fps(25)
    .size('640x480')
    .videoCodec('libx264')
    .format('mp4')
    .noAudio()
    .save(vid2)
    .on('end', () => {
      console.log('[pipeline 2 of 3]', fileId);
      ffmpeg()
        .mergeAdd(vid1)
        .mergeAdd(vid2)
        .mergeAdd(vid3)
        .mergeToFile(finalNoAudio)
        .on('end', () => {
          console.log('[pipeline 3 of 3]', fileId);
          ffmpeg()
            .addInput(finalNoAudio)
            .addInput(audio)
            .save(final)
            .on('end', async () => {
              console.log('[send to telegram]', fileId);
              try {
                await replyWithVideo({
                  filename: `${fileId}.mp4`,
                  source: final,
                });
              } catch (e) {}
              deleteAll();
            })
            .on('error', onError);
        })
        .on('error', onError);
    })
    .on('error', onError);
};

const proc = async (fileId, filepath, tele) => {
  try {
    const image = await loadImage(assetPath('template.png'));
    const tempel = await loadImage(filepath);

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.rotate(0);

    const w = 265;
    const h = 255;

    // get the scale
    var scale = Math.min(w / tempel.width, h / tempel.height);
    var x = w / 2 - (tempel.width / 2) * scale;
    var y = h / 2 - (tempel.height / 2) * scale;

    // Draw cat with lime helmet
    ctx.drawImage(image, 0, 0, image.width, image.height);
    ctx.setTransform(0.98, -0.17, 0.3, 1.057, 100, 100);
    ctx.drawImage(
      tempel,
      80 + x,
      45 + y,
      tempel.width * scale,
      tempel.height * scale
    );

    let outname = fileIdPath(fileId, 'jpg', '-i');
    const out = fs.createWriteStream(outname);
    const stream = canvas.createJPEGStream();
    stream.pipe(out);
    out
      .on('finish', () => {
        toVideo(fileId, outname, tele);
      })
      .on('error', () => {
        tele.reply('Unfortunately we broken :( try again later');
      });
  } catch (e) {
    tele.reply('Unfortunately we broken :( try again later');
  }
};

const run = () => {
  bot.on('photo', async (ctx) => {
    const { message, tg, reply, replyWithChatAction } = ctx;
    console.log(JSON.stringify(message, null, 2));

    replyWithChatAction('upload_video');

    let file = null;
    if (message.photo.length > 2) {
      file = message.photo[1];
    } else {
      file = message.photo[message.photo.length - 1];
    }
    const { file_unique_id, file_id } = file;
    const res = await tg.getFileLink(file_id);
    const ext = res.match(/\.([a-z]+)$/)[0];
    const outname = path.resolve(__dirname, 'tmp', `${file_unique_id}${ext}`);

    const out = fs.createWriteStream(outname);
    out.on('finish', () => {
      console.log('[downloaded done]', file_unique_id);
      proc(file_unique_id, outname, ctx);
    });

    const request = https.get(res, function (response) {
      response.pipe(out);
    });

    request.on('error', (e) => {
      reply('Unfortunately we broken :( try again later');
    });
  });
  console.log('listening...');
  bot.launch();
};

run();
