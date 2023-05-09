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
    Bucket: bucketName
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
    res.setHeader('Content-Disposition', `attachment; filename=1683612738591-StarRail 2023-05-02 09-03-09-894.mp4`);
    readableObject.pipe(res)
})

// Version the api
app.use('/api/v1', api);
