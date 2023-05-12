// @ts-nocheck

import express from "express";
import cors from "cors";
import AWS from "aws-sdk";
import multer from "multer";
import randomstring from "randomstring";
import { Deta } from "deta";
import stream from "stream";

const deta = Deta("c0ywx59m4fj_HUhSd7ciqAbBSVaYA1oxrZ9QzohPuXZ9");
const db = deta.Base("drive");

const s3 = new AWS.S3({
  endpoint: "https://s3.wasabisys.com",
  credentials: {
    accessKeyId: "QRQC2KZYQJ7I3E94PGC6",
    secretAccessKey: "834vUiedzRZYLnKj1YNknCymochwD3F8k1FvGn6E",
  },
});

const bucketName = "ripepno";

const downloadParams = {
  Key: "XXnByQW-480p_ElfWibu_01_bsite.mp4",
  Bucket: bucketName,
};

export const app = express();

app.use(cors({ origin: true }));

app.use(express.json());
// app.use(multer().any());
app.use(express.raw({ type: "application/vnd.custom-type" }));
app.use(express.text({ type: "text/html" }));

// Healthcheck endpoint
app.get("/", (req, res) => {
  res.status(200).send({ status: "ok" });
});

const api = express.Router();

api.get("/hello", (req, res) => {
  res.status(200).send({ message: "hello world" });
});

api.post("/upload", multer().array("files"), async (req, res) => {
  const files = req.files;
  const fileUrls = [];

  // For each uploaded file, upload it to S3 and push the S3 URL to an array
  for (let file of files) {
    const readStream = new stream.PassThrough();
    readStream.end(file.buffer);

    const params = {
      Bucket: bucketName,
      Key: Date.now().toString() + "-" + file.originalname,
      Body: readStream,
      ContentType: file.mimetype,
      ACL: "public-read",
    };
    const uploadResult = await s3.upload(params).promise();
    const fileUrl = uploadResult.Location;
    fileUrls.push(fileUrl);
  }

  // Respond with the S3 URLs of the uploaded files
  res.json(fileUrls);
});

// api.post('/upload', async (req, res) => {
//     console.log(req.files)
//     res.json({message: "success"})
// const file = req.files[0];
// const key = randomstring.generate(7) + '-' + file.originalname.replace(/\s/g, '_');

// const putParams = {
//     Bucket: bucketName,
//     Key: key,
//     Body: file.buffer,
//     ContentType: file.mimetype,
// };

// try {

//     s3.upload(putParams, async function (err, data) {
//         if (err) {
//             console.log(err)
//         }
//         if (data) {
//             const saveFile = await db.put({ fileKey: data.Key }, randomstring.generate(5))
//             console.log(data, "berhasil upload", saveFile)
//             res.status(200).json({ ...data });
//         }
//     });

// } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Error uploading file to S3' });
// }
// })

api.get("/video", async (req, res, next) => {
  const range = req.headers.range;

  if (!range) {
    return s3.headObject(downloadParams, (err, data) => {
      const headers = {
        "Content-Disposition":
          `attachment; filename=1683612738591-StarRail 2023-05-02 09-03-09-894.mp4`,
        "Content-Length": data.ContentLength,
        "Content-Type": "video/mp4",
      };
      res.writeHead(200, headers);
      s3.getObject(downloadParams).createReadStream().pipe(res);
    });
  }

  s3.headObject(downloadParams, (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error retrieving video metadata");
    }
    console.log(range);
    const videoSize = data.ContentLength;
    const start = Number(range.replace(/\D/g, ""));
    const end = videoSize - 1;

    const chunkSize = (end - start) + 1;

    const headers = {
      "Content-Range": `bytes ${start}-${end}/${videoSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    };

    res.writeHead(206, headers);

    const s3Stream = s3.getObject({
      ...downloadParams,
      Range: `bytes=${start}-${end}`,
    }).createReadStream();
    s3Stream.on("error", (err) => {
      console.log(err);
      res.status(500).send("Error streaming video");
    }).pipe(res);
  });
});

// Version the api
app.use("/api/v1", api);
