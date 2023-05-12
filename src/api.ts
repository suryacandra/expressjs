// @ts-nocheck

import express from 'express';
import cors from 'cors';
import AWS from 'aws-sdk';
import multer from 'multer';
import randomstring from 'randomstring'
import { Deta } from 'deta'

const deta = Deta('c0ywx59m4fj_HUhSd7ciqAbBSVaYA1oxrZ9QzohPuXZ9')
const db = deta.Base('drive');

const s3 = new AWS.S3({
    endpoint: "https://s3.wasabisys.com",
    credentials: {
        accessKeyId: 'QRQC2KZYQJ7I3E94PGC6',
        secretAccessKey: '834vUiedzRZYLnKj1YNknCymochwD3F8k1FvGn6E',

    },
});

const bucketName = 'ripepno';

const downloadParams = {
    Key: "XXnByQW-480p_ElfWibu_01_bsite.mp4",
    Bucket: bucketName,
}

export const app = express();

app.use(cors({ origin: true }));

app.use(express.json());
app.use(multer().any());
app.use(express.raw({ type: 'application/vnd.custom-type' }));
app.use(express.text({ type: 'text/html' }));

// Healthcheck endpoint
app.get('/', (req, res) => {
    res.status(200).send({ status: 'ok' });
});

const api = express.Router();

api.get('/hello', (req, res) => {
    res.status(200).send({ message: 'hello world' });
});

// api.get('/file', (req, res) => {
//     const readableObject = s3.getObject(downloadParams).createReadStream()
//     console.log(readableObject)
//     res.setHeader('Content-Disposition', `attachment; filename=1683612738591-StarRail 2023-05-02 09-03-09-894.mp4`);
//     readableObject.pipe(res)
// })

api.post('/upload', async (req, res) => {
    const file = req.files[0];
    const key = randomstring.generate(7) + '-' + file.originalname.replace(/\s/g, '_');

    const putParams = {
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    };


    try {


        s3.upload(putParams, async function (err, data) {
            if (err) {
                console.log(err)
            }
            if (data) {
                const saveFile = await db.put({ fileKey: data.Key }, randomstring.generate(5))
                console.log(data, "berhasil upload", saveFile)
                res.status(200).json({ ...data });
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error uploading file to S3' });
    }
})

api.get('/video', async (req, res, next) => {
    // const range = req.headers.range;
    // if (!range) {
    //     s3.headObject(downloadParams, (err, data) => {
    //         const headers = {
    //             'Content-Disposition': `attachment; filename=1683612738591-StarRail 2023-05-02 09-03-09-894.mp4`,
    //             "Content-Length": data.ContentLength,
    //             "Content-Type": "video/mp4",
    //         };
    //         res.writeHead(200, headers);
    //         s3.getObject(downloadParams).createReadStream().pipe(res);
    //         return
    //     })
    // } else {
//     const rangeHeader = req.headers.range;
//   if (rangeHeader) {
//     const parts = rangeHeader.replace(/bytes=/, "").split("-");
//     const start = parseInt(parts[0], 10);
//     const end = parts[1] ? parseInt(parts[1], 10) : downloadParams.ContentLength - 1;
//     downloadParams.Range = `bytes=${start}-${end}`;
//     res.status(206);
//   }
        
    // const rangeHeader = req.headers.range;
    // if (rangeHeader) {
    //   const parts = rangeHeader.replace(/bytes=/, "").split("-");
    //   const start = parseInt(parts[0], 10);
    //   const end = parts[1] ? parseInt(parts[1], 10) : downloadParams.ContentLength - 1;
    //   downloadParams.Range = `bytes=${start}-${end}`;
    //   res.status(206);
    // }
  
    // try {
    //   const s3HeadObject = await s3.headObject(downloadParams).promise();
    //   const headers = {
    //     'Content-Type': s3HeadObject.ContentType,
    //     'Content-Length': s3HeadObject.ContentLength,
    //     'Accept-Ranges': 'bytes'
    //   };
  
    //   if (rangeHeader) {
    //     headers['Content-Range'] = downloadParams.Range;
    //   }
  
    //   res.writeHead(200, headers);
    const range = req.headers.range;

    if (!range) {
        return s3.headObject(downloadParams, (err, data) => {
                    const headers = {
                        'Content-Disposition': `attachment; filename=1683612738591-StarRail 2023-05-02 09-03-09-894.mp4`,
                        "Content-Length": data.ContentLength,
                        "Content-Type": "video/mp4",
                    };
                    res.writeHead(200, headers);
                    s3.getObject(downloadParams).createReadStream().pipe(res);
        })
    }
  
  
    s3.headObject(downloadParams, (err, data) => {
      if (err) {
        console.log(err);
        res.status(500).send('Error retrieving video metadata');
      }
      console.log(range)
      const videoSize = data.ContentLength;
      const start = Number(range.replace(/\D/g, ''));
      const end = videoSize - 1;
  
      const chunkSize = (end - start) + 1;
  
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${videoSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      };
  
      res.writeHead(206, headers);
  
      const s3Stream = s3.getObject({...downloadParams, Range: `bytes=${start}-${end}`}).createReadStream();
      s3Stream.on('error', (err) => {
        console.log(err);
        res.status(500).send('Error streaming video');
      }).pipe(res);
    });
    // } catch (err) {
    //   console.error(err);
    //   res.status(500).send('Error streaming video');
    // }

    // s3.headObject(downloadParams, function (err, data) {
    //     if (err) {
    //         console.error(err);
    //         return next(err);
    //     }
    //     if (req.headers.range) {
    //         const range = req.headers.range;
    //         const bytes = range.replace(/bytes=/, '').split('-');
    //         const start = parseInt(bytes[0], 10);
    //         const total = data.ContentLength;
    //         const end = bytes[1] ? parseInt(bytes[1], 10) : total - 1;
    //         const chunkSize = end - start + 1;
    //         res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + total);
    //         res.set('Accept-Ranges', 'bytes');
    //         res.set('Content-Length', chunkSize.toString());
    //         downloadParams['Range'] = range;
    //         console.log('video buffering - range, total, start, end ,params', range, total, start, end, downloadParams);
    //     } else {
    //         res.set('Content-Length', data.ContentLength.toString());
    //         console.log('video buffering - ,params', downloadParams);
    //     }
    //     res.status(206);
    //     res.set('Content-Type', data.ContentType);
    //     res.set('Last-Modified', data.LastModified.toString());
    //     res.set('ETag', data.ETag);
    //     const stream = s3.getObject(downloadParams).createReadStream();
    //     stream.on('error', function error(err) {
    //         return next(err);
    //     });
    //     stream.on('end', () => {
    //         console.log('Served by Amazon S3');
    //     });
    //     stream.pipe(res);
    // });

    // s3.headObject(downloadParams, (err, data) => {
    //     const videoSize = data.ContentLength
    //     const CHUNK_SIZE = 2500000;
    //     const start = Number(range.replace(/\D/g, ""));
    //     const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
    //     const contentLength = end - start + 1;
    //     const headers = {
    //         "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    //         "Accept-Ranges": "bytes",
    //         "Content-Length": contentLength,
    //         "Content-Type": "video/mp4",
    //     };
    //     res.writeHead(206, headers);
    //     s3.getObject({...downloadParams, Range: range}).createReadStream().pipe(res);
    // })
    // }
})

// Version the api
app.use('/api/v1', api);
