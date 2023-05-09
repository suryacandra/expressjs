import express from 'express';
import cors from 'cors';
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
    endpoint: "https://s3.wasabisys.com",
    credentials: {
        accessKeyId: 'QRQC2KZYQJ7I3E94PGC6',
        secretAccessKey: '834vUiedzRZYLnKj1YNknCymochwD3F8k1FvGn6E',

    },
});

const bucketName = 'ripepno';

const downloadParams = {
    Key: "1683612738591-StarRail 2023-05-02 09-03-09-894.mp4",
    Bucket: bucketName,
}

export const app = express();

app.use(cors({ origin: true }));

app.use(express.json());
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

api.get('/file', (req, res) => {
    const readableObject = s3.getObject(downloadParams).createReadStream()
    console.log(readableObject)
    res.setHeader('Content-Disposition', `attachment; filename=1683612738591-StarRail 2023-05-02 09-03-09-894.mp4`);
    readableObject.pipe(res)
})

api.get('/video', (req, res) => {
    const range = req.headers.range;
    if (!range) {
        s3.headObject(downloadParams, (err, data) => {
            const headers = {
                'Content-Disposition': `attachment; filename=1683612738591-StarRail 2023-05-02 09-03-09-894.mp4`,
                "Content-Length": data.ContentLength,
                "Content-Type": "video/mp4",
            };
            res.writeHead(200, headers);
            s3.getObject(downloadParams).createReadStream().pipe(res);
            return
        })
    } else {
        s3.headObject(downloadParams, (err, data) => {
            console.log(data)
            const videoSize = data.ContentLength
            const CHUNK_SIZE = 10 ** 6;
            const start = Number(range.replace(/\D/g, ""));
            const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
            const contentLength = end - start + 1;
            const headers = {
                "Content-Range": `bytes ${start}-${end}/${videoSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": contentLength,
                "Content-Type": "video/mp4",
            };
            res.writeHead(206, headers);
            s3.getObject({...downloadParams, Range: range}).createReadStream().pipe(res);
        })
    }
})

// Version the api
app.use('/api/v1', api);
