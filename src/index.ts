import "dotenv/config";

import express, {type Request, type Response} from "express";
import multer from "multer";
import path from "node:path";
import {fileURLToPath} from "node:url";
import { readFile } from "node:fs/promises";

import {
    RekognitionClient,
    DetectLabelsCommand
} from "@aws-sdk/client-rekognition";

import {
    TextractClient,
    DetectDocumentTextCommand,
} from "@aws-sdk/client-textract";

// Rutas del proyecto para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Iniciar Express
const app = express();
const port = Number(process.env.PORT ?? 3000);

//
const credenciales = {
    region: process.env.AWS_REGION ?? "us-east-1",
    endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test"
    }
}


// Cliente de AWS Rekognition
const rekognitionClient = new RekognitionClient(credenciales);

const textractClient = new TextractClient(credenciales);

// Configuración de Multer: guardar el archivo en memoria
const upload = multer({
    storage: multer.memoryStorage()
});

// Middlewares
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());

// Analizar imagen
app.post(
    "/api/analizar",
    upload.single("imagen"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.file) {
                res.status(400).json({
                    error: "No se ha proporcionado ninguna imagen"
                });
                return;
            }

            const imageBuffer = req.file.buffer;

            const command = new DetectLabelsCommand({
                Image: {
                    Bytes: imageBuffer
                },
                MaxLabels: 10,
                MinConfidence: 75
            });

            const response = await rekognitionClient.send(command);

            res.json({
                success: true,
                labels: response.Labels ?? []
            });
        } catch (error: unknown) {
            console.error("Error al analizar la imagen:", error);

            const details =
                error instanceof Error
                    ? error.message
                    : "Error desconocido";

            const code =
                error instanceof Error
                    ? error.name
                    : "UNKNOWN_ERROR";

            res.status(500).json({
                error: "Error al analizar la imagen",
                details,
                code
            });
        }
    }
);

interface FRes{
    succes:boolean,
    value: {}|string
}

app.post("/api/ocr",upload.single("file"),
    async (req:Request,res:Response):Promise<void>  =>{
        try {
            if (!req.file) {
                return;
            }
            const documentBuffer = req.file.buffer;

            const respuesta = await textractClient.send(
                new DetectDocumentTextCommand({
                    Document: {
                        Bytes: documentBuffer,
                    },
                }),
            );

            const rs = respuesta.Blocks
                ?.filter((block) => block.BlockType === "LINE")
                .map((block) => block.Text ?? "")
                .join("\n") ?? "";
            console.log(rs)

            res.json({
                succes:true,
                value: rs
            })

        } catch (error: unknown) {
            console.error("Error al analizar la imagen:", error);

            const details =
                error instanceof Error
                    ? error.message
                    : "Error desconocido";

            const code =
                error instanceof Error
                    ? error.name
                    : "UNKNOWN_ERROR";

            res.status(500).json({
                error: "Error al analizar la imagen",
                details,
                code
            });
        }
    })

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor iniciado en http://localhost:${port}`);
});